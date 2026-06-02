use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};

const PERSONNEL_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS personnel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort_index INTEGER NOT NULL DEFAULT 0,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PersonnelSummary {
  pub id: i64,
  pub name: String,
  pub gender: Option<String>,
  pub ethnicity: Option<String>,
  pub native_place: Option<String>,
  pub id_card_number: Option<String>,
  pub payroll_card_number: Option<String>,
  pub bank_name: Option<String>,
  pub job_type: Option<String>,
  pub start_date: Option<String>,
  pub end_date: Option<String>,
  pub phone_number: Option<String>,
  pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePersonnelInput {
  pub name: String,
  pub gender: Option<String>,
  pub ethnicity: Option<String>,
  pub native_place: Option<String>,
  pub id_card_number: Option<String>,
  pub payroll_card_number: Option<String>,
  pub bank_name: Option<String>,
  pub job_type: Option<String>,
  pub start_date: Option<String>,
  pub end_date: Option<String>,
  pub phone_number: Option<String>,
  pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePersonnelInput {
  pub name: String,
  pub gender: Option<String>,
  pub ethnicity: Option<String>,
  pub native_place: Option<String>,
  pub id_card_number: Option<String>,
  pub payroll_card_number: Option<String>,
  pub bank_name: Option<String>,
  pub job_type: Option<String>,
  pub start_date: Option<String>,
  pub end_date: Option<String>,
  pub phone_number: Option<String>,
  pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PayrollSheetSummary {
  pub id: i64,
  pub name: String,
  pub personnel_count: i64,
  pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePayrollSheetInput {
  pub name: String,
  pub source_sheet_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PayrollSheetRecordRow {
  pub record_id: i64,
  pub personnel_id: i64,
  pub name: String,
  pub id_card_number: Option<String>,
  pub payroll_card_number: Option<String>,
  pub bank_name: Option<String>,
  pub attendance_days: Option<f64>,
  pub wage_standard: Option<f64>,
  pub gross_pay: Option<f64>,
  pub deduction_amount: Option<f64>,
  pub phone_number: Option<String>,
  pub net_pay: f64,
  pub payee_signature: Option<String>,
  pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PayrollSheetDetail {
  pub sheet: PayrollSheetSummary,
  pub records: Vec<PayrollSheetRecordRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PayrollSheetExport {
  pub sheet: PayrollSheetSummary,
  pub personnel: Vec<PersonnelSummary>,
  pub records: Vec<PayrollSheetRecordRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeletePersonnelBatchResult {
  pub deleted_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeletePayrollSheetResult {
  pub deleted: bool,
}

pub fn initialize_schema(conn: &Connection) -> Result<()> {
  conn.execute_batch(PERSONNEL_TABLE_SQL)?;
  ensure_personnel_sort_index(conn)?;
  conn.execute_batch(PAYROLL_SHEET_TABLE_SQL)?;
  conn.execute_batch(PAYROLL_RECORD_TABLE_SQL)?;
  Ok(())
}

pub fn database_path_from_base_dir(base_dir: &Path) -> PathBuf {
  base_dir.join("payroll.db")
}

pub fn open_connection_at_path(path: &Path) -> Result<Connection> {
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent)
      .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
  }

  let conn = Connection::open(path)?;
  conn.execute("PRAGMA foreign_keys = ON", [])?;
  initialize_schema(&conn)?;

  Ok(conn)
}

pub fn list_personnel(conn: &Connection) -> Result<Vec<PersonnelSummary>> {
  let mut stmt = conn.prepare(
    "SELECT
       id,
       name,
       gender,
       ethnicity,
       native_place,
       id_card_number,
       payroll_card_number,
       bank_name,
       job_type,
       start_date,
       end_date,
       phone_number,
       remark
     FROM personnel
     ORDER BY sort_index ASC, id ASC",
  )?;

  let rows = stmt.query_map([], |row| {
    Ok(PersonnelSummary {
      id: row.get(0)?,
      name: row.get(1)?,
      gender: row.get(2)?,
      ethnicity: row.get(3)?,
      native_place: row.get(4)?,
      id_card_number: row.get(5)?,
      payroll_card_number: row.get(6)?,
      bank_name: row.get(7)?,
      job_type: row.get(8)?,
      start_date: row.get(9)?,
      end_date: row.get(10)?,
      phone_number: row.get(11)?,
      remark: row.get(12)?,
    })
  })?;

  rows.collect()
}

pub fn create_personnel(
  conn: &Connection,
  input: CreatePersonnelInput,
) -> Result<PersonnelSummary> {
  let trimmed_name = input.name.trim();
  let sort_index = next_personnel_sort_index(conn)?;
  let updated_at = current_timestamp();

  conn.execute(
    "INSERT INTO personnel (
       name,
       sort_index,
       gender,
       ethnicity,
       native_place,
        id_card_number,
        payroll_card_number,
        bank_name,
        job_type,
        start_date,
        end_date,
        phone_number,
        remark,
        updated_at
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
    params![
      trimmed_name,
      sort_index,
      normalize_optional_string(input.gender),
      normalize_optional_string(input.ethnicity),
      normalize_optional_string(input.native_place),
      normalize_optional_string(input.id_card_number),
      normalize_optional_string(input.payroll_card_number),
      normalize_optional_string(input.bank_name),
      normalize_optional_string(input.job_type),
      normalize_optional_string(input.start_date),
      normalize_optional_string(input.end_date),
      normalize_optional_string(input.phone_number),
      normalize_optional_string(input.remark),
      updated_at
    ],
  )?;

  let id = conn.last_insert_rowid();
  get_personnel_by_id(conn, id)?
    .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)
}

pub fn update_personnel(
  conn: &Connection,
  personnel_id: i64,
  input: UpdatePersonnelInput,
) -> Result<Option<PersonnelSummary>> {
  let trimmed_name = input.name.trim();
  let updated_at = current_timestamp();

  let changed = conn.execute(
    "UPDATE personnel
     SET name = ?1,
         gender = ?2,
         ethnicity = ?3,
         native_place = ?4,
         id_card_number = ?5,
         payroll_card_number = ?6,
         bank_name = ?7,
         job_type = ?8,
         start_date = ?9,
         end_date = ?10,
         phone_number = ?11,
         remark = ?12,
         updated_at = ?13
     WHERE id = ?14",
    params![
      trimmed_name,
      normalize_optional_string(input.gender),
      normalize_optional_string(input.ethnicity),
      normalize_optional_string(input.native_place),
      normalize_optional_string(input.id_card_number),
      normalize_optional_string(input.payroll_card_number),
      normalize_optional_string(input.bank_name),
      normalize_optional_string(input.job_type),
      normalize_optional_string(input.start_date),
      normalize_optional_string(input.end_date),
      normalize_optional_string(input.phone_number),
      normalize_optional_string(input.remark),
      updated_at,
      personnel_id
    ],
  )?;

  if changed == 0 {
    return Ok(None);
  }

  get_personnel_by_id(conn, personnel_id)
}

pub fn delete_personnel(conn: &mut Connection, personnel_id: i64) -> Result<bool> {
  let tx = conn.transaction()?;

  let sheet_ids = {
    let mut stmt = tx.prepare(
      "SELECT DISTINCT payroll_sheet_id
       FROM payroll_record
       WHERE personnel_id = ?1",
    )?;

    let rows = stmt
      .query_map([personnel_id], |row| row.get::<_, i64>(0))?
      .collect::<Result<Vec<_>, _>>()?;

    rows
  };

  let existed = tx
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM personnel WHERE id = ?1)",
      [personnel_id],
      |row| row.get::<_, i64>(0),
    )?
    == 1;

  if !existed {
    tx.rollback()?;
    return Ok(false);
  }

  tx.execute(
    "DELETE FROM payroll_record WHERE personnel_id = ?1",
    [personnel_id],
  )?;

  tx.execute("DELETE FROM personnel WHERE id = ?1", [personnel_id])?;

  for sheet_id in sheet_ids {
    touch_payroll_sheet(&tx, sheet_id)?;
  }

  tx.commit()?;
  Ok(true)
}

pub fn delete_personnel_batch(
  conn: &mut Connection,
  personnel_ids: &[i64],
) -> Result<DeletePersonnelBatchResult> {
  let unique_personnel_ids: Vec<i64> = personnel_ids
    .iter()
    .copied()
    .collect::<std::collections::BTreeSet<_>>()
    .into_iter()
    .collect();

  if unique_personnel_ids.is_empty() {
    return Ok(DeletePersonnelBatchResult { deleted_count: 0 });
  }

  let tx = conn.transaction()?;
  let mut deleted_count = 0;

  for personnel_id in unique_personnel_ids {
    let sheet_ids = {
      let mut stmt = tx.prepare(
        "SELECT DISTINCT payroll_sheet_id
         FROM payroll_record
         WHERE personnel_id = ?1",
      )?;

      let rows = stmt
        .query_map([personnel_id], |row| row.get::<_, i64>(0))?
        .collect::<Result<Vec<_>, _>>()?;

      rows
    };

    let existed = tx
      .query_row(
        "SELECT EXISTS(SELECT 1 FROM personnel WHERE id = ?1)",
        [personnel_id],
        |row| row.get::<_, i64>(0),
      )?
      == 1;

    if !existed {
      continue;
    }

    tx.execute(
      "DELETE FROM payroll_record WHERE personnel_id = ?1",
      [personnel_id],
    )?;
    tx.execute("DELETE FROM personnel WHERE id = ?1", [personnel_id])?;

    for sheet_id in sheet_ids {
      touch_payroll_sheet(&tx, sheet_id)?;
    }

    deleted_count += 1;
  }

  tx.commit()?;

  Ok(DeletePersonnelBatchResult { deleted_count })
}

pub fn list_payroll_sheets(conn: &Connection) -> Result<Vec<PayrollSheetSummary>> {
  let mut stmt = conn.prepare(
    "SELECT ps.id, ps.name, ps.updated_at, COUNT(pr.id) AS personnel_count
     FROM payroll_sheet ps
     LEFT JOIN payroll_record pr ON pr.payroll_sheet_id = ps.id
     GROUP BY ps.id, ps.name, ps.updated_at
     ORDER BY ps.updated_at DESC, ps.id DESC",
  )?;

  let rows = stmt.query_map([], |row| {
    Ok(PayrollSheetSummary {
      id: row.get(0)?,
      name: row.get(1)?,
      updated_at: row.get(2)?,
      personnel_count: row.get(3)?,
    })
  })?;

  rows.collect()
}

pub fn create_payroll_sheet(
  conn: &mut Connection,
  input: CreatePayrollSheetInput,
) -> Result<PayrollSheetSummary> {
  let trimmed_name = input.name.trim();
  let created_at = current_timestamp();
  let tx = conn.transaction()?;

  tx.execute(
    "INSERT INTO payroll_sheet (name, updated_at) VALUES (?1, ?2)",
    params![trimmed_name, created_at],
  )?;

  let sheet_id = tx.last_insert_rowid();

  if let Some(source_sheet_id) = input.source_sheet_id {
    copy_sheet_personnel(&tx, source_sheet_id, sheet_id)?;
  }

  touch_payroll_sheet(&tx, sheet_id)?;
  tx.commit()?;

  get_payroll_sheet_summary(conn, sheet_id)?
    .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)
}

pub fn delete_payroll_sheet(
  conn: &mut Connection,
  sheet_id: i64,
) -> Result<DeletePayrollSheetResult> {
  let tx = conn.transaction()?;

  tx.execute(
    "DELETE FROM payroll_record WHERE payroll_sheet_id = ?1",
    [sheet_id],
  )?;
  let deleted = tx.execute("DELETE FROM payroll_sheet WHERE id = ?1", [sheet_id])? > 0;

  tx.commit()?;

  Ok(DeletePayrollSheetResult { deleted })
}

pub fn reorder_personnel_by_ids(conn: &Connection, ordered_personnel_ids: &[i64]) -> Result<()> {
  for (sort_index, personnel_id) in ordered_personnel_ids.iter().enumerate() {
    conn.execute(
      "UPDATE personnel
       SET sort_index = ?1
       WHERE id = ?2",
      params![sort_index as i64, personnel_id],
    )?;
  }

  Ok(())
}

pub fn get_payroll_sheet_detail(
  conn: &Connection,
  sheet_id: i64,
) -> Result<Option<PayrollSheetDetail>> {
  let Some(sheet) = get_payroll_sheet_summary(conn, sheet_id)? else {
    return Ok(None);
  };

  let mut stmt = conn.prepare(
    "SELECT
       pr.id,
       p.id,
       p.name,
       p.id_card_number,
       p.payroll_card_number,
       p.bank_name,
       pr.attendance_days,
       pr.wage_standard,
       pr.gross_pay,
       pr.deduction_amount,
       p.phone_number,
       pr.net_pay,
       pr.payee_signature,
       pr.remark
     FROM payroll_record pr
     INNER JOIN personnel p ON p.id = pr.personnel_id
     WHERE pr.payroll_sheet_id = ?1
     ORDER BY p.sort_index ASC, p.id ASC, pr.id ASC",
  )?;

  let records = stmt
    .query_map([sheet_id], |row| {
      Ok(PayrollSheetRecordRow {
        record_id: row.get(0)?,
        personnel_id: row.get(1)?,
        name: row.get(2)?,
        id_card_number: row.get(3)?,
        payroll_card_number: row.get(4)?,
        bank_name: row.get(5)?,
        attendance_days: row.get(6)?,
        wage_standard: row.get(7)?,
        gross_pay: row.get(8)?,
        deduction_amount: row.get(9)?,
        phone_number: row.get(10)?,
        net_pay: row.get(11)?,
        payee_signature: row.get(12)?,
        remark: row.get(13)?,
      })
    })?
    .collect::<Result<Vec<_>, _>>()?;

  Ok(Some(PayrollSheetDetail { sheet, records }))
}

pub fn get_payroll_sheet_export(
  conn: &Connection,
  sheet_id: i64,
) -> Result<Option<PayrollSheetExport>> {
  let Some(detail) = get_payroll_sheet_detail(conn, sheet_id)? else {
    return Ok(None);
  };

  let personnel = detail
    .records
    .iter()
    .filter_map(|record| get_personnel_by_id(conn, record.personnel_id).transpose())
    .collect::<Result<Vec<_>, _>>()?;

  Ok(Some(PayrollSheetExport {
    sheet: detail.sheet,
    personnel,
    records: detail.records,
  }))
}

pub fn add_personnel_to_sheet(
  conn: &mut Connection,
  sheet_id: i64,
  personnel_ids: &[i64],
) -> Result<()> {
  let tx = conn.transaction()?;

  for personnel_id in personnel_ids {
    tx.execute(
      "INSERT OR IGNORE INTO payroll_record (
         payroll_sheet_id,
         personnel_id,
         net_pay,
         updated_at
       ) VALUES (?1, ?2, 0, ?3)",
      params![sheet_id, personnel_id, current_timestamp()],
    )?;
  }

  touch_payroll_sheet(&tx, sheet_id)?;
  tx.commit()
}

pub fn add_personnel_to_sheet_with_net_pay(
  conn: &mut Connection,
  sheet_id: i64,
  personnel_ids: &[i64],
  net_pay: f64,
) -> Result<Option<PayrollSheetDetail>> {
  let unique_personnel_ids = personnel_ids
    .iter()
    .copied()
    .collect::<std::collections::BTreeSet<_>>();
  let tx = conn.transaction()?;
  let mut inserted_personnel_ids = Vec::new();

  for personnel_id in unique_personnel_ids {
    let inserted = tx.execute(
      "INSERT OR IGNORE INTO payroll_record (
         payroll_sheet_id,
         personnel_id,
         net_pay,
         updated_at
       ) VALUES (?1, ?2, 0, ?3)",
      params![sheet_id, personnel_id, current_timestamp()],
    )?;

    if inserted > 0 {
      inserted_personnel_ids.push(personnel_id);
    }
  }

  for personnel_id in inserted_personnel_ids {
    tx.execute(
      "UPDATE payroll_record
       SET net_pay = ?1, updated_at = ?2
       WHERE payroll_sheet_id = ?3 AND personnel_id = ?4",
      params![net_pay, current_timestamp(), sheet_id, personnel_id],
    )?;
  }

  touch_payroll_sheet(&tx, sheet_id)?;
  tx.commit()?;

  get_payroll_sheet_detail(conn, sheet_id)
}

pub fn remove_personnel_from_sheet(
  conn: &mut Connection,
  sheet_id: i64,
  personnel_ids: &[i64],
) -> Result<()> {
  let tx = conn.transaction()?;

  for personnel_id in personnel_ids {
    tx.execute(
      "DELETE FROM payroll_record
       WHERE payroll_sheet_id = ?1 AND personnel_id = ?2",
      params![sheet_id, personnel_id],
    )?;
  }

  touch_payroll_sheet(&tx, sheet_id)?;
  tx.commit()
}

pub fn update_payroll_record_net_pay(
  conn: &Connection,
  record_id: i64,
  net_pay: f64,
) -> Result<Option<PayrollSheetRecordRow>> {
  let updated_at = current_timestamp();

  let changed = conn.execute(
    "UPDATE payroll_record
     SET net_pay = ?1, updated_at = ?2
     WHERE id = ?3",
    params![net_pay, updated_at, record_id],
  )?;

  if changed == 0 {
    return Ok(None);
  }

  conn.execute(
    "UPDATE payroll_sheet
     SET updated_at = ?1
     WHERE id = (
       SELECT payroll_sheet_id
       FROM payroll_record
       WHERE id = ?2
     )",
    params![current_timestamp(), record_id],
  )?;

  get_payroll_record_row(conn, record_id)
}

fn copy_sheet_personnel(conn: &Connection, source_sheet_id: i64, target_sheet_id: i64) -> Result<()> {
  let mut stmt = conn.prepare(
    "SELECT personnel_id
     FROM payroll_record
     WHERE payroll_sheet_id = ?1
     ORDER BY id ASC",
  )?;

  let personnel_ids = stmt
    .query_map([source_sheet_id], |row| row.get::<_, i64>(0))?
    .collect::<Result<Vec<_>, _>>()?;

  for personnel_id in personnel_ids {
    conn.execute(
      "INSERT OR IGNORE INTO payroll_record (
         payroll_sheet_id,
         personnel_id,
         net_pay,
         updated_at
       ) VALUES (?1, ?2, 0, ?3)",
      params![target_sheet_id, personnel_id, current_timestamp()],
    )?;
  }

  Ok(())
}

