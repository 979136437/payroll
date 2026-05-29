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
