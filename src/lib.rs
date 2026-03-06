#[macro_use]
extern crate napi_derive;

use std::collections::HashMap;
use std::fs;
use std::future::Future;
use std::path::PathBuf;
use std::sync::{Arc, LazyLock, Mutex};

use gg_lib::worker::{EventSink, WorkerSession};
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

/// Run an async closure on a dedicated thread with a single-threaded tokio
/// runtime.  This allows futures that are `!Send` (e.g. those holding
/// `WorkerSession` or its repo handles) to be awaited without conflicting with
/// NAPI-RS's multi-threaded runtime requirement.
async fn run_local<F, Fut, T>(f: F) -> napi::Result<T>
where
    F: FnOnce() -> Fut + Send + 'static,
    Fut: Future<Output = napi::Result<T>>,
    T: Send + 'static,
{
    tokio::task::spawn_blocking(move || {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .map_err(|e| napi::Error::from_reason(e.to_string()))?
            .block_on(f())
    })
    .await
    .map_err(|e| napi::Error::from_reason(e.to_string()))?
}

struct NoEventSink;
impl EventSink for NoEventSink {
    fn send(&self, _kind: &str, _data: serde_json::Value) {
        // No-op
    }
}

// ---------------------------------------------------------------------------
// Process inspection
// ---------------------------------------------------------------------------

#[napi(object)]
pub struct AgentProcess {
    pub name: String,
    pub pid: u32,
    pub cwd: String,
    pub command_line: String,
}

/// Find running processes whose name matches one of the given agent names.
/// Returns each matching process's name, PID, working directory, and command line.
/// Names are matched case-insensitively and without `.exe` suffix on Windows.
#[napi]
pub fn get_agent_processes(names: Vec<String>) -> Vec<AgentProcess> {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing()
            .with_cwd(UpdateKind::OnlyIfNotSet)
            .with_cmd(UpdateKind::OnlyIfNotSet),
    );

    let mut results = Vec::new();
    for (_pid, process) in sys.processes() {
        let proc_name = process.name().to_string_lossy();
        let normalised = proc_name
            .strip_suffix(".exe")
            .or_else(|| proc_name.strip_suffix(".EXE"))
            .unwrap_or(&proc_name)
            .to_lowercase();

        let Some(matched_name) = names.iter().find(|n| n.to_lowercase() == normalised) else {
            continue;
        };
        let Some(cwd) = process.cwd() else {
            continue;
        };

        // Strip trailing path separators for consistent matching
        let mut cwd_str = cwd.to_string_lossy().into_owned();
        while cwd_str.ends_with('/') || cwd_str.ends_with('\\') {
            cwd_str.pop();
        }

        results.push(AgentProcess {
            name: matched_name.clone(),
            pid: process.pid().as_u32(),
            cwd: cwd_str,
            command_line: process
                .cmd()
                .iter()
                .map(|s| s.to_string_lossy())
                .collect::<Vec<_>>()
                .join(" "),
        });
    }
    results
}

// ---------------------------------------------------------------------------
// GG web server
// ---------------------------------------------------------------------------

struct GGInstance {
    port: u16,
    shutdown_tx: Option<oneshot::Sender<()>>,
    server_handle: JoinHandle<()>,
}

static INSTANCES: LazyLock<Mutex<HashMap<String, GGInstance>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn instance_key(path: &str) -> String {
    path.to_lowercase()
}

