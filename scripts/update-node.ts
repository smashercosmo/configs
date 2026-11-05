// oxlint-disable node/no-sync - perfectly fine for dev-only script
/**
 * Upgrades Node: `pnpm update:node <major>`, e.g. `pnpm update:node 28`.
 *
 * - package.json: `devEngines.runtime.version` → `^<major>.0.0`
 * - pnpm-workspace.yaml:
 *   - `catalogs.types["@types/node"]` → latest published `<major>.x.x`
 *   - `catalogs.peers["@types/node"]` → `^<major>.0.0`
 *
 * Then runs `pnpm install` to update the lockfile.
 */
import process from "node:process";
import child_process from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import packageJson from "#package.json" with { type: "json" };

const root = path.resolve(import.meta.dirname, "..");

function getLatestVersion(spec: string) {
  return child_process
    .execFileSync("pnpm", ["view", spec, "version"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    .trim();
}

function pnpm(args: string[]): string {
  return child_process.execFileSync("pnpm", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

const major = process.argv.at(2);

if (major === undefined) {
  throw new Error("update:node: version number is missing\n");
}

if (!/^\d+$/v.test(major)) {
  throw new Error("update:node: version should be a number\n");
}

const range = `^${major}.0.0`;
const typesLatestVersion = getLatestVersion(`@types/node@${major}`);

if (typesLatestVersion === "") {
  throw new Error("update:node: types version is missing\n");
}

const catalogs = JSON.parse(pnpm(["config", "get", "catalogs", "--json"])) ?? {};
catalogs.types = { ...catalogs.types, "@types/node": typesLatestVersion };
catalogs.peers = { ...catalogs.peers, "@types/node": range };
pnpm(["config", "set", "--location=project", "--json", "catalogs", JSON.stringify(catalogs)]);

/**
 * Package.json is written directly because pnpm can't set this field to `^<major>.0.0`:
 *  - `pnpm pkg set devEngines.runtime.version="^<major>.0.0"` exits with exit code `0`
 *     but silently leaves the field unchanged.
 *  - `pnpm runtime set node <spec>` saves what `pnpm add` would: a range resolves to the newest
 *     release (`26` → `26.13.0`, or `^26.13.0` when save-exact is off).
 */
packageJson.devEngines.runtime.version = range;

fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);

process.stdout.write(
  `update:node: Node ${range}, @types/node ${typesLatestVersion} (peer ${range}). Running pnpm install…\n`,
);

child_process.execFileSync("pnpm", ["install"], { cwd: root, stdio: "inherit" });
