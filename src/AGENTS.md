# Native Addon (`libgg`)

JAGMAN includes a Rust NAPI-RS crate that embeds the GG project as a native Node.js addon. This gives server-side TypeScript direct access to GG's Jujutsu integration — config loading, workspace queries, mutations, and the worker session — without spawning subprocesses or making HTTP calls.

## Project Layout

Rust source lives in `src/`, TypeScript source in `app/`:

- `Cargo.toml` — defines the `libgg` crate (`cdylib`) with a path dependency on `gg-cli` (`../gg`)
- `build.rs` — calls `napi_build::setup()`
- `src/lib.rs` — `#[napi]` functions that wrap GG's Rust APIs for Node.js
- `app/lib/server/gg.ts` — TypeScript re-export of the generated bindings (server-only)
- `native/` — local wrapper package (`"libgg": "file:native"` in dependencies) that re-exports from `../index.js`. Exists so that both Vite and adapter-node externalise the native module import — see **Bundler Externalisation** below.

## GG Dependency

The `gg-cli` crate (source at `../gg`) is currently referenced by path with default features, which include Tauri. GG's `tauri::generate_context!()` macro embeds pre-built frontend assets at compile time. When using the path dependency, these assets must exist in `../gg/dist/` — if missing, run `npm run build` in the GG directory. Once `gg-cli` is consumed from crates.io instead, the published crate includes the assets and no local build step is needed. GG's source may need to be consulted when extending the NAPI bridge or debugging build issues.

## Build Process

`napi build --platform --esm` compiles Rust and generates three files at the project root:

- `libgg.<platform>.node` — the compiled native addon
- `index.js` — ESM loader that picks the right `.node` file for the current platform
- `index.d.ts` — auto-generated TypeScript type definitions from `#[napi]` annotations

The native build must run before Vite (`npm run build` handles this ordering). The generated files are in `.gitignore` — they are build artifacts, not source.

## Server-Side Only

The native module can only be imported in server-side code (`app/lib/server/`), never in client-side components.

## Bundler Externalisation

The NAPI-RS generated `index.js` loader uses `createRequire(import.meta.url)` to find the `.node` file relative to itself. If any bundler inlines this code into a chunk in a different directory, the relative `require('./libgg.<platform>.node')` breaks. Both Vite (SSR build) and adapter-node (production build) must keep the import external so the loader runs from the package root where the `.node` file lives.

This is achieved via the `native/` wrapper package:

1. `native/` is a local package (`"libgg": "file:native"` in `dependencies`) that re-exports `../index.js`
2. `app/lib/server/gg.ts` imports from `'libgg'` (a bare specifier matching the dependency)
3. A Vite plugin (`externalize-libgg` in `vite.config.ts`) marks `'libgg'` as external during the SSR build, preventing Vite from inlining it
4. adapter-node automatically externalises all `dependencies`, so `'libgg'` stays external in the production output too
5. At runtime, Node.js resolves `'libgg'` → `native/index.js` → `../index.js` (the NAPI-RS loader at the package root), where `import.meta.url` is correct

When NAPI-RS multi-architecture support is added (platform-specific optional dependency packages like `@gulbanana/jagman-win32-x64-msvc`), the loader's fallback `require('@gulbanana/jagman-<triple>')` will also work from any directory since CJS require walks ancestor `node_modules/` directories. The `native/` wrapper remains compatible with that approach.
