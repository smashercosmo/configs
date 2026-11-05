# @smashercosmo/configs

Shared tooling configs.

```sh
pnpm add -D @smashercosmo/configs
```

Every tool is an optional peer dependency: install only the tools you use.

## TypeScript

| Config                               | Use for                                            |
| ------------------------------------ | -------------------------------------------------- |
| `@smashercosmo/configs/ts/base`      | Strictness and module-syntax rules, no environment |
| `@smashercosmo/configs/ts/dom`       | Browser code                                       |
| `@smashercosmo/configs/ts/node`      | Node.js code (needs `@types/node`)                 |
| `@smashercosmo/configs/ts/composite` | Add to a project used through project references   |

```json
{
  "extends": "@smashercosmo/configs/ts/node"
}
```

```json
{
  "extends": ["@smashercosmo/configs/ts/dom", "@smashercosmo/configs/ts/composite"]
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
  // Can't be set in a shared config, so every project has to enable it itself.
  options: { typeAware: true },
  extends: [config],
});
```

Enables the `unicorn`, `eslint`, `import`, `node`, `typescript`, `vitest`, `promise` and `oxc`
plugins plus `eslint-plugin-regexp` as a JS plugin. `oxlint-tsgolint` powers the type-aware rules.

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

### Upgrading Node

```sh
pnpm update:node 28
```

Sets `devEngines.runtime` in `package.json` to `^28.0.0`, `@types/node` in the `types` catalog to the
latest published `28.x.x` and in the `peers` catalog to `^28.0.0`, then runs `pnpm install`. Commit
the changed files.
