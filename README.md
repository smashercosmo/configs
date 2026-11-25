# @smashercosmo/configs

Shared tooling configs.

```sh
pnpm add -D @smashercosmo/configs
```

Every tool is an optional peer dependency: install only the tools you use.

Every config is commented in detail: each non-obvious option, and every rule that is modified or
turned off, comes with an explanation of why. Read the source before overriding something.

## TypeScript

| Config                               | Use for                                            |
| ------------------------------------ | -------------------------------------------------- |
| `@smashercosmo/configs/ts/base`      | Strictness and module-syntax rules, no environment |
| `@smashercosmo/configs/ts/dom`       | Browser code                                       |
| `@smashercosmo/configs/ts/node`      | Node.js code (needs `@types/node`)                 |
| `@smashercosmo/configs/ts/composite` | Add to a project used through project references   |

TypeScript is used only for type checking, so the configs set `noEmit` (`composite` is the
exception: it emits declarations). They also turn on `incremental`, which saves build info between
runs to speed up later checks. Each project has to set its own `tsBuildInfoFile`: a path in a shared
config is resolved relative to that config, so every project would write to the same file.

```json
{
  "extends": "@smashercosmo/configs/ts/node",
  "compilerOptions": {
    "tsBuildInfoFile": "node_modules/tsconfig.tsbuildinfo"
  }
}
```

```json
{
  "extends": [
    "@smashercosmo/configs/ts/dom",
    "@smashercosmo/configs/ts/composite"
  ]
}
```

## oxlint

```sh
pnpm add -D oxlint oxlint-tsgolint eslint-plugin-regexp
```

```ts
// oxlint.config.ts
import config from "@smashercosmo/configs/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
  // Options can't be set in a shared config, so every project has to set them itself.
  options: {
    reportUnusedDisableDirectives: "error",
    typeAware: true,
  },
  extends: [config],
});
```

Enables the `unicorn`, `eslint`, `import`, `node`, `typescript`, `vitest`, `promise`, `oxc` and
`jsdoc` plugins plus `eslint-plugin-regexp` as a JS plugin. `oxlint-tsgolint` powers the type-aware
rules.

Every rule is listed explicitly, grouped into enabled, modified and disabled regions per plugin.

### Duplicate rules

Rules that only duplicate another check are turned off, and each one says what covers it instead,
so the same problem is never reported twice:

- rules duplicated by a type-aware or more precise rule from another plugin, e.g.
  `unicorn/prefer-includes` (handled by `typescript/prefer-includes`) or `no-invalid-regexp`
  (handled by `regexp/no-invalid-regexp`);
- rules for problems TypeScript already reports as compile errors, e.g. `getter-return` (TS2378) or
  `no-dupe-keys` (TS1117), with the TypeScript error code for each.

### Overrides

- `*.tsx`: the `react`, `react-perf` and `jsx-a11y` plugins, including the React Compiler rules.
  The `react-perf` rules are off because React Compiler memoizes props automatically.
- `**/*.spec.{ts,tsx}`: the Vitest rules.
- `*.config.*` files: default exports are allowed.
- `*.d.ts` files: don't have to be modules.

## oxfmt

```sh
pnpm add -D oxfmt
```

```ts
// oxfmt.config.ts
import config from "@smashercosmo/configs/oxfmt";
import { defineConfig } from "oxfmt";

export default defineConfig({
  extends: [config],
});
```

80-column lines, double quotes, trailing commas, always-parenthesized arrow params, JSDoc formatting,
and grouped import sorting (types first, then external, internal, and relative imports). `package.json`
isn't sorted.

## Development

This repo uses its own configs: `tsconfig.json` extends `src/ts/tsconfig.node.json`.

### Checking rule coverage

```sh
pnpm lint:rules
```

Compares the oxlint configs with the rules oxlint and `eslint-plugin-regexp` provide. It reports
rules that no config mentions (usually new in a release) and configured rules that don't exist. Run
it after upgrading oxlint or a plugin. It's also part of `pnpm lint`.

### Upgrading Node

```sh
pnpm update:node 28
```

Sets `devEngines.runtime` in `package.json` to `^28.0.0`, `@types/node` in the `types` catalog to the
latest published `28.x.x` and in the `peers` catalog to `^28.0.0`, then runs `pnpm install`. Commit
the changed files.

### Releasing

Releases are made from change intents, with pnpm's own versioning, by the reusable workflows of
[smashercosmo/actions](https://github.com/smashercosmo/actions). Every pull request has to add an
intent, which CI checks:

```sh
pnpm change              # describe the change and its version bump
pnpm change --bump none  # for a change that doesn't need a release
```

On every push to `main`, the [release workflow](./.github/workflows/release.yml) opens or updates a
release PR, which applies the pending intents: it bumps the version and writes `CHANGELOG.md`.
Merging the release PR runs CI on the merge commit and stages the new version on npm. Approve it
with `pnpm stage approve` (it asks for 2FA): once it's on npm, the workflow publishes its GitHub
release, which creates the `v<version>` tag.

The release workflow needs:

- A GitHub App installed on the repository, with `contents` and `pull-requests` write permissions.
  It opens the release PRs, so that CI runs for them.
- A repository variable `RELEASE_BOT_CLIENT_ID` with the App's client ID. It has to be a repository
  (or organization) variable, not one of the environment.
- An environment named `release`, with a secret `RELEASE_BOT_PRIVATE_KEY`: the App's private key.
- A trusted publisher for `@smashercosmo/configs` on npm: GitHub Actions, this repository, the
  workflow `release.yml` and the environment `release`.
- A ruleset for `main` that requires the `ci / changeset` and `ci / check` status checks and
  branches to be up to date before merging. Otherwise a release PR could be merged without the
  intents added since it was opened.
