#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const MOON_VERSION_CMD = "moon version";
const MOON_INSTALL_CMD = "curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash";
const MOON_BIN_PATH = `${process.env.HOME}/.moon/bin`;

const [, , command] = process.argv;

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, { shell: true, stdio: "inherit", ...opts });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function moonVersion() {
  const result = spawnSync(MOON_VERSION_CMD, { shell: true, stdio: "pipe" });
  if (result.status !== 0) return null;
  return result.stdout.toString().trim();
}

function installMoon() {
  if (platform() === "win32") {
    console.error(
      "[astrobit] moon is not installed. Please install it manually: https://www.moonbitlang.com/download"
    );
    process.exit(1);
  }
  console.log("[astrobit] moon not found, installing...");
  run(MOON_INSTALL_CMD);
  process.env.PATH = `${MOON_BIN_PATH}:${process.env.PATH}`;
}

if (command === "build") {
  let version = moonVersion();
  if (version === null) {
    installMoon();
    version = moonVersion();
    if (version) console.log(`[astrobit] moon installed: ${version}`);
  } else {
    console.log(`[astrobit] moon already available: ${version}`);
  }

  console.log("[astrobit] running moon build...");
  run("moon build");

  console.log("[astrobit] running astro build...");
  run("astro build");
} else {
  console.error(
    `[astrobit] Unknown command: ${command ?? "(none)"}\n\nUsage:\n  astrobit build`
  );
  process.exit(1);
}
