#[macro_use]
extern crate napi_derive;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{LazyLock, Mutex};

use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

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
    let options = gg_cli::RunOptions::new(PathBuf::from(&path));
    let (app, gg_shutdown_rx) = gg_cli::web::create_app(options, None)
        .map_err(|e| napi::Error::from_reason(format!("Failed to create GG app: {e}")))?;

    // Bind to a random available port
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| napi::Error::from_reason(format!("Failed to bind listener: {e}")))?;
    let port = listener
        .local_addr()
        .map_err(|e| napi::Error::from_reason(format!("Failed to get local addr: {e}")))?
        .port();

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
