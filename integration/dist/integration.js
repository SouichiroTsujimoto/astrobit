// vite-plugin.ts
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
var VIRTUAL_PREFIX = "virtual:moonbit:";
var STUB_MODULE = `export default { __moonbit: true, mount: () => {}, render: () => '<div></div>', hydrate: () => {} }`;
function findWorkspaceRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "moon.mod.json"))) return dir;
    dir = path.dirname(dir);
  }
  return startDir;
}
function parseDts(dtsPath) {
  if (!fs.existsSync(dtsPath)) return [];
  const content = fs.readFileSync(dtsPath, "utf-8");
  const fns = [];
  const re = /export function (\w+)\(([^)]*)\)/g;
  for (let m = re.exec(content); m !== null; m = re.exec(content)) {
    const params = m[2].split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const i = s.indexOf(":");
      return { name: s.slice(0, i).trim(), type: s.slice(i + 1).trim() };
    });
    fns.push({ name: m[1], params });
  }
  return fns;
}
function defaultValue(type) {
  if (/Int|number/.test(type)) return "0";
  if (/Bool|boolean/.test(type)) return "false";
  return '""';
}
function generateModule(builtJsPath, fns) {
  const mount = fns.find((f) => f.name === "mount");
  const render = fns.find((f) => f.name === "render");
  const hydrate = fns.find((f) => f.name === "hydrate");
  const toArgs = (params, skipFirst) => {
    const ps = skipFirst ? params.slice(1) : params;
    return ps.map((p) => `props.${p.name} ?? ${defaultValue(p.type)}`).join(", ");
  };
  return [
    `import * as moonbit from ${JSON.stringify(builtJsPath)}`,
    `export default {`,
    `  __moonbit: true,`,
    mount ? `  mount:   (element, props) => moonbit.mount(element, ${toArgs(mount.params, true)}),` : "",
    render ? `  render:  (props) => moonbit.render(${toArgs(render.params, false)}),` : "",
    hydrate ? `  hydrate: (element, props) => moonbit.hydrate(element, ${toArgs(hydrate.params, true)}),` : "",
    `}`
  ].filter(Boolean).join("\n");
}
function computePaths(mbtFsPath, workspaceRoot) {
  const pkgDir = path.dirname(mbtFsPath);
  const pkgName = path.basename(pkgDir);
  const relDir = path.relative(workspaceRoot, pkgDir);
  const builtDir = path.join(workspaceRoot, "_build", "js", "debug", "build", relDir);
  return {
    builtJs: path.join(builtDir, `${pkgName}.js`),
    builtDts: path.join(builtDir, `${pkgName}.d.ts`)
  };
}
function toFsPath(id, importer, projectRoot) {
  if (id.startsWith(".") && importer && !importer.startsWith("\0")) {
    return path.resolve(path.dirname(importer), id);
  }
  if (path.isAbsolute(id) && fs.existsSync(id)) return id;
  const rel = id.startsWith("/") ? id.slice(1) : id;
  return path.join(projectRoot, rel);
}
function loadMbt(mbtFsPath, workspaceRoot) {
  const { builtJs, builtDts } = computePaths(mbtFsPath, workspaceRoot);
  const fns = parseDts(builtDts);
  if (fns.length === 0) {
    console.warn(`[astrobit] No exports found for ${mbtFsPath}. Run moon build first.`);
    return STUB_MODULE;
  }
  return generateModule(builtJs, fns);
}
function moonBuild(cwd) {
  return new Promise((resolve2) => {
    const proc = spawn("moon", ["build"], { cwd, stdio: "inherit" });
    proc.on("close", () => resolve2());
  });
}
function moonbitVitePlugin() {
  let workspaceRoot = "";
  let projectRoot = "";
  return {
    name: "vite-plugin-moonbit",
    enforce: "pre",
    configResolved(config) {
      projectRoot = config.root;
      workspaceRoot = findWorkspaceRoot(config.root);
    },
    resolveId(id, importer) {
      if (id.startsWith(VIRTUAL_PREFIX)) return id;
      if (!id.endsWith(".mbt")) return;
      const fsPath = toFsPath(id, importer, projectRoot);
      return VIRTUAL_PREFIX + fsPath;
    },
    load(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const mbtFsPath = id.slice(VIRTUAL_PREFIX.length);
        return loadMbt(mbtFsPath, workspaceRoot);
      }
      const cleanId = id.split("?")[0];
      if (cleanId.endsWith(".mbt")) {
        const mbtFsPath = toFsPath(cleanId, void 0, projectRoot);
        return loadMbt(mbtFsPath, workspaceRoot);
      }
    },
    transform(_code, id) {
      if (id.startsWith(VIRTUAL_PREFIX)) return;
      const cleanId = id.split("?")[0];
      if (!cleanId.endsWith(".mbt")) return;
      console.log("[moonbit] transform (fallback):", id);
      const mbtFsPath = toFsPath(cleanId, void 0, projectRoot);
      return { code: loadMbt(mbtFsPath, workspaceRoot), map: null };
    },
    async handleHotUpdate({ file, server }) {
      if (!file.endsWith(".mbt")) return;
      await moonBuild(workspaceRoot);
      for (const [, mod] of server.moduleGraph.idToModuleMap) {
        if (mod.id?.startsWith(VIRTUAL_PREFIX)) {
          server.moduleGraph.invalidateModule(mod);
        }
      }
      server.ws.send({ type: "full-reload" });
      return [];
    }
  };
}

// integration.ts
function astrobit() {
  return {
    name: "astrobit",
    hooks: {
      "astro:config:setup": ({ addRenderer, updateConfig }) => {
        addRenderer({
          name: "astrobit",
          clientEntrypoint: new URL("./client.js", import.meta.url).href,
          serverEntrypoint: new URL("./server.js", import.meta.url).href
        });
        updateConfig({ vite: { plugins: [moonbitVitePlugin()] } });
      }
    }
  };
}
export {
  astrobit as default
};
