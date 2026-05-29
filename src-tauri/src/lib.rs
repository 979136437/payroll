mod db;

use db::{database_path_from_base_dir, open_connection_at_path};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| -> Box<dyn std::error::Error> { Box::new(error) })?;
      let db_path = database_path_from_base_dir(&app_data_dir);
      let _connection = open_connection_at_path(&db_path)
        .map_err(|error| -> Box<dyn std::error::Error> { Box::new(error) })?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use rusqlite::Connection;
  use tempfile::tempdir;

  #[test]
  fn compiles_with_sqlite_test_dependencies() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let _conn = Connection::open(db_path).unwrap();
  }
}
