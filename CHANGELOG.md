# @smashercosmo/configs

## 0.3.0

### Minor Changes

- Turn off the oxlint rules that only duplicate another check: a type-aware rule, a more precise rule of another plugin, or an error TypeScript reports anyway. Each of them says what covers it instead.
- TypeScript: `target` and `lib` are `es2025`, and `noImplicitReturns` is on. `ts/node` allows importing `.ts` files (`allowImportingTsExtensions`), and `ts/composite` emits declaration maps. `ts/base` no longer sets `esModuleInterop`, and `ts/dom` no longer adds `dom.iterable`, which `dom` includes.