fn ensure_personnel_sort_index(conn: &Connection) -> Result<()> {
  let mut stmt = conn.prepare("PRAGMA table_info(personnel)")?;
  let columns = stmt
    .query_map([], |row| row.get::<_, String>(1))?
    .collect::<Result<Vec<_>, _>>()?;

  let sort_index_added = !columns.iter().any(|column| column == "sort_index");

  if sort_index_added {
    conn.execute(
      "ALTER TABLE personnel ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0",
      [],
    )?;
  }

  if sort_index_added || personnel_sort_index_needs_bootstrap(conn)? {
    initialize_personnel_sort_index(conn)?;
  }

  Ok(())
}

fn personnel_sort_index_needs_bootstrap(conn: &Connection) -> Result<bool> {
  let sort_indexes = conn
    .prepare("SELECT sort_index FROM personnel ORDER BY sort_index ASC, id ASC")?
    .query_map([], |row| row.get::<_, i64>(0))?
    .collect::<Result<Vec<_>, _>>()?;

  if sort_indexes.is_empty() {
    return Ok(false);
  }

  let all_zero = sort_indexes.iter().all(|sort_index| *sort_index == 0);
  if all_zero {
    return Ok(true);
  }

  let mut previous = None;
  for sort_index in sort_indexes {
    if let Some(previous_sort_index) = previous {
      if sort_index <= previous_sort_index {
        return Ok(true);
      }
    }
    previous = Some(sort_index);
  }

  Ok(false)
}