/// Start a GG web server for the given workspace path, returning the port.
/// Idempotent — reuses an existing instance if still running.
#[napi]
pub async fn start_gg_web(path: String) -> napi::Result<u16> {
    let key = instance_key(&path);

    // Check for existing live instance
    {
        let instances = INSTANCES.lock().unwrap();
        if let Some(inst) = instances.get(&key) {
            if !inst.server_handle.is_finished() {
                return Ok(inst.port);
            }
        }
    }

    // Remove stale entry if any
    {
        let mut instances = INSTANCES.lock().unwrap();
        instances.remove(&key);
    }

    // Create the GG app (sync — sets up worker thread and router)
    let options = gg_lib::RunOptions::new(PathBuf::from(&path));
    let (app, gg_shutdown_rx) = gg_lib::web::create_app(options, None)?;

    // Bind to a random available port
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let port = listener.local_addr()?.port();

    // Create our own shutdown channel for external stop
    let (our_shutdown_tx, our_shutdown_rx) = oneshot::channel::<()>();

    // Spawn the Axum server — shuts down when either GG self-shutdowns or we send stop
    let server_handle = tokio::spawn(async move {
        let shutdown_future = async move {
            tokio::select! {
                _ = gg_shutdown_rx => {
                    log::info!("GG instance on port {port} shut down internally");
                }
                _ = our_shutdown_rx => {
                    log::info!("GG instance on port {port} shut down externally");
                }
            }
        };

        if let Err(e) = axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_future)
            .await
        {
            log::error!("GG server error on port {port}: {e}");
        }
    });

    // Store in global map
    {
        let mut instances = INSTANCES.lock().unwrap();
        instances.insert(
            key,
            GGInstance {
                port,
                shutdown_tx: Some(our_shutdown_tx),
                server_handle,
            },
        );
    }

    log::info!("Started GG web server for {path} on port {port}");
    Ok(port)
}

/// Stop the GG web server for a specific workspace path.
#[napi]
pub fn stop_gg_web(path: String) {
    let key = instance_key(&path);
    let mut instances = INSTANCES.lock().unwrap();
    if let Some(inst) = instances.remove(&key) {
        if let Some(tx) = inst.shutdown_tx {
            let _ = tx.send(());
        }
    }
}

// ---------------------------------------------------------------------------
// GG web server — stop helpers
// ---------------------------------------------------------------------------

/// Stop all GG web server instances, optionally keeping one alive.
#[napi]
pub fn stop_all_gg_web(except_path: Option<String>) {
    let except_key = except_path.map(|p| instance_key(&p));
    let mut instances = INSTANCES.lock().unwrap();

    let keys_to_remove: Vec<String> = instances
        .keys()
        .filter(|k| except_key.as_ref() != Some(k))
        .cloned()
        .collect();

    for key in keys_to_remove {
        if let Some(inst) = instances.remove(&key) {
            if let Some(tx) = inst.shutdown_tx {
                let _ = tx.send(());
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Workspace management
// ---------------------------------------------------------------------------

/// Create a new Jujutsu workspace for agent isolation.
///
/// `repo_path` — filesystem path to the repository root.
/// `workspace_name` — jj workspace name (a UUID).
/// `workspace_path` — absolute filesystem path for the new workspace directory.
#[napi]
pub async fn create_workspace(
    repo_path: String,
    workspace_name: String,
    workspace_path: String,
) -> napi::Result<()> {
    let repo_buf: PathBuf = repo_path.into();
    let ws_buf: PathBuf = workspace_path.into();
    run_local(move || async move {
        let (settings, _, _, _) = gg_lib::read_config(Some(&repo_buf))?;
        let mut worker = WorkerSession::new(Arc::new(NoEventSink), None, settings, false, false);
        let mut repo = worker.load_workspace(&repo_buf).await?;

        repo.add_workspace(workspace_name, ws_buf).await?;

        Ok(())
    })
    .await
}

/// Remove (forget) a Jujutsu workspace.
///
/// `repo_path` — filesystem path to the repository root.
/// `workspace_name` — jj workspace name to forget.
/// `workspace_path` — absolute filesystem path for the workspace directory to remove.
#[napi]
pub async fn remove_workspace(
    repo_path: String,
    workspace_path: String,
    workspace_name: String,
) -> napi::Result<()> {
    let repo_buf: PathBuf = repo_path.into();
    let ws_buf: PathBuf = workspace_path.into();
    run_local(move || async move {
        let (settings, _, _, _) = gg_lib::read_config(Some(&repo_buf))?;
        let mut worker = WorkerSession::new(Arc::new(NoEventSink), None, settings, false, false);
        let mut repo = worker.load_workspace(&repo_buf).await?;

        repo.forget_workspace(workspace_name).await?;
        fs::remove_dir_all(ws_buf)?;

        Ok(())
    })
    .await
}
