// vite-plugin.ts
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
var VIRTUAL_PREFIX = "virtual:moonbit:";
var STUB_MODULE = `export default { __moonbit: true, mount: () => {}, render: () => '', hydrate: () => {} }`;
function findWorkspaceRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "moon.mod.json"))) return dir;
    dir = path.dirname(dir);
  }
  return startDir;
}
function computeBuiltJsPath(mbtFsPath, workspaceRoot) {
  const pkgDir = path.dirname(mbtFsPath);
  const pkgName = path.basename(pkgDir);
  const relDir = path.relative(workspaceRoot, pkgDir);
  return path.join(workspaceRoot, "_build", "js", "debug", "build", relDir, `${pkgName}.js`);
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
  const builtJs = computeBuiltJsPath(mbtFsPath, workspaceRoot);
  if (!fs.existsSync(builtJs)) {
    console.warn(`[astrobit] Build output not found for ${mbtFsPath}. Run moon build first.`);
    return STUB_MODULE;
  }
  return [
    `import * as moonbit from ${JSON.stringify(builtJs)}`,
    `export default {`,
    `  __moonbit: true,`,
    `  ...(moonbit.mount   ? { mount:   (el, props) => moonbit.mount(el, props) }   : {}),`,
    `  ...(moonbit.render  ? { render:  (props) => moonbit.render(props) }           : {}),`,
    `  ...(moonbit.hydrate ? { hydrate: (el, props) => moonbit.hydrate(el, props) } : {}),`,
    `}`
  ].join("\n");
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
      },
      "astro:config:done": ({ injectTypes }) => {
        injectTypes({
          filename: "astrobit.d.ts",
          content: `declare module '*.mbt' {
  interface MoonBitComponent {
    (props: Record<string, unknown>): unknown
    __moonbit: true
    mount?: (element: Element, props: Record<string, unknown>) => void
    render?: (props: Record<string, unknown>) => string
    hydrate?: (element: Element, props: Record<string, unknown>) => void
  }
  const component: MoonBitComponent
  export default component
}`
        });
      }
    }
  };
}
export {
  astrobit as default
};