fn initialize_personnel_sort_index(conn: &Connection) -> Result<()> {
  let ids = conn
    .prepare("SELECT id FROM personnel ORDER BY id ASC")?
    .query_map([], |row| row.get::<_, i64>(0))?
    .collect::<Result<Vec<_>, _>>()?;

  for (sort_index, personnel_id) in ids.iter().enumerate() {
    conn.execute(
      "UPDATE personnel
       SET sort_index = ?1
       WHERE id = ?2",
      params![sort_index as i64, personnel_id],
    )?;
  }

  Ok(())
}

fn next_personnel_sort_index(conn: &Connection) -> Result<i64> {
  conn.query_row(
    "SELECT COALESCE(MAX(sort_index), -1) + 1 FROM personnel",
    [],
    |row| row.get(0),
  )
}

fn get_personnel_by_id(conn: &Connection, personnel_id: i64) -> Result<Option<PersonnelSummary>> {
  conn
    .query_row(
      "SELECT
         id,
         name,
         gender,
         ethnicity,
         native_place,
         id_card_number,
         payroll_card_number,
         bank_name,
         job_type,
         start_date,
         end_date,
         phone_number,
         remark
       FROM personnel
       WHERE id = ?1",
      [personnel_id],
      |row| {
        Ok(PersonnelSummary {
          id: row.get(0)?,
          name: row.get(1)?,
          gender: row.get(2)?,
          ethnicity: row.get(3)?,
          native_place: row.get(4)?,
          id_card_number: row.get(5)?,
          payroll_card_number: row.get(6)?,
          bank_name: row.get(7)?,
          job_type: row.get(8)?,
          start_date: row.get(9)?,
          end_date: row.get(10)?,
          phone_number: row.get(11)?,
          remark: row.get(12)?,
        })
      },
    )
    .optional()
}

