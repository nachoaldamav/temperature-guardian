// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tokio::main] // Start a Tokio runtime
async fn main() {
    temperature_guardian_lib::run().await;
}
