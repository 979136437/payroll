mod db;
mod excel;

use std::sync::Mutex;

use db::{
  add_personnel_to_sheet, create_payroll_sheet, create_personnel, database_path_from_base_dir,
  delete_personnel, get_payroll_sheet_detail, list_payroll_sheets, list_personnel,
  open_connection_at_path, remove_personnel_from_sheet, update_payroll_record_net_pay,
  update_personnel, CreatePayrollSheetInput, CreatePersonnelInput, PayrollSheetDetail,
  PayrollSheetRecordRow, PayrollSheetSummary, PersonnelSummary, UpdatePersonnelInput,
};
use excel::{
  export_payroll_sheet_excel, export_personnel_excel, import_personnel_from_excel,
  pick_excel_export_path, pick_personnel_import_file, ExcelExportResult, PersonnelImportResult,
};
use rusqlite::Connection;
use tauri::{Manager, State};

struct DbState {
  connection: Mutex<Connection>,
}

fn map_personnel_upsert_error(error: rusqlite::Error) -> String {
  if matches!(
    error,
    rusqlite::Error::SqliteFailure(_, Some(ref message))
      if message.contains("UNIQUE constraint failed: personnel.id_card_number")
  ) {
    "身份证号码已存在".into()
  } else {
    error.to_string()
  }
}

#[tauri::command]
fn list_personnel_command(state: State<'_, DbState>) -> Result<Vec<PersonnelSummary>, String> {
  let conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  list_personnel(&conn).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_personnel_command(
  state: State<'_, DbState>,
  payload: CreatePersonnelInput,
) -> Result<PersonnelSummary, String> {
  if payload.name.trim().is_empty() {
    return Err("姓名不能为空".into());
  }

  let conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  create_personnel(&conn, payload).map_err(map_personnel_upsert_error)
}

#[tauri::command]
fn update_personnel_command(
  state: State<'_, DbState>,
  personnel_id: i64,
  payload: UpdatePersonnelInput,
) -> Result<Option<PersonnelSummary>, String> {
  if payload.name.trim().is_empty() {
    return Err("姓名不能为空".into());
  }

  let conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  update_personnel(&conn, personnel_id, payload).map_err(map_personnel_upsert_error)
}

#[tauri::command]
fn delete_personnel_command(
  state: State<'_, DbState>,
  personnel_id: i64,
) -> Result<(), String> {
  let mut conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;

  match delete_personnel(&mut conn, personnel_id) {
    Ok(true) => Ok(()),
    Ok(false) => Err("人员不存在".into()),
    Err(error) => Err(error.to_string()),
  }
}

#[tauri::command]
fn list_payroll_sheets_command(
  state: State<'_, DbState>,
) -> Result<Vec<PayrollSheetSummary>, String> {
  let conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  list_payroll_sheets(&conn).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_payroll_sheet_command(
  state: State<'_, DbState>,
  payload: CreatePayrollSheetInput,
) -> Result<PayrollSheetSummary, String> {
  if payload.name.trim().is_empty() {
    return Err("工资表名称不能为空".into());
  }

  let mut conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  create_payroll_sheet(&mut conn, payload).map_err(|error| {
    if matches!(
      error,
      rusqlite::Error::SqliteFailure(_, Some(ref message))
        if message.contains("UNIQUE constraint failed: payroll_sheet.name")
    ) {
      "工资表名称已存在".into()
    } else {
      error.to_string()
    }
  })
}

#[tauri::command]
fn get_payroll_sheet_detail_command(
  state: State<'_, DbState>,
  sheet_id: i64,
) -> Result<Option<PayrollSheetDetail>, String> {
  let conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  get_payroll_sheet_detail(&conn, sheet_id).map_err(|error| error.to_string())
}

#[tauri::command]
fn add_personnel_to_sheet_command(
  state: State<'_, DbState>,
  sheet_id: i64,
  personnel_ids: Vec<i64>,
) -> Result<(), String> {
  let mut conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  add_personnel_to_sheet(&mut conn, sheet_id, &personnel_ids).map_err(|error| error.to_string())
}

#[tauri::command]
fn remove_personnel_from_sheet_command(
  state: State<'_, DbState>,
  sheet_id: i64,
  personnel_ids: Vec<i64>,
) -> Result<(), String> {
  let mut conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  remove_personnel_from_sheet(&mut conn, sheet_id, &personnel_ids)
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn update_payroll_record_net_pay_command(
  state: State<'_, DbState>,
  record_id: i64,
  net_pay: f64,
) -> Result<Option<PayrollSheetRecordRow>, String> {
  let conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  update_payroll_record_net_pay(&conn, record_id, net_pay).map_err(|error| error.to_string())
}

#[tauri::command]
fn pick_personnel_import_file_command() -> Option<String> {
  pick_personnel_import_file()
}

#[tauri::command]
fn pick_excel_export_path_command(default_file_name: String) -> Option<String> {
  pick_excel_export_path(&default_file_name)
}

#[tauri::command]
fn import_personnel_excel_command(
  state: State<'_, DbState>,
  file_path: String,
) -> Result<PersonnelImportResult, String> {
  let conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  import_personnel_from_excel(&conn, std::path::Path::new(&file_path))
}

#[tauri::command]
fn export_personnel_excel_command(
  state: State<'_, DbState>,
  save_path: String,
) -> Result<ExcelExportResult, String> {
  let conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  export_personnel_excel(&conn, std::path::Path::new(&save_path))
}

#[tauri::command]
fn export_payroll_sheet_excel_command(
  state: State<'_, DbState>,
  sheet_id: i64,
  save_path: String,
) -> Result<ExcelExportResult, String> {
  let conn = state
    .connection
    .lock()
    .map_err(|error| format!("database lock poisoned: {error}"))?;
  export_payroll_sheet_excel(&conn, sheet_id, std::path::Path::new(&save_path))
}

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
      let connection = open_connection_at_path(&db_path)
        .map_err(|error| -> Box<dyn std::error::Error> { Box::new(error) })?;

      app.manage(DbState {
        connection: Mutex::new(connection),
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      list_personnel_command,
      create_personnel_command,
      update_personnel_command,
      delete_personnel_command,
      list_payroll_sheets_command,
      create_payroll_sheet_command,
      get_payroll_sheet_detail_command,
      add_personnel_to_sheet_command,
      remove_personnel_from_sheet_command,
      update_payroll_record_net_pay_command,
      pick_personnel_import_file_command,
      pick_excel_export_path_command,
      import_personnel_excel_command,
      export_personnel_excel_command,
      export_payroll_sheet_excel_command
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use rusqlite::{ffi::Error as SqliteFfiError, Connection, Error, ErrorCode};
  use tempfile::tempdir;

  use super::map_personnel_upsert_error;

  #[test]
  fn compiles_with_sqlite_test_dependencies() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let _conn = Connection::open(db_path).unwrap();
  }

  #[test]
  fn maps_duplicate_id_card_error_to_friendly_message() {
    let error = Error::SqliteFailure(
      SqliteFfiError {
        code: ErrorCode::ConstraintViolation,
        extended_code: 2067,
      },
      Some("UNIQUE constraint failed: personnel.id_card_number".into()),
    );

    assert_eq!(map_personnel_upsert_error(error), "身份证号码已存在");
  }
}
