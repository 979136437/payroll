use rusqlite::{Connection, Result};

const PERSONNEL_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS personnel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT,
  ethnicity TEXT,
  native_place TEXT,
  id_card_number TEXT UNIQUE,
  payroll_card_number TEXT,
  bank_name TEXT,
  job_type TEXT,
  start_date TEXT,
  end_date TEXT,
  phone_number TEXT,
  remark TEXT,
  updated_at TEXT NOT NULL
);
"#;

const PAYROLL_SHEET_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS payroll_sheet (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL
);
"#;

const PAYROLL_RECORD_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS payroll_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payroll_sheet_id INTEGER NOT NULL,
  personnel_id INTEGER NOT NULL,
  attendance_days REAL,
  wage_standard REAL,
  gross_pay REAL,
  deduction_amount REAL,
  net_pay REAL NOT NULL,
  payee_signature TEXT,
  remark TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(payroll_sheet_id, personnel_id),
  FOREIGN KEY(payroll_sheet_id) REFERENCES payroll_sheet(id),
  FOREIGN KEY(personnel_id) REFERENCES personnel(id)
);
"#;

pub fn initialize_schema(conn: &Connection) -> Result<()> {
  conn.execute_batch(PERSONNEL_TABLE_SQL)?;
  conn.execute_batch(PAYROLL_SHEET_TABLE_SQL)?;
  conn.execute_batch(PAYROLL_RECORD_TABLE_SQL)?;
  Ok(())
}

#[cfg(test)]
mod tests {
  use rusqlite::Connection;
  use tempfile::tempdir;

  use super::initialize_schema;

  #[test]
  fn creates_all_required_tables() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = Connection::open(db_path).unwrap();

    initialize_schema(&conn).unwrap();

    let mut stmt = conn
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .unwrap();
    let table_names = stmt
      .query_map([], |row| row.get::<_, String>(0))
      .unwrap()
      .collect::<Result<Vec<_>, _>>()
      .unwrap();

    assert!(table_names.iter().any(|name| name == "personnel"));
    assert!(table_names.iter().any(|name| name == "payroll_sheet"));
    assert!(table_names.iter().any(|name| name == "payroll_record"));
  }

  #[test]
  fn schema_initialization_is_idempotent() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = Connection::open(db_path).unwrap();

    initialize_schema(&conn).unwrap();
    initialize_schema(&conn).unwrap();
  }

  #[test]
  fn rejects_duplicate_personnel_id_card_numbers() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = Connection::open(db_path).unwrap();

    initialize_schema(&conn).unwrap();

    conn
      .execute(
        "INSERT INTO personnel (name, id_card_number, updated_at) VALUES (?1, ?2, ?3)",
        ("Alice", "ID-001", "2026-05-29T00:00:00Z"),
      )
      .unwrap();

    let second_insert = conn.execute(
      "INSERT INTO personnel (name, id_card_number, updated_at) VALUES (?1, ?2, ?3)",
      ("Bob", "ID-001", "2026-05-29T00:00:00Z"),
    );

    assert!(second_insert.is_err());
  }

  #[test]
  fn rejects_duplicate_personnel_per_payroll_sheet() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = Connection::open(db_path).unwrap();

    initialize_schema(&conn).unwrap();
    conn.execute("PRAGMA foreign_keys = ON", []).unwrap();

    conn
      .execute(
        "INSERT INTO payroll_sheet (name, updated_at) VALUES (?1, ?2)",
        ("Sheet A", "2026-05-29T00:00:00Z"),
      )
      .unwrap();

    conn
      .execute(
        "INSERT INTO personnel (name, updated_at) VALUES (?1, ?2)",
        ("Alice", "2026-05-29T00:00:00Z"),
      )
      .unwrap();

    conn
      .execute(
        "INSERT INTO payroll_record (payroll_sheet_id, personnel_id, net_pay, updated_at) VALUES (?1, ?2, ?3, ?4)",
        (1_i64, 1_i64, 3000.0_f64, "2026-05-29T00:00:00Z"),
      )
      .unwrap();

    let duplicate = conn.execute(
      "INSERT INTO payroll_record (payroll_sheet_id, personnel_id, net_pay, updated_at) VALUES (?1, ?2, ?3, ?4)",
      (1_i64, 1_i64, 3200.0_f64, "2026-05-29T00:00:00Z"),
    );

    assert!(duplicate.is_err());
  }

  #[test]
  fn rejects_payroll_record_without_existing_foreign_keys() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = Connection::open(db_path).unwrap();

    conn.execute("PRAGMA foreign_keys = ON", []).unwrap();
    initialize_schema(&conn).unwrap();

    let insert = conn.execute(
      "INSERT INTO payroll_record (payroll_sheet_id, personnel_id, net_pay, updated_at) VALUES (?1, ?2, ?3, ?4)",
      (999_i64, 999_i64, 3000.0_f64, "2026-05-29T00:00:00Z"),
    );

    assert!(insert.is_err());
  }
}
