import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_PREFIX = 'virtual:moonbit:'

const STUB_MODULE = `export default { __moonbit: true, mount: () => {}, render: () => '<div></div>', hydrate: () => {} }`

function findWorkspaceRoot(startDir: string): string {
  let dir = startDir
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'moon.mod.json'))) return dir
    dir = path.dirname(dir)
  }
  return startDir
}

interface FnDef {
  name: string
  params: { name: string; type: string }[]
}

function parseDts(dtsPath: string): FnDef[] {
  if (!fs.existsSync(dtsPath)) return []
  const content = fs.readFileSync(dtsPath, 'utf-8')
  const fns: FnDef[] = []
  const re = /export function (\w+)\(([^)]*)\)/g
  for (let m = re.exec(content); m !== null; m = re.exec(content)) {
    const params = m[2]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const i = s.indexOf(':')
        return { name: s.slice(0, i).trim(), type: s.slice(i + 1).trim() }
      })
    fns.push({ name: m[1], params })
  }
  return fns
}

function defaultValue(type: string): string {
  if (/Int|number/.test(type)) return '0'
  if (/Bool|boolean/.test(type)) return 'false'
  return '""'
}

function generateModule(builtJsPath: string, fns: FnDef[]): string {
  const mount   = fns.find(f => f.name === 'mount')
  const render  = fns.find(f => f.name === 'render')
  const hydrate = fns.find(f => f.name === 'hydrate')

  const toArgs = (params: FnDef['params'], skipFirst: boolean) => {
    const ps = skipFirst ? params.slice(1) : params
    return ps.map(p => `props.${p.name} ?? ${defaultValue(p.type)}`).join(', ')
  }

  return [
    `import * as moonbit from ${JSON.stringify(builtJsPath)}`,
    `export default {`,
    `  __moonbit: true,`,
    mount   ? `  mount:   (element, props) => moonbit.mount(element, ${toArgs(mount.params, true)}),`   : '',
    render  ? `  render:  (props) => moonbit.render(${toArgs(render.params, false)}),`                  : '',
    hydrate ? `  hydrate: (element, props) => moonbit.hydrate(element, ${toArgs(hydrate.params, true)}),` : '',
    `}`,
  ].filter(Boolean).join('\n')
}

// .mbt ファイルのビルド成果物パスを計算する
function computePaths(mbtFsPath: string, workspaceRoot: string) {
  const pkgDir  = path.dirname(mbtFsPath)
  const pkgName = path.basename(pkgDir)
  const relDir  = path.relative(workspaceRoot, pkgDir)
  const builtDir = path.join(workspaceRoot, '_build', 'js', 'debug', 'build', relDir)
  return {
    builtJs:  path.join(builtDir, `${pkgName}.js`),
    builtDts: path.join(builtDir, `${pkgName}.d.ts`),
  }
}

// URL スタイル (/src/...) または相対パスを絶対ファイルシステムパスに変換する
function toFsPath(id: string, importer: string | undefined, projectRoot: string): string {
  // 相対パス: importer から解決
  if (id.startsWith('.') && importer && !importer.startsWith('\0')) {
    return path.resolve(path.dirname(importer), id)
  }
  // 実際の絶対パスがすでに存在する
  if (path.isAbsolute(id) && fs.existsSync(id)) return id
  // URL スタイル (/src/...) → projectRoot を基準に解決
  const rel = id.startsWith('/') ? id.slice(1) : id
  return path.join(projectRoot, rel)
}

// .mbt ファイルのパスからグルーコードを生成して返す
function loadMbt(mbtFsPath: string, workspaceRoot: string): string {
  const { builtJs, builtDts } = computePaths(mbtFsPath, workspaceRoot)
  const fns = parseDts(builtDts)
  if (fns.length === 0) {
    console.warn(`[astrobit] No exports found for ${mbtFsPath}. Run moon build first.`)
    return STUB_MODULE
  }
  return generateModule(builtJs, fns)
}

function moonBuild(cwd: string): Promise<void> {
  return new Promise((resolve) => {
    const proc = spawn('moon', ['build'], { cwd, stdio: 'inherit' })
    proc.on('close', () => resolve())
  })
}

export function moonbitVitePlugin(): Plugin {
  let workspaceRoot = ''
  let projectRoot = ''

  return {
    name: 'vite-plugin-moonbit',
    enforce: 'pre',

    configResolved(config) {
      projectRoot = config.root
      workspaceRoot = findWorkspaceRoot(config.root)
    },

    resolveId(id, importer) {
      // 既に仮想モジュール ID の場合はそのまま返す（二重ラップを防ぐ）
      if (id.startsWith(VIRTUAL_PREFIX)) return id
      if (!id.endsWith('.mbt')) return
      const fsPath = toFsPath(id, importer, projectRoot)
      return VIRTUAL_PREFIX + fsPath
    },

    load(id) {
      // 仮想モジュール ID (\0moonbit:...) から処理
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const mbtFsPath = id.slice(VIRTUAL_PREFIX.length)
        return loadMbt(mbtFsPath, workspaceRoot)
      }
      // resolveId を経由せずに直接 .mbt ファイルがロードされた場合のフォールバック
      const cleanId = id.split('?')[0]
      if (cleanId.endsWith('.mbt')) {
        const mbtFsPath = toFsPath(cleanId, undefined, projectRoot)
        return loadMbt(mbtFsPath, workspaceRoot)
      }
    },

    transform(_code, id) {
      // 仮想モジュールは load フックで処理済み
      if (id.startsWith(VIRTUAL_PREFIX)) return
      // .mbt ファイルのコンテンツが直接渡された場合の最終フォールバック
      // (resolveId/load が呼ばれなかった場合でも transform は呼ばれる)
      const cleanId = id.split('?')[0]
      if (!cleanId.endsWith('.mbt')) return
      console.log('[moonbit] transform (fallback):', id)
      const mbtFsPath = toFsPath(cleanId, undefined, projectRoot)
      return { code: loadMbt(mbtFsPath, workspaceRoot), map: null }
    },

    async handleHotUpdate({ file, server }) {
      if (!file.endsWith('.mbt')) return
      await moonBuild(workspaceRoot)
      for (const [, mod] of server.moduleGraph.idToModuleMap) {
        if (mod.id?.startsWith(VIRTUAL_PREFIX)) {
          server.moduleGraph.invalidateModule(mod)
        }
      }
      server.ws.send({ type: 'full-reload' })
      return []
    },
  }
}