fn get_payroll_sheet_summary(
  conn: &Connection,
  sheet_id: i64,
) -> Result<Option<PayrollSheetSummary>> {
  conn
    .query_row(
      "SELECT ps.id, ps.name, ps.updated_at, COUNT(pr.id) AS personnel_count
       FROM payroll_sheet ps
       LEFT JOIN payroll_record pr ON pr.payroll_sheet_id = ps.id
       WHERE ps.id = ?1
       GROUP BY ps.id, ps.name, ps.updated_at",
      [sheet_id],
      |row| {
        Ok(PayrollSheetSummary {
          id: row.get(0)?,
          name: row.get(1)?,
          updated_at: row.get(2)?,
          personnel_count: row.get(3)?,
        })
      },
    )
    .optional()
}

fn get_payroll_record_row(
  conn: &Connection,
  record_id: i64,
) -> Result<Option<PayrollSheetRecordRow>> {
  conn
    .query_row(
      "SELECT
         pr.id,
         p.id,
         p.name,
         p.id_card_number,
         p.payroll_card_number,
         p.bank_name,
         pr.attendance_days,
         pr.wage_standard,
         pr.gross_pay,
         pr.deduction_amount,
         p.phone_number,
         pr.net_pay,
         pr.payee_signature,
         pr.remark
       FROM payroll_record pr
       INNER JOIN personnel p ON p.id = pr.personnel_id
       WHERE pr.id = ?1",
      [record_id],
      |row| {
        Ok(PayrollSheetRecordRow {
          record_id: row.get(0)?,
          personnel_id: row.get(1)?,
          name: row.get(2)?,
          id_card_number: row.get(3)?,
          payroll_card_number: row.get(4)?,
          bank_name: row.get(5)?,
          attendance_days: row.get(6)?,
          wage_standard: row.get(7)?,
          gross_pay: row.get(8)?,
          deduction_amount: row.get(9)?,
          phone_number: row.get(10)?,
          net_pay: row.get(11)?,
          payee_signature: row.get(12)?,
          remark: row.get(13)?,
        })
      },
    )
    .optional()
}

