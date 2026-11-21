// oxlint-disable node/no-sync,node/no-top-level-await - perfectly fine for dev-only script
/**
 * Compares the shared oxlint configs with the rules that oxlint and their JS
 * plugins provide: `pnpm lint:rules`.
 *
 * - Unconfigured: a rule from an enabled plugin that the config doesn't mention,
 *   usually one added in a new oxlint or plugin release. Enable it, or turn it
 *   off with a comment explaining why.
 * - Unknown: a configured rule that no plugin provides. It's a typo, a rule that
 *   was removed or renamed, or a rule written without its plugin prefix.
 */
import type { OxlintConfig } from "oxlint";

import child_process from "node:child_process";
import process from "node:process";
import url from "node:url";

import baseConfig from "#src/oxlint/oxlint.config.mjs";

type OxlintRule = Readonly<{ scope: string; value: string }>;

type JsPluginEntry = NonNullable<OxlintConfig["jsPlugins"]>[number];

type JsPluginModule = Readonly<{
  rules: Readonly<Record<string, { meta?: { deprecated?: unknown } }>>;
}>;

type CheckResult = Readonly<{
  name: string;
  unconfigured: readonly string[];
  unknown: readonly string[];
}>;

/** Every config exported from `package.json` (`./oxlint*`) must be listed here. */
const configs: Readonly<Record<string, OxlintConfig>> = {
  base: baseConfig,
};

/**
 * All built-in oxlint rules, written as they're used in configs.
 *
 * @returns Each rule with its plugin, e.g. `{ plugin: "jsx-a11y", rule:
 *   "jsx-a11y/alt-text" }`. ESLint core rules have no prefix.
 */
function getOxlintRules() {
  const oxlintBin = url.fileURLToPath(
    new URL("bin/oxlint", import.meta.resolve("oxlint/package.json")),
  );
  const output = child_process.execFileSync(
    process.execPath,
    [oxlintBin, "--rules", "--format", "json"],
    { encoding: "utf8" },
  );
  const rules: readonly OxlintRule[] = JSON.parse(output);

  return rules.map(({ scope, value }) => {
    const plugin = scope.replaceAll("_", "-");

    return { plugin, rule: plugin === "eslint" ? value : `${plugin}/${value}` };
  });
}

/**
 * Rules of a JS plugin, prefixed with the name it's registered under.
 *
 * @param entry - A `jsPlugins` entry from a config.
 * @returns Each rule, and whether it's deprecated.
 */
async function getJsPluginRules(entry: JsPluginEntry) {
  /**
   * For a string entry, oxlint works out the name itself (from `meta.name`,
   * scoped package names and several prefixes). Copying that logic here could
   * silently drift, so configs have to name their plugins explicitly.
   */
  if (typeof entry === "string") {
    throw new TypeError(
      `check-rules: use { name, specifier } for the "${entry}" JS plugin`,
    );
  }

  const { name, specifier } = entry;
  const exported: JsPluginModule | { default: JsPluginModule } = await import(
    specifier
  );
  const plugin = "default" in exported ? exported.default : exported;

  return Object.entries(plugin.rules).map(([rule, { meta }]) => ({
    deprecated: meta?.deprecated !== undefined,
    rule: `${name}/${rule}`,
  }));
}

/**
 * Finds rules a config doesn't mention, and mentioned rules that don't exist.
 *
 * @param name - Name of the config, used in the report.
 * @param config - The config to check, including its overrides.
 * @param oxlintRules - All built-in oxlint rules.
 * @returns Unconfigured and unknown rules.
 */
async function checkConfig(
  name: string,
  config: OxlintConfig,
  oxlintRules: ReturnType<typeof getOxlintRules>,
): Promise<CheckResult> {
  const sections = [config, ...(config.overrides ?? [])];
  const plugins = new Set<string>(
    sections.flatMap((section) => section.plugins ?? []),
  );
  const jsPlugins = await Promise.all(
    sections
      .flatMap((section) => section.jsPlugins ?? [])
      .map(async (entry) => getJsPluginRules(entry)),
  );
  const jsPluginRules = jsPlugins.flat();
  const configured = new Set(
    sections.flatMap((section) => Object.keys(section.rules ?? {})),
  );
  const known = new Set(
    [...oxlintRules, ...jsPluginRules].map(({ rule }) => rule),
  );
  const expected = [
    ...oxlintRules.filter(({ plugin }) => plugins.has(plugin)),
    ...jsPluginRules.filter(({ deprecated }) => !deprecated),
  ].map(({ rule }) => rule);

  return {
    name,
    unconfigured: expected.filter((rule) => !configured.has(rule)),
    unknown: [...configured].filter((rule) => !known.has(rule)),
  };
}

/**
 * Prints the results and decides whether the check fails. Unconfigured rules
 * fail it too, so every rule added in an oxlint or plugin release gets an
 * explicit decision.
 *
 * @param results - One result per checked config.
 * @returns Process exit code: 1 if any config has a problem.
 */
function report(results: readonly CheckResult[]) {
  const problems = results.flatMap(({ name, unconfigured, unknown }) => [
    ...unconfigured.toSorted().map((rule) => `${name}: unconfigured ${rule}`),
    ...unknown.toSorted().map((rule) => `${name}: unknown ${rule}`),
  ]);

  if (problems.length === 0) {
    process.stdout.write("check-rules: all rules are configured.\n");

    return 0;
  }

  process.stderr.write(`check-rules:\n${problems.join("\n")}\n`);

  return 1;
}

const oxlintRules = getOxlintRules();
const results = await Promise.all(
  Object.entries(configs).map(async ([name, config]) =>
    checkConfig(name, config, oxlintRules),
  ),
);

process.exitCode = report(results);
