import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_PREFIX = 'virtual:moonbit:'

const STUB_MODULE = `export default { __moonbit: true, mount: () => {}, render: () => '', hydrate: () => {} }`

function findWorkspaceRoot(startDir: string): string {
  let dir = startDir
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'moon.mod.json'))) return dir
    dir = path.dirname(dir)
  }
  return startDir
}

// .mbt ファイルのビルド成果物パスを計算する
function computeBuiltJsPath(mbtFsPath: string, workspaceRoot: string): string {
  const pkgDir  = path.dirname(mbtFsPath)
  const pkgName = path.basename(pkgDir)
  const relDir  = path.relative(workspaceRoot, pkgDir)
  return path.join(workspaceRoot, '_build', 'js', 'debug', 'build', relDir, `${pkgName}.js`)
}

// URL スタイル (/src/...) または相対パスを絶対ファイルシステムパスに変換する
function toFsPath(id: string, importer: string | undefined, projectRoot: string): string {
  if (id.startsWith('.') && importer && !importer.startsWith('\0')) {
    return path.resolve(path.dirname(importer), id)
  }
  if (path.isAbsolute(id) && fs.existsSync(id)) return id
  const rel = id.startsWith('/') ? id.slice(1) : id
  return path.join(projectRoot, rel)
}

// .mbt ファイルのパスからグルーコードを生成して返す
function loadMbt(mbtFsPath: string, workspaceRoot: string): string {
  const builtJs = computeBuiltJsPath(mbtFsPath, workspaceRoot)
  if (!fs.existsSync(builtJs)) {
    console.warn(`[astrobit] Build output not found for ${mbtFsPath}. Run moon build first.`)
    return STUB_MODULE
  }
  return [
    `import * as moonbit from ${JSON.stringify(builtJs)}`,
    `export default {`,
    `  __moonbit: true,`,
    `  ...(moonbit.mount   ? { mount:   (el, props) => moonbit.mount(el, props) }   : {}),`,
    `  ...(moonbit.render  ? { render:  (props) => moonbit.render(props) }           : {}),`,
    `  ...(moonbit.hydrate ? { hydrate: (el, props) => moonbit.hydrate(el, props) } : {}),`,
    `}`,
  ].join('\n')
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
      if (id.startsWith(VIRTUAL_PREFIX)) return id
      if (!id.endsWith('.mbt')) return
      const fsPath = toFsPath(id, importer, projectRoot)
      return VIRTUAL_PREFIX + fsPath
    },

    load(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const mbtFsPath = id.slice(VIRTUAL_PREFIX.length)
        return loadMbt(mbtFsPath, workspaceRoot)
      }
      const cleanId = id.split('?')[0]
      if (cleanId.endsWith('.mbt')) {
        const mbtFsPath = toFsPath(cleanId, undefined, projectRoot)
        return loadMbt(mbtFsPath, workspaceRoot)
      }
    },

    transform(_code, id) {
      if (id.startsWith(VIRTUAL_PREFIX)) return
      const cleanId = id.split('?')[0]
      if (!cleanId.endsWith('.mbt')) return
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