fn touch_payroll_sheet(conn: &Connection, sheet_id: i64) -> Result<()> {
  conn.execute(
    "UPDATE payroll_sheet SET updated_at = ?1 WHERE id = ?2",
    params![current_timestamp(), sheet_id],
  )?;
  Ok(())
}

fn current_timestamp() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};

  let seconds = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_secs())
    .unwrap_or_default();

  format!("{seconds}")
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
  value.and_then(|item| {
    let trimmed = item.trim().to_string();
    if trimmed.is_empty() {
      None
    } else {
      Some(trimmed)
    }
  })
}

#[cfg(test)]
mod tests {
  use rusqlite::Connection;
  use tempfile::tempdir;

  use super::{
    add_personnel_to_sheet, add_personnel_to_sheet_with_net_pay, create_payroll_sheet,
    create_personnel, database_path_from_base_dir, delete_payroll_sheet, delete_personnel,
    delete_personnel_batch, get_payroll_sheet_detail, initialize_schema, list_payroll_sheets,
    list_personnel, open_connection_at_path, remove_personnel_from_sheet,
    reorder_personnel_by_ids, update_payroll_record_net_pay, update_personnel,
    CreatePayrollSheetInput, CreatePersonnelInput, UpdatePersonnelInput,
  };

  #[test]
  fn personnel_schema_contains_export_columns_even_when_empty() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = Connection::open(db_path).unwrap();

    initialize_schema(&conn).unwrap();

    let columns = ["start_date", "end_date", "remark"];

