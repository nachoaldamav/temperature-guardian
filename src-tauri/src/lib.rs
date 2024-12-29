use std::path::PathBuf;
use std::sync::Arc;

use reqwest;
use serde_derive::{Deserialize, Serialize};
use tauri::menu::Menu;
use tauri::menu::MenuItem;
use tauri::tray::MouseButton;
use tauri::tray::MouseButtonState;
use tauri::tray::TrayIconBuilder;
use tauri::tray::TrayIconEvent;
use tauri::Manager;
use tauri::WebviewUrl;
use tauri::WebviewWindowBuilder;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use dirs;

const CONFIG_FILE: &str = "thresholds.json";

#[derive(Default, Clone)]
struct Thresholds {
    cpu_temp_threshold: Arc<RwLock<f64>>,
    gpu_temp_threshold: Arc<RwLock<f64>>,
    overall_temp_threshold: Arc<RwLock<f64>>,
}

impl Thresholds {
    pub fn new() -> Self {
        Self {
            cpu_temp_threshold: Arc::new(RwLock::new(75.0)), // Default CPU threshold
            gpu_temp_threshold: Arc::new(RwLock::new(80.0)), // Default GPU threshold
            overall_temp_threshold: Arc::new(RwLock::new(85.0)), // Default overall threshold
        }
    }

