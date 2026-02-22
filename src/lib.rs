#[macro_use]
extern crate napi_derive;

use std::path::PathBuf;

/// Info returned from RunOptions construction — proves the NAPI bridge
/// and GG library integration both work.
#[napi(object)]
pub struct WorkspaceInfo {
    pub path: String,
    pub settings_loaded: bool,
}

/// Construct GG's RunOptions for a workspace path and return basic info.
/// This exercises read_config() and the Tauri context generation.
#[napi]
pub fn create_run_options(path: String) -> napi::Result<WorkspaceInfo> {
    let options = gg_cli::RunOptions::new(PathBuf::from(&path));
    Ok(WorkspaceInfo {
        path: options
            .workspace
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default(),
        settings_loaded: true,
    })
}