    for column in columns {
      let exists = conn
        .prepare("PRAGMA table_info(personnel)")
        .unwrap()
        .query_map([], |row| row.get::<_, String>(1))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap()
        .into_iter()
        .any(|name| name == column);

      assert!(exists, "missing personnel column: {column}");
    }
  }

  #[test]
  fn payroll_record_schema_contains_export_columns_even_when_empty() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = Connection::open(db_path).unwrap();

    initialize_schema(&conn).unwrap();

    let columns = [
      "attendance_days",
      "wage_standard",
      "gross_pay",
      "deduction_amount",
      "payee_signature",
      "remark",
    ];

    for column in columns {
      let exists = conn
        .prepare("PRAGMA table_info(payroll_record)")
        .unwrap()
        .query_map([], |row| row.get::<_, String>(1))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap()
        .into_iter()
        .any(|name| name == column);

      assert!(exists, "missing payroll_record column: {column}");
    }
  }

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

  #[test]
  fn app_database_path_uses_payroll_db_filename() {
    let dir = tempdir().unwrap();
    let path = database_path_from_base_dir(dir.path());

    assert_eq!(
      path.file_name().and_then(|name| name.to_str()),
      Some("payroll.db")
    );
  }

  #[test]
  fn open_connection_at_path_creates_parent_dirs_and_initializes_schema() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("nested").join("data").join("payroll.db");

    let conn = open_connection_at_path(&db_path).unwrap();

    assert!(db_path.exists());

    let count: i64 = conn
      .query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='personnel'",
        [],
        |row| row.get(0),
      )
      .unwrap();

    assert_eq!(count, 1);

    let insert = conn.execute(
      "INSERT INTO payroll_record (payroll_sheet_id, personnel_id, net_pay, updated_at) VALUES (?1, ?2, ?3, ?4)",
      (999_i64, 999_i64, 3000.0_f64, "2026-05-29T00:00:00Z"),
    );

    assert!(insert.is_err());
  }

  #[test]
  fn reopening_existing_database_preserves_inserted_data() {
    let dir = tempdir().unwrap();
    let db_path = database_path_from_base_dir(dir.path());

    {
      let conn = open_connection_at_path(&db_path).unwrap();
      conn
        .execute(
          "INSERT INTO payroll_sheet (name, updated_at) VALUES (?1, ?2)",
          ("May Payroll", "2026-05-29T00:00:00Z"),
        )
        .unwrap();
    }

    {
      let conn = open_connection_at_path(&db_path).unwrap();
      let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM payroll_sheet", [], |row| row.get(0))
        .unwrap();

      assert_eq!(count, 1);
    }
  }

  #[test]
  fn initialize_schema_adds_sort_index_for_existing_personnel_table() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = Connection::open(&db_path).unwrap();
    conn
      .execute_batch(
        r#"
        CREATE TABLE personnel (
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
        INSERT INTO personnel (name, updated_at) VALUES ('Charlie', '1');
        INSERT INTO personnel (name, updated_at) VALUES ('Alice', '2');
        "#,
      )
      .unwrap();

    initialize_schema(&conn).unwrap();

    let rows = list_personnel(&conn).unwrap();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].name, "Charlie");
    assert_eq!(rows[1].name, "Alice");
  }

  #[test]
  fn reopening_database_preserves_reordered_personnel_sort_order() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");

    {
      let conn = open_connection_at_path(&db_path).unwrap();
      let alice = create_personnel(
        &conn,
        CreatePersonnelInput {
          name: "Alice".into(),
          gender: None,
          ethnicity: None,
          native_place: None,
          id_card_number: Some("100000199001010001".into()),
          payroll_card_number: None,
          bank_name: None,
          job_type: None,
          start_date: None,
          end_date: None,
          phone_number: None,
          remark: None,
        },
      )
      .unwrap();
      let bob = create_personnel(
        &conn,
        CreatePersonnelInput {
          name: "Bob".into(),
          gender: None,
          ethnicity: None,
          native_place: None,
          id_card_number: Some("200000199001010002".into()),
          payroll_card_number: None,
          bank_name: None,
          job_type: None,
          start_date: None,
          end_date: None,
          phone_number: None,
          remark: None,
        },
      )
      .unwrap();
      let charlie = create_personnel(
        &conn,
        CreatePersonnelInput {
          name: "Charlie".into(),
          gender: None,
          ethnicity: None,
          native_place: None,
          id_card_number: Some("300000199001010003".into()),
          payroll_card_number: None,
          bank_name: None,
          job_type: None,
          start_date: None,
          end_date: None,
          phone_number: None,
          remark: None,
        },
      )
      .unwrap();

      reorder_personnel_by_ids(&conn, &[bob.id, alice.id, charlie.id]).unwrap();
    }

    let reopened = open_connection_at_path(&db_path).unwrap();
    let names = list_personnel(&reopened)
      .unwrap()
      .into_iter()
      .map(|personnel| personnel.name)
      .collect::<Vec<_>>();

    assert_eq!(names, vec!["Bob", "Alice", "Charlie"]);
  }

  #[test]
  fn initialize_schema_repairs_duplicate_sort_indexes_from_previous_bug() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = Connection::open(&db_path).unwrap();
    conn
      .execute_batch(
        r#"
        CREATE TABLE personnel (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sort_index INTEGER NOT NULL DEFAULT 0,
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
        INSERT INTO personnel (id, name, sort_index, updated_at) VALUES (1, 'Alice', 1, '1');
        INSERT INTO personnel (id, name, sort_index, updated_at) VALUES (2, 'Bob', 1, '2');
        INSERT INTO personnel (id, name, sort_index, updated_at) VALUES (3, 'Charlie', 2, '3');
        "#,
      )
      .unwrap();

    initialize_schema(&conn).unwrap();

    let ordered_rows = list_personnel(&conn).unwrap();
    let names = ordered_rows
      .iter()
      .map(|personnel| personnel.name.as_str())
      .collect::<Vec<_>>();
    let sort_indexes = conn
      .prepare("SELECT sort_index FROM personnel ORDER BY sort_index ASC, id ASC")
      .unwrap()
      .query_map([], |row| row.get::<_, i64>(0))
      .unwrap()
      .collect::<Result<Vec<_>, _>>()
      .unwrap();

    assert_eq!(names, vec!["Alice", "Bob", "Charlie"]);
    assert_eq!(sort_indexes, vec![0, 1, 2]);
  }

  #[test]
  fn reopening_database_keeps_order_when_sort_indexes_have_gap_after_delete() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: Some("100000199001010001".into()),
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let bob = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Bob".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: Some("200000199001010002".into()),
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let charlie = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Charlie".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: Some("300000199001010003".into()),
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();

    reorder_personnel_by_ids(&conn, &[charlie.id, alice.id, bob.id]).unwrap();
    delete_personnel(&mut conn, alice.id).unwrap();
    drop(conn);

    let reopened = open_connection_at_path(&db_path).unwrap();
    let names = list_personnel(&reopened)
      .unwrap()
      .into_iter()
      .map(|personnel| personnel.name)
      .collect::<Vec<_>>();

    assert_eq!(names, vec!["Charlie", "Bob"]);
  }

  #[test]
  fn creates_personnel_and_lists_it() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = open_connection_at_path(&db_path).unwrap();

    let created = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: Some("女".into()),
        ethnicity: Some("汉".into()),
        native_place: Some("河南".into()),
        id_card_number: Some("410000199001010001".into()),
        payroll_card_number: Some("6222000000000001".into()),
        bank_name: Some("中国建设银行".into()),
        job_type: Some("瓦工".into()),
        start_date: None,
        end_date: None,
        phone_number: Some("13800000000".into()),
        remark: None,
      },
    )
    .unwrap();

    assert_eq!(created.name, "Alice");
    assert_eq!(created.gender.as_deref(), Some("女"));
    assert_eq!(created.ethnicity.as_deref(), Some("汉"));
    assert_eq!(created.native_place.as_deref(), Some("河南"));
    assert_eq!(
      created.id_card_number.as_deref(),
      Some("410000199001010001")
    );
    assert_eq!(
      created.payroll_card_number.as_deref(),
      Some("6222000000000001")
    );
    assert_eq!(created.bank_name.as_deref(), Some("中国建设银行"));
    assert_eq!(created.job_type.as_deref(), Some("瓦工"));
    assert_eq!(created.phone_number.as_deref(), Some("13800000000"));

    let personnel = list_personnel(&conn).unwrap();
    assert_eq!(personnel.len(), 1);
    assert_eq!(personnel[0], created);
  }

  #[test]
  fn create_personnel_normalizes_blank_optional_fields() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = open_connection_at_path(&db_path).unwrap();

    let created = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: " Alice ".into(),
        gender: Some(" ".into()),
        ethnicity: Some("".into()),
        native_place: Some("  ".into()),
        id_card_number: Some("".into()),
        payroll_card_number: Some(" ".into()),
        bank_name: Some("".into()),
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: Some(" ".into()),
        remark: None,
      },
    )
    .unwrap();

    assert_eq!(created.name, "Alice");
    assert_eq!(created.gender, None);
    assert_eq!(created.ethnicity, None);
    assert_eq!(created.native_place, None);
    assert_eq!(created.id_card_number, None);
    assert_eq!(created.payroll_card_number, None);
    assert_eq!(created.bank_name, None);
    assert_eq!(created.phone_number, None);
  }

  #[test]
  fn updates_personnel_and_reads_back_latest_values() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = open_connection_at_path(&db_path).unwrap();

    let created = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: Some("女".into()),
        ethnicity: Some("汉".into()),
        native_place: Some("河南".into()),
        id_card_number: Some("410000199001010001".into()),
        payroll_card_number: Some("6222000000000001".into()),
        bank_name: Some("中国建设银行".into()),
        job_type: Some("瓦工".into()),
        start_date: None,
        end_date: None,
        phone_number: Some("13800000000".into()),
        remark: None,
      },
    )
    .unwrap();

    let updated = update_personnel(
      &conn,
      created.id,
      UpdatePersonnelInput {
        name: "Alice Updated".into(),
        gender: Some("男".into()),
        ethnicity: Some("满".into()),
        native_place: Some("河北".into()),
        id_card_number: Some("130000199201020002".into()),
        payroll_card_number: Some("6222000000000009".into()),
        bank_name: Some("中国银行".into()),
        job_type: created.job_type.clone(),
        start_date: None,
        end_date: None,
        phone_number: Some("13900000000".into()),
        remark: None,
      },
    )
    .unwrap()
    .unwrap();

    assert_eq!(updated.id, created.id);
    assert_eq!(updated.name, "Alice Updated");
    assert_eq!(updated.gender.as_deref(), Some("男"));
    assert_eq!(updated.ethnicity.as_deref(), Some("满"));
    assert_eq!(updated.native_place.as_deref(), Some("河北"));
    assert_eq!(
      updated.id_card_number.as_deref(),
      Some("130000199201020002")
    );
    assert_eq!(
      updated.payroll_card_number.as_deref(),
      Some("6222000000000009")
    );
    assert_eq!(updated.bank_name.as_deref(), Some("中国银行"));
    assert_eq!(updated.phone_number.as_deref(), Some("13900000000"));
    assert_eq!(updated.job_type, created.job_type);
  }

  #[test]
  fn updating_personnel_normalizes_blank_optional_fields() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = open_connection_at_path(&db_path).unwrap();

    let created = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: Some("女".into()),
        ethnicity: Some("汉".into()),
        native_place: Some("河南".into()),
        id_card_number: Some("410000199001010001".into()),
        payroll_card_number: Some("6222000000000001".into()),
        bank_name: Some("中国建设银行".into()),
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: Some("13800000000".into()),
        remark: None,
      },
    )
    .unwrap();

    let updated = update_personnel(
      &conn,
      created.id,
      UpdatePersonnelInput {
        name: " Alice ".into(),
        gender: Some(" ".into()),
        ethnicity: Some("".into()),
        native_place: Some("  ".into()),
        id_card_number: Some("".into()),
        payroll_card_number: Some(" ".into()),
        bank_name: Some("".into()),
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: Some(" ".into()),
        remark: None,
      },
    )
    .unwrap()
    .unwrap();

    assert_eq!(updated.name, "Alice");
    assert_eq!(updated.gender, None);
    assert_eq!(updated.ethnicity, None);
    assert_eq!(updated.native_place, None);
    assert_eq!(updated.id_card_number, None);
    assert_eq!(updated.payroll_card_number, None);
    assert_eq!(updated.bank_name, None);
    assert_eq!(updated.phone_number, None);
  }

  #[test]
  fn updating_personnel_to_duplicate_id_card_number_fails() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = open_connection_at_path(&db_path).unwrap();

    let first = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: Some("410000199001010001".into()),
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();

    let second = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Bob".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: Some("130000199001010002".into()),
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();

    let result = update_personnel(
      &conn,
      second.id,
      UpdatePersonnelInput {
        name: second.name,
        gender: second.gender,
        ethnicity: second.ethnicity,
        native_place: second.native_place,
        id_card_number: first.id_card_number,
        payroll_card_number: second.payroll_card_number,
        bank_name: second.bank_name,
        job_type: second.job_type,
        start_date: second.start_date,
        end_date: second.end_date,
        phone_number: second.phone_number,
        remark: second.remark,
      },
    );

    assert!(result.is_err());
  }

  #[test]
  fn deletes_personnel_and_related_payroll_records() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: Some("410000199001010001".into()),
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let bob = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Bob".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: Some("130000199001010002".into()),
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();

    let first_sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-05".into(),
        source_sheet_id: None,
      },
    )
    .unwrap();
    let second_sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-06".into(),
        source_sheet_id: None,
      },
    )
    .unwrap();

    add_personnel_to_sheet(&mut conn, first_sheet.id, &[alice.id, bob.id]).unwrap();
    add_personnel_to_sheet(&mut conn, second_sheet.id, &[alice.id]).unwrap();

    let did_delete = delete_personnel(&mut conn, alice.id).unwrap();

    assert!(did_delete);
    let personnel = list_personnel(&conn).unwrap();
    assert_eq!(personnel.len(), 1);
    assert_eq!(personnel[0].id, bob.id);

    let first_detail = get_payroll_sheet_detail(&conn, first_sheet.id).unwrap().unwrap();
    let second_detail = get_payroll_sheet_detail(&conn, second_sheet.id).unwrap().unwrap();
    assert_eq!(first_detail.records.len(), 1);
    assert_eq!(first_detail.records[0].personnel_id, bob.id);
    assert_eq!(second_detail.records.len(), 0);

    let sheets = list_payroll_sheets(&conn).unwrap();
    let first_summary = sheets.iter().find(|sheet| sheet.id == first_sheet.id).unwrap();
    let second_summary = sheets.iter().find(|sheet| sheet.id == second_sheet.id).unwrap();
    assert_eq!(first_summary.personnel_count, 1);
    assert_eq!(second_summary.personnel_count, 0);
  }

  #[test]
  fn deleting_missing_personnel_returns_false() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let did_delete = delete_personnel(&mut conn, 999).unwrap();

    assert!(!did_delete);
  }

  #[test]
  fn delete_personnel_batch_removes_existing_ids_only() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let first = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let second = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Bob".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();

    let result =
      delete_personnel_batch(&mut conn, &[first.id, 999, second.id, first.id]).unwrap();

    assert_eq!(result.deleted_count, 2);
    assert!(list_personnel(&conn).unwrap().is_empty());
  }

  #[test]
  fn delete_payroll_sheet_removes_records_without_touching_personnel() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-05".into(),
        source_sheet_id: None,
      },
    )
    .unwrap();

    add_personnel_to_sheet(&mut conn, sheet.id, &[alice.id]).unwrap();

    let result = delete_payroll_sheet(&mut conn, sheet.id).unwrap();

    assert!(result.deleted);
    assert!(get_payroll_sheet_detail(&conn, sheet.id).unwrap().is_none());
    assert_eq!(list_personnel(&conn).unwrap().len(), 1);
    assert!(list_payroll_sheets(&conn).unwrap().is_empty());
  }

  #[test]
  fn list_payroll_sheets_returns_personnel_count() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();

    let bob = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Bob".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();

    let sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-05".into(),
        source_sheet_id: None,
      },
    )
    .unwrap();

    add_personnel_to_sheet(&mut conn, sheet.id, &[alice.id, bob.id]).unwrap();

    let sheets = list_payroll_sheets(&conn).unwrap();
    assert_eq!(sheets.len(), 1);
    assert_eq!(sheets[0].personnel_count, 2);
  }

  #[test]
  fn creates_payroll_sheet_from_source_without_copying_wages() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();

    let source_sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-04".into(),
        source_sheet_id: None,
      },
    )
    .unwrap();

    add_personnel_to_sheet(&mut conn, source_sheet.id, &[alice.id]).unwrap();
    let source_detail = get_payroll_sheet_detail(&conn, source_sheet.id)
      .unwrap()
      .unwrap();
    let source_record_id = source_detail.records[0].record_id;
    update_payroll_record_net_pay(&conn, source_record_id, 4200.0).unwrap();

    let copied_sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-05".into(),
        source_sheet_id: Some(source_sheet.id),
      },
    )
    .unwrap();

    let copied_detail = get_payroll_sheet_detail(&conn, copied_sheet.id)
      .unwrap()
      .unwrap();
    assert_eq!(copied_detail.records.len(), 1);
    assert_eq!(copied_detail.records[0].personnel_id, alice.id);
    assert_eq!(copied_detail.records[0].net_pay, 0.0);
  }

  #[test]
  fn adding_personnel_to_sheet_skips_duplicates() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();

    let sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-05".into(),
        source_sheet_id: None,
      },
    )
    .unwrap();

    add_personnel_to_sheet(&mut conn, sheet.id, &[alice.id, alice.id]).unwrap();
    let detail = get_payroll_sheet_detail(&conn, sheet.id).unwrap().unwrap();
    assert_eq!(detail.records.len(), 1);
  }

  #[test]
  fn removes_personnel_from_sheet() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let bob = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Bob".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-05".into(),
        source_sheet_id: None,
      },
    )
    .unwrap();

    add_personnel_to_sheet(&mut conn, sheet.id, &[alice.id, bob.id]).unwrap();
    remove_personnel_from_sheet(&mut conn, sheet.id, &[alice.id]).unwrap();

    let detail = get_payroll_sheet_detail(&conn, sheet.id).unwrap().unwrap();
    assert_eq!(detail.records.len(), 1);
    assert_eq!(detail.records[0].personnel_id, bob.id);
  }

  #[test]
  fn updates_payroll_record_net_pay_and_reads_back_detail() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-05".into(),
        source_sheet_id: None,
      },
    )
    .unwrap();

    add_personnel_to_sheet(&mut conn, sheet.id, &[alice.id]).unwrap();
    let detail = get_payroll_sheet_detail(&conn, sheet.id).unwrap().unwrap();
    let record_id = detail.records[0].record_id;

    let updated = update_payroll_record_net_pay(&conn, record_id, 3500.0)
      .unwrap()
      .unwrap();
    assert_eq!(updated.net_pay, 3500.0);

    let refreshed = get_payroll_sheet_detail(&conn, sheet.id).unwrap().unwrap();
    assert_eq!(refreshed.records[0].net_pay, 3500.0);
  }

  #[test]
  fn add_personnel_to_sheet_with_net_pay_only_updates_newly_added_people() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Alice".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let bob = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "Bob".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: None,
        payroll_card_number: None,
        bank_name: None,
        job_type: None,
        start_date: None,
        end_date: None,
        phone_number: None,
        remark: None,
      },
    )
    .unwrap();
    let sheet = create_payroll_sheet(
      &mut conn,
      CreatePayrollSheetInput {
        name: "2026-06".into(),
        source_sheet_id: None,
      },
    )
    .unwrap();

    add_personnel_to_sheet(&mut conn, sheet.id, &[alice.id]).unwrap();
    let original_detail = get_payroll_sheet_detail(&conn, sheet.id).unwrap().unwrap();
    let alice_record_id = original_detail.records[0].record_id;
    update_payroll_record_net_pay(&conn, alice_record_id, 2800.0).unwrap();

    let updated_detail = add_personnel_to_sheet_with_net_pay(
      &mut conn,
      sheet.id,
      &[alice.id, bob.id, bob.id],
      3200.0,
    )
    .unwrap()
    .unwrap();

    assert_eq!(updated_detail.records.len(), 2);
    let alice_row = updated_detail
      .records
      .iter()
      .find(|record| record.personnel_id == alice.id)
      .unwrap();
    let bob_row = updated_detail
      .records
      .iter()
      .find(|record| record.personnel_id == bob.id)
      .unwrap();

    assert_eq!(alice_row.net_pay, 2800.0);
    assert_eq!(bob_row.net_pay, 3200.0);
  }
}
