// Wrapper that re-exports the NAPI-RS generated bindings from the package root.
// This exists so that adapter-node externalises the import (it externalises
// everything listed in dependencies), keeping the NAPI-RS loader's
// import.meta.url pointing at the package root where the .node file lives.
export * from '../index.js';
