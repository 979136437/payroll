use std::path::{Path, PathBuf};

use calamine::{open_workbook_auto, Data, Reader};
use rfd::FileDialog;
use rusqlite::Connection;
use rust_xlsxwriter::{
  Color, Format, FormatAlign, FormatBorder, Workbook, Worksheet,
};
use serde::Serialize;
use time::{format_description::BorrowedFormatItem, macros::format_description, OffsetDateTime};

use crate::db::{
  create_personnel, get_payroll_sheet_export, list_personnel, update_personnel,
  CreatePersonnelInput, PayrollSheetExport, PersonnelSummary, UpdatePersonnelInput,
};

const ROSTER_HEADERS: [&str; 12] = [
  "姓名",
  "性别",
  "民族",
  "籍贯",
  "身份证号码",
  "工资卡号",
  "开户行",
  "工种",
  "上场时间",
  "撤场时间",
  "联系电话",
  "备注",
];

const PAYROLL_HEADERS: [&str; 11] = [
  "姓名",
  "身份证号",
  "银行卡号",
  "账户银行",
  "出勤天数",
  "工资标准",
  "应发工资",
  "应扣减金额",
  "实发金额",
  "领款人签字",
  "备注",
];

const MONTH_FORMAT: &[BorrowedFormatItem<'static>] = format_description!("[year]年[month]月");

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PersonnelImportResult {
  pub created_count: usize,
  pub updated_count: usize,
  pub skipped_count: usize,
  pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExcelExportResult {
  pub file_path: String,
}

#[derive(Debug, Clone, PartialEq)]
struct PersonnelImportRow {
  name: String,
  gender: Option<String>,
  ethnicity: Option<String>,
  native_place: Option<String>,
  id_card_number: Option<String>,
  payroll_card_number: Option<String>,
  bank_name: Option<String>,
  job_type: Option<String>,
  start_date: Option<String>,
  end_date: Option<String>,
  phone_number: Option<String>,
  remark: Option<String>,
}

pub fn pick_personnel_import_file() -> Option<String> {
  FileDialog::new()
    .add_filter("Excel Workbook", &["xlsx", "xlsm", "xls"])
    .pick_file()
    .map(path_to_string)
}

pub fn pick_excel_export_path(default_name: &str) -> Option<String> {
  FileDialog::new()
    .add_filter("Excel Workbook", &["xlsx"])
    .set_file_name(default_name)
    .save_file()
    .map(path_to_string)
}

pub fn import_personnel_from_excel(
  conn: &Connection,
  file_path: &Path,
) -> Result<PersonnelImportResult, String> {
  let rows = parse_personnel_import_rows(file_path)?;
  let mut result = PersonnelImportResult {
    created_count: 0,
    updated_count: 0,
    skipped_count: 0,
    errors: vec![],
  };

  let existing_personnel = list_personnel(conn).map_err(|error| error.to_string())?;

  for row in rows {
    if row.name.trim().is_empty() {
      result.skipped_count += 1;
      continue;
    }

    match row.id_card_number.as_deref().and_then(|id_card| {
      existing_personnel
        .iter()
        .find(|personnel| personnel.id_card_number.as_deref() == Some(id_card))
        .map(|personnel| personnel.id)
    }) {
      Some(personnel_id) => {
        let payload = UpdatePersonnelInput {
          name: row.name,
          gender: row.gender,
          ethnicity: row.ethnicity,
          native_place: row.native_place,
          id_card_number: row.id_card_number,
          payroll_card_number: row.payroll_card_number,
          bank_name: row.bank_name,
          job_type: row.job_type,
          start_date: row.start_date,
          end_date: row.end_date,
          phone_number: row.phone_number,
          remark: row.remark,
        };

        update_personnel(conn, personnel_id, payload).map_err(|error| error.to_string())?;
        result.updated_count += 1;
      }
      None => {
        let payload = CreatePersonnelInput {
          name: row.name,
          gender: row.gender,
          ethnicity: row.ethnicity,
          native_place: row.native_place,
          id_card_number: row.id_card_number,
          payroll_card_number: row.payroll_card_number,
          bank_name: row.bank_name,
          job_type: row.job_type,
          start_date: row.start_date,
          end_date: row.end_date,
          phone_number: row.phone_number,
          remark: row.remark,
        };

        create_personnel(conn, payload).map_err(|error| error.to_string())?;
        result.created_count += 1;
      }
    }
  }

  Ok(result)
}

pub fn export_personnel_excel(
  conn: &Connection,
  save_path: &Path,
) -> Result<ExcelExportResult, String> {
  let personnel = list_personnel(conn).map_err(|error| error.to_string())?;
  let mut workbook = Workbook::new();

  write_roster_sheet(&mut workbook, "花名册", &personnel)?;
  workbook
    .save(save_path)
    .map_err(|error| format!("导出人员 Excel 失败: {error}"))?;

  Ok(ExcelExportResult {
    file_path: path_to_string(save_path.to_path_buf()),
  })
}

pub fn export_payroll_sheet_excel(
  conn: &Connection,
  sheet_id: i64,
  save_path: &Path,
) -> Result<ExcelExportResult, String> {
  let export = get_payroll_sheet_export(conn, sheet_id)
    .map_err(|error| error.to_string())?
    .ok_or_else(|| "未找到当前工资表".to_string())?;

  let mut workbook = Workbook::new();
  write_roster_sheet(&mut workbook, "花名册", &export.personnel)?;
  write_payroll_sheet(&mut workbook, &export)?;

  workbook
    .save(save_path)
    .map_err(|error| format!("导出工资表 Excel 失败: {error}"))?;

  Ok(ExcelExportResult {
    file_path: path_to_string(save_path.to_path_buf()),
  })
}

fn parse_personnel_import_rows(file_path: &Path) -> Result<Vec<PersonnelImportRow>, String> {
  let mut workbook =
    open_workbook_auto(file_path).map_err(|error| format!("打开 Excel 失败: {error}"))?;
  let first_sheet_name = workbook
    .sheet_names()
    .first()
    .cloned()
    .ok_or_else(|| "Excel 中没有可读取的工作表".to_string())?;

  let range = workbook
    .worksheet_range(&first_sheet_name)
    .map_err(|error| format!("读取 Excel 失败: {error}"))?;

  let mut rows = range.rows();
  let header_row = rows
    .find(|row| row.iter().any(|cell| !cell_string(cell).is_empty()))
    .ok_or_else(|| "Excel 中没有表头".to_string())?;

  let actual_headers = header_row
    .iter()
    .take(ROSTER_HEADERS.len())
    .map(cell_string)
    .collect::<Vec<_>>();

  if actual_headers != ROSTER_HEADERS {
    return Err("导入模板不匹配，请使用固定花名册表头".into());
  }

  let result = rows
    .filter_map(|row| {
      let values = row.iter().take(ROSTER_HEADERS.len()).map(cell_string).collect::<Vec<_>>();
      if values.iter().all(|value| value.trim().is_empty()) {
        return None;
      }

      Some(PersonnelImportRow {
        name: values.first().cloned().unwrap_or_default(),
        gender: optional_value(values.get(1)),
        ethnicity: optional_value(values.get(2)),
        native_place: optional_value(values.get(3)),
        id_card_number: optional_value(values.get(4)),
        payroll_card_number: optional_value(values.get(5)),
        bank_name: optional_value(values.get(6)),
        job_type: optional_value(values.get(7)),
        start_date: optional_value(values.get(8)),
        end_date: optional_value(values.get(9)),
        phone_number: optional_value(values.get(10)),
        remark: optional_value(values.get(11)),
      })
    })
    .collect::<Vec<_>>();

  Ok(result)
}

fn write_roster_sheet(
  workbook: &mut Workbook,
  sheet_name: &str,
  personnel: &[PersonnelSummary],
) -> Result<(), String> {
  let worksheet = workbook.add_worksheet();
  worksheet
    .set_name(sheet_name)
    .map_err(|error| format!("设置花名册工作表名称失败: {error}"))?;

  let title_format = Format::new()
    .set_bold()
    .set_font_size(18.0)
    .set_align(FormatAlign::Center)
    .set_align(FormatAlign::VerticalCenter);
  let cell_format = base_cell_format();
  let header_format = header_cell_format();

  worksheet
    .merge_range(0, 0, 0, 12, "农民工花名册", &title_format)
    .map_err(|error| format!("写入花名册标题失败: {error}"))?;
  worksheet
    .write_with_format(1, 0, "编制单位：", &cell_format)
    .map_err(|error| format!("写入花名册编制单位失败: {error}"))?;
  worksheet
    .merge_range(1, 1, 1, 4, "", &cell_format)
    .map_err(|error| format!("写入花名册编制单位空白区失败: {error}"))?;
  worksheet
    .merge_range(1, 5, 1, 12, &export_month_label(), &cell_format)
    .map_err(|error| format!("写入花名册月份失败: {error}"))?;

  worksheet
    .write_with_format(2, 0, "序号", &header_format)
    .map_err(|error| format!("写入花名册序号表头失败: {error}"))?;

  for (index, header) in ROSTER_HEADERS.iter().enumerate() {
    worksheet
      .write_with_format(2, (index + 1) as u16, *header, &header_format)
      .map_err(|error| format!("写入花名册表头失败: {error}"))?;
  }

  for (index, row) in personnel.iter().enumerate() {
    let excel_row = (index + 3) as u32;
    worksheet
      .write_with_format(excel_row, 0, (index + 1) as i64, &cell_format)
      .map_err(|error| format!("写入花名册序号失败: {error}"))?;

    let values = [
      row.name.clone(),
      value_or_empty(&row.gender),
      value_or_empty(&row.ethnicity),
      value_or_empty(&row.native_place),
      value_or_empty(&row.id_card_number),
      value_or_empty(&row.payroll_card_number),
      value_or_empty(&row.bank_name),
      value_or_empty(&row.job_type),
      value_or_empty(&row.start_date),
      value_or_empty(&row.end_date),
      value_or_empty(&row.phone_number),
      value_or_empty(&row.remark),
    ];

    for (column_index, value) in values.iter().enumerate() {
      worksheet
        .write_with_format(excel_row, (column_index + 1) as u16, value, &cell_format)
        .map_err(|error| format!("写入花名册数据失败: {error}"))?;
    }
  }

  apply_roster_layout(worksheet).map_err(|error| format!("设置花名册样式失败: {error}"))?;
  Ok(())
}

fn write_payroll_sheet(workbook: &mut Workbook, export: &PayrollSheetExport) -> Result<(), String> {
  let worksheet = workbook.add_worksheet();
  worksheet
    .set_name("工资表")
    .map_err(|error| format!("设置工资表工作表名称失败: {error}"))?;

  let title_format = Format::new()
    .set_bold()
    .set_font_size(18.0)
    .set_align(FormatAlign::Center)
    .set_align(FormatAlign::VerticalCenter);
  let cell_format = base_cell_format();
  let header_format = header_cell_format();

  worksheet
    .merge_range(0, 0, 0, 11, "工资表", &title_format)
    .map_err(|error| format!("写入工资表标题失败: {error}"))?;
  worksheet
    .write_with_format(1, 0, "编制单位名称：", &cell_format)
    .map_err(|error| format!("写入工资表编制单位失败: {error}"))?;
  worksheet
    .merge_range(1, 1, 1, 11, "", &cell_format)
    .map_err(|error| format!("写入工资表编制单位空白区失败: {error}"))?;

  worksheet
    .write_with_format(2, 0, "序号", &header_format)
    .map_err(|error| format!("写入工资表序号表头失败: {error}"))?;

  for (index, header) in PAYROLL_HEADERS.iter().enumerate() {
    worksheet
      .write_with_format(2, (index + 1) as u16, *header, &header_format)
      .map_err(|error| format!("写入工资表表头失败: {error}"))?;
  }

  for (index, record) in export.records.iter().enumerate() {
    let excel_row = (index + 3) as u32;
    worksheet
      .write_with_format(excel_row, 0, (index + 1) as i64, &cell_format)
      .map_err(|error| format!("写入工资表序号失败: {error}"))?;

    let values = [
      record.name.clone(),
      value_or_empty(&record.id_card_number),
      value_or_empty(&record.payroll_card_number),
      value_or_empty(&record.bank_name),
      optional_number(record.attendance_days),
      optional_number(record.wage_standard),
      optional_number(record.gross_pay),
      optional_number(record.deduction_amount),
      format_decimal(record.net_pay),
      value_or_empty(&record.payee_signature),
      value_or_empty(&record.remark),
    ];

    for (column_index, value) in values.iter().enumerate() {
      worksheet
        .write_with_format(excel_row, (column_index + 1) as u16, value, &cell_format)
        .map_err(|error| format!("写入工资表数据失败: {error}"))?;
    }
  }

  apply_payroll_layout(worksheet).map_err(|error| format!("设置工资表样式失败: {error}"))?;
  Ok(())
}

fn apply_roster_layout(worksheet: &mut Worksheet) -> Result<(), rust_xlsxwriter::XlsxError> {
  worksheet.set_column_width(0, 6.0)?;
  worksheet.set_column_width(1, 12.0)?;
  worksheet.set_column_width(2, 8.0)?;
  worksheet.set_column_width(3, 10.0)?;
  worksheet.set_column_width(4, 32.0)?;
  worksheet.set_column_width(5, 22.0)?;
  worksheet.set_column_width(6, 24.0)?;
  worksheet.set_column_width(7, 24.0)?;
  worksheet.set_column_width(8, 12.0)?;
  worksheet.set_column_width(9, 12.0)?;
  worksheet.set_column_width(10, 12.0)?;
  worksheet.set_column_width(11, 16.0)?;
  worksheet.set_column_width(12, 12.0)?;
  Ok(())
}

fn apply_payroll_layout(worksheet: &mut Worksheet) -> Result<(), rust_xlsxwriter::XlsxError> {
  worksheet.set_column_width(0, 6.0)?;
  worksheet.set_column_width(1, 12.0)?;
  worksheet.set_column_width(2, 22.0)?;
  worksheet.set_column_width(3, 22.0)?;
  worksheet.set_column_width(4, 24.0)?;
  worksheet.set_column_width(5, 12.0)?;
  worksheet.set_column_width(6, 12.0)?;
  worksheet.set_column_width(7, 12.0)?;
  worksheet.set_column_width(8, 12.0)?;
  worksheet.set_column_width(9, 12.0)?;
  worksheet.set_column_width(10, 14.0)?;
  worksheet.set_column_width(11, 12.0)?;
  Ok(())
}

fn base_cell_format() -> Format {
  Format::new()
    .set_border(FormatBorder::Thin)
    .set_align(FormatAlign::Center)
    .set_align(FormatAlign::VerticalCenter)
}

fn header_cell_format() -> Format {
  base_cell_format()
    .set_bold()
    .set_font_color(Color::Black)
}

fn export_month_label() -> String {
  OffsetDateTime::now_local()
    .or_else(|_| Ok(OffsetDateTime::now_utc()))
    .and_then(|datetime| datetime.format(MONTH_FORMAT))
    .unwrap_or_else(|_| "当前月份".to_string())
}

fn value_or_empty(value: &Option<String>) -> String {
  value.clone().unwrap_or_default()
}

fn optional_value(value: Option<&String>) -> Option<String> {
  value.and_then(|item| {
    let trimmed = item.trim();
    if trimmed.is_empty() {
      None
    } else {
      Some(trimmed.to_string())
    }
  })
}

fn optional_number(value: Option<f64>) -> String {
  value.map(format_decimal).unwrap_or_default()
}

fn format_decimal(value: f64) -> String {
  if value.fract() == 0.0 {
    format!("{value:.0}")
  } else {
    format!("{value:.2}")
  }
}

fn cell_string(cell: &Data) -> String {
  match cell {
    Data::String(value) => value.trim().to_string(),
    Data::Float(value) => format_decimal(*value),
    Data::Int(value) => value.to_string(),
    Data::Bool(value) => value.to_string(),
    Data::DateTime(value) => value.to_string(),
    Data::DateTimeIso(value) => value.trim().to_string(),
    Data::DurationIso(value) => value.trim().to_string(),
    Data::Empty => String::new(),
    Data::Error(_) => String::new(),
  }
}

fn path_to_string(path: PathBuf) -> String {
  path.to_string_lossy().to_string()
}

#[cfg(test)]
mod tests {
  use std::fs;
  use std::path::Path;

  use rust_xlsxwriter::Workbook;
  use tempfile::tempdir;

  use crate::db::{
    add_personnel_to_sheet, create_payroll_sheet, create_personnel, get_payroll_sheet_detail,
    open_connection_at_path, update_payroll_record_net_pay, CreatePayrollSheetInput,
    CreatePersonnelInput,
  };

  use super::{
    export_payroll_sheet_excel, export_personnel_excel, import_personnel_from_excel,
    parse_personnel_import_rows, ExcelExportResult, ROSTER_HEADERS,
  };

  fn write_fixture_file(path: &Path, bytes: &[u8]) {
    fs::write(path, bytes).unwrap();
  }

  #[test]
  fn personnel_import_requires_fixed_roster_headers() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("invalid.csv");
    write_fixture_file(&file_path, b"\xEF\xBB\xBF\xe5\xa7\x93\xe5\x90\x8d,\xe6\x80\xa7\xe5\x88\xab,\xe6\xb0\x91\xe6\x97\x8f\n");

    let result = parse_personnel_import_rows(&file_path);

    assert!(result.is_err());
  }

  #[test]
  fn personnel_import_updates_existing_record_by_id_card() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = open_connection_at_path(&db_path).unwrap();
    let file_path = dir.path().join("roster.xlsx");

    create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "旧姓名".into(),
        gender: None,
        ethnicity: None,
        native_place: None,
        id_card_number: Some("430623197201192213".into()),
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

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    for (index, header) in ROSTER_HEADERS.iter().enumerate() {
      worksheet.write_string(0, index as u16, *header).unwrap();
    }
    worksheet.write_string(1, 0, "新姓名").unwrap();
    worksheet.write_string(1, 4, "430623197201192213").unwrap();
    worksheet.write_string(1, 10, "18689852329").unwrap();
    workbook.save(&file_path).unwrap();

    let result = import_personnel_from_excel(&conn, &file_path).unwrap();
    let personnel = crate::db::list_personnel(&conn).unwrap();

    assert_eq!(result.created_count, 0);
    assert_eq!(result.updated_count, 1);
    assert_eq!(personnel.len(), 1);
    assert_eq!(personnel[0].name, "新姓名");
    assert_eq!(personnel[0].phone_number.as_deref(), Some("18689852329"));
  }

  #[test]
  fn personnel_export_creates_roster_sheet() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let conn = open_connection_at_path(&db_path).unwrap();
    let file_path = dir.path().join("personnel.xlsx");

    create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "陈罗宏".into(),
        gender: Some("男".into()),
        ethnicity: Some("汉".into()),
        native_place: Some("湖南".into()),
        id_card_number: Some("430623197201192213".into()),
        payroll_card_number: Some("6236683520010069982".into()),
        bank_name: Some("三亚建设支行".into()),
        job_type: Some("初砖".into()),
        start_date: None,
        end_date: None,
        phone_number: Some("18689852329".into()),
        remark: None,
      },
    )
    .unwrap();

    let result = export_personnel_excel(&conn, &file_path).unwrap();

    assert_eq!(
      result,
      ExcelExportResult {
        file_path: file_path.to_string_lossy().to_string(),
      }
    );
    assert!(file_path.exists());
  }

  #[test]
  fn payroll_export_contains_roster_and_payroll_sheet_names() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("payroll.db");
    let mut conn = open_connection_at_path(&db_path).unwrap();
    let file_path = dir.path().join("payroll.xlsx");

    let alice = create_personnel(
      &conn,
      CreatePersonnelInput {
        name: "陈罗宏".into(),
        gender: Some("男".into()),
        ethnicity: Some("汉".into()),
        native_place: Some("湖南".into()),
        id_card_number: Some("430623197201192213".into()),
        payroll_card_number: Some("6236683520010069982".into()),
        bank_name: Some("三亚建设支行".into()),
        job_type: Some("初砖".into()),
        start_date: None,
        end_date: None,
        phone_number: Some("18689852329".into()),
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
    let detail = get_payroll_sheet_detail(&conn, sheet.id).unwrap().unwrap();
    update_payroll_record_net_pay(&conn, detail.records[0].record_id, 4000.0).unwrap();

    export_payroll_sheet_excel(&conn, sheet.id, &file_path).unwrap();

    assert!(file_path.exists());
  }
}
