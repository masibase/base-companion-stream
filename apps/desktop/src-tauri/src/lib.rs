mod server;

use server::OverlayServer;
use std::sync::Arc;
use tauri::Listener;

const SERVICE_NAME: &str = "agent-companion";

fn config_path() -> Result<std::path::PathBuf, String> {
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "no config directory (APPDATA/USERPROFILE missing)".to_string())?;
    Ok(std::path::PathBuf::from(base).join("agent-companion").join("config.json"))
}

#[tauri::command]
fn read_config() -> Result<String, String> {
    let path = config_path()?;
    match std::fs::read_to_string(&path) {
        Ok(json) => Ok(json),
        Err(_) => Ok("null".to_string()),
    }
}

#[tauri::command]
fn write_config(json: String) -> Result<(), String> {
    let path = config_path()?;
    let dir = path
        .parent()
        .ok_or("config path has no parent".to_string())?;
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn keyring_get(key: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(SERVICE_NAME, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn keyring_set(key: String, value: String) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
fn keyring_delete(key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, &key).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn overlay_start(port: u16, server: tauri::State<'_, Arc<OverlayServer>>) -> Result<(), String> {
    server.start(port)
}

#[tauri::command]
fn overlay_stop(server: tauri::State<'_, Arc<OverlayServer>>) -> Result<(), String> {
    server.stop();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let overlay = Arc::new(OverlayServer::default());
    let overlay_for_events = Arc::clone(&overlay);
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(overlay)
        .setup(move |app| {
            app.listen("overlay.event", move |event| {
                overlay_for_events.broadcast(event.payload());
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_version,
            read_config,
            write_config,
            keyring_get,
            keyring_set,
            keyring_delete,
            overlay_start,
            overlay_stop
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