    pub async fn save(&self) -> Result<(), String> {
        let path = Self::get_config_path();
        let thresholds_data = ThresholdsData {
            cpu_temp_threshold: *self.cpu_temp_threshold.read().await,
            gpu_temp_threshold: *self.gpu_temp_threshold.read().await,
            overall_temp_threshold: *self.overall_temp_threshold.read().await,
        };

        let json = serde_json::to_string(&thresholds_data).map_err(|e| e.to_string())?;
        tokio::fs::write(path, json).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn load() -> Result<Self, String> {
        let path = Self::get_config_path();
        if !path.exists() {
            return Ok(Self::new());
        }

        let json = tokio::fs::read_to_string(path).await.map_err(|e| e.to_string())?;
        let thresholds_data: ThresholdsData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        Ok(Self {
            cpu_temp_threshold: Arc::new(RwLock::new(thresholds_data.cpu_temp_threshold)),
            gpu_temp_threshold: Arc::new(RwLock::new(thresholds_data.gpu_temp_threshold)),
            overall_temp_threshold: Arc::new(RwLock::new(thresholds_data.overall_temp_threshold)),
        })
    }

    fn get_config_path() -> PathBuf {
        let path = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("temperature-guardian");

        // Ensure the directory exists
        if let Err(e) = std::fs::create_dir_all(&path) {
            eprintln!("Failed to create config directory: {}", e);
        }

        path.join(CONFIG_FILE)
    }
}


#[derive(Serialize, Deserialize)]
struct ThresholdsData {
    cpu_temp_threshold: f64,
    gpu_temp_threshold: f64,
    overall_temp_threshold: f64,
}

async fn start_temperature_monitor(app: tauri::AppHandle, thresholds: Thresholds) {
    loop {
        if let Ok((Some(cpu_temp), Some(gpu_temp))) = get_temperatures().await {
            let cpu_threshold = *thresholds.cpu_temp_threshold.read().await;
            let gpu_threshold = *thresholds.gpu_temp_threshold.read().await;

            if cpu_temp > cpu_threshold {
                println!("CPU Temperature exceeds threshold!");
                let _ = show_popup(app.clone()).await;
            }

            if gpu_temp > gpu_threshold {
                println!("GPU Temperature exceeds threshold!");
                let _ = show_popup(app.clone()).await;
            }
        } else {
            println!("Failed to fetch or parse temperatures.");
        }

        sleep(Duration::from_secs(1)).await;
    }
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Root {
    pub id: Option<i64>,
    pub text: String,
    pub min: Option<String>,
    pub value: Option<String>,
    pub max: Option<String>,
    pub image_url: Option<String>,
    pub children: Vec<Children>,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Children {
    pub id: Option<i64>,
    pub text: String,
    pub min: Option<String>,
    pub value: Option<String>,
    pub max: Option<String>,
    pub image_url: Option<String>,
    pub sensor_id: Option<String>,
    #[serde(rename = "Type")]
    pub type_field: Option<String>,
    pub children: Vec<Children>,
}

fn parse_temperature(temp_str: &str) -> Option<f64> {
    temp_str
        .trim()
        .replace(" °C", "")
        .replace("°C", "")
        .replace(",", ".")
        .parse::<f64>()
        .ok()
}

fn find_temperature_recursive(children: &[Children], target: &str) -> Option<f64> {
    for child in children {
        if child.text.to_lowercase().contains(&target.to_lowercase())
            && child.type_field.as_deref() == Some("Temperature")
        {
            if let Some(value) = &child.value {
                if let Some(temp) = parse_temperature(value) {
                    return Some(temp);
                }
            }
        }
        if let Some(temp) = find_temperature_recursive(&child.children, target) {
            return Some(temp);
        }
    }
    None
}

#[tauri::command]
async fn show_popup(app: tauri::AppHandle) {
    let primary_monitor = app.primary_monitor().unwrap();
    if let Some(monitor) = primary_monitor {
        let screen_size = monitor.size();

        let width = 400.0;
        let height = 150.0;
        let taskbar_offset = 100.0;

        let x = screen_size.width as f64 - width - 25.0;
        let y = screen_size.height as f64 - height - taskbar_offset;

        let _ = WebviewWindowBuilder::new(&app, "popup", WebviewUrl::App("#/popup".into()))
            .title("Temperature Warning")
            .inner_size(width, height)
            .position(x, y)
            .always_on_top(true)
            .resizable(false)
            .visible(true)
            .transparent(true)
            .decorations(false)
            .build();
    }
}

#[tauri::command]
async fn close_popup(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("popup") {
        let _ = window.close();
    }
}

#[tauri::command]
async fn get_temperatures() -> Result<(Option<f64>, Option<f64>), String> {
    let url = "http://172.25.112.1:8086/data.json";

    let raw_response = match reqwest::get(url).await {
        Ok(response) => match response.text().await {
            Ok(text) => text,
            Err(e) => {
                println!("Failed to parse JSON: {}", e);
                return Err(format!("Failed to parse JSON: {}", e));
            }
        },
        Err(e) => {
            println!("Failed to fetch data: {}", e);
            return Err(format!("Failed to fetch data: {}", e));
        }
    };

    let response: Root = match serde_json::from_str(&raw_response) {
        Ok(parsed) => parsed,
        Err(e) => {
            println!("Failed to deserialize JSON: {}", e);
            return Err(format!("Failed to deserialize JSON: {}", e));
        }
    };

    let cpu_temp = find_temperature_recursive(&response.children, "Core (Tctl/Tdie)");
    let gpu_temp = find_temperature_recursive(&response.children, "GPU Core");

    Ok((cpu_temp, gpu_temp))
}

#[tauri::command]
async fn set_thresholds(
    state: tauri::State<'_, Thresholds>,
    new_cpu_threshold: Option<f64>,
    new_gpu_threshold: Option<f64>,
    new_overall_threshold: Option<f64>,
) -> Result<(), String> {
    if let Some(cpu) = new_cpu_threshold {
        let mut cpu_temp_threshold = state.cpu_temp_threshold.write().await;
        *cpu_temp_threshold = cpu;
    }

    if let Some(gpu) = new_gpu_threshold {
        let mut gpu_temp_threshold = state.gpu_temp_threshold.write().await;
        *gpu_temp_threshold = gpu;
    }

    if let Some(overall) = new_overall_threshold {
        let mut overall_temp_threshold = state.overall_temp_threshold.write().await;
        *overall_temp_threshold = overall;
    }

    state.save().await.map_err(|e| format!("Failed to save thresholds: {}", e))
}


#[tauri::command]
async fn get_thresholds(state: tauri::State<'_, Thresholds>) -> Result<(f64, f64, f64), String> {
    let cpu_temp_threshold = *state.cpu_temp_threshold.read().await;
    let gpu_temp_threshold = *state.gpu_temp_threshold.read().await;
    let overall_temp_threshold = *state.overall_temp_threshold.read().await;

    Ok((cpu_temp_threshold, gpu_temp_threshold, overall_temp_threshold))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() {
    let thresholds = Thresholds::load().await.unwrap_or_else(|e| {
        println!("Failed to load thresholds: {}. Using defaults.", e);
        Thresholds::new()
    });

    tauri::Builder::default()
        .manage(thresholds.clone())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            println!("Another instance was attempted to run. Focusing the existing one.");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            show_popup,
            get_temperatures,
            close_popup,
            set_thresholds,
            get_thresholds
        ])
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        println!("quit menu item was clicked");
                        app.exit(0);
                    }
                    _ => {
                        println!("menu item {:?} not handled", event.id);
                    }
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        let app = tray.app_handle();

                        if let Some(window) = app.get_webview_window("main") {
                            println!("Main window found. Showing and focusing it.");
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            println!("Main window not found. Creating it.");

                            // Create the main window
                            let main_window = WebviewWindowBuilder::new(
                                app,
                                "main",
                                WebviewUrl::App("index.html".into()),
                            )
                            .title("Temperature Guardian")
                            .inner_size(800.0, 600.0)
                            .resizable(true)
                            .visible(true)
                            .build();

                            match main_window {
                                Ok(_) => println!("Main window created successfully."),
                                Err(e) => println!("Failed to create the main window: {}", e),
                            }
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            let app_handle = app.handle().clone();
            tokio::spawn(async move {
                start_temperature_monitor(app_handle, thresholds).await;
            });

            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::MacosLauncher;
                use tauri_plugin_autostart::ManagerExt;

                let _ = app.handle().plugin(tauri_plugin_autostart::init(
                    MacosLauncher::LaunchAgent,
                    Some(vec!["--flag1", "--flag2"]),
                ));

                // Get the autostart manager
                let autostart_manager = app.autolaunch();
                // Enable autostart
                let _ = autostart_manager.enable();
                // Check enable state
                println!(
                    "registered for autostart? {}",
                    autostart_manager.is_enabled().unwrap()
                );
                // Disable autostart
                let _ = autostart_manager.disable();
            }

            Ok(())
        })
        .on_window_event(|app_handle, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let window = app_handle;
                if window.label() == "main" {
                    println!("Main window close requested. Hiding instead of closing.");
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app, event| match event {
            _ => (),
        });
}