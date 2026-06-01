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

const PAYROLL_HEADER_DISPLAY: [&str; 11] = [
  "姓名",
  "身份证号",
  "银行卡号",
  "账户银行",
  "出勤\n天数",
  "工资标\n准",
  "应发工\n资",
  "应扣减\n金额",
  "实发\n金额",
  "领款人\n签字",
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
  write_attendance_sheet(&mut workbook, &export)?;

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
  let sheet_names = workbook.sheet_names().to_vec();
  if sheet_names.is_empty() {
    return Err("Excel 涓病鏈夊彲璇诲彇鐨勫伐浣滆〃".to_string());
  }

  for sheet_name in sheet_names {
    let range = workbook
      .worksheet_range(&sheet_name)
      .map_err(|error| format!("璇诲彇 Excel 澶辫触: {error}"))?;

    if let Some((header_row_index, column_offset)) = detect_roster_header(&range) {
      return Ok(parse_personnel_import_rows_from_sheet(
        &range,
        header_row_index,
        column_offset,
      ));
    }
  }
  Err("瀵煎叆妯℃澘涓嶅尮閰嶏紝璇蜂娇鐢ㄥ浐瀹氳姳鍚嶅唽琛ㄥご".into())
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

  let title_format = title_cell_format(16.0);
  let info_format = info_cell_format();
  let cell_format = body_cell_format();
  let header_format = header_cell_format();

  worksheet
    .merge_range(0, 0, 0, 12, "农民工花名册", &title_format)
    .map_err(|error| format!("写入花名册标题失败: {error}"))?;
  worksheet
    .write_with_format(1, 0, "编制单位：", &info_format)
    .map_err(|error| format!("写入花名册编制单位失败: {error}"))?;
  worksheet
    .merge_range(1, 1, 1, 3, "", &info_format)
    .map_err(|error| format!("写入花名册编制单位空白区失败: {error}"))?;
  worksheet
    .merge_range(1, 4, 1, 5, &export_month_label(), &info_format)
    .map_err(|error| format!("写入花名册月份失败: {error}"))?;
  worksheet
    .merge_range(1, 6, 1, 12, "", &info_format)
    .map_err(|error| format!("写入花名册右侧空白区失败: {error}"))?;

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

fn detect_roster_header(range: &calamine::Range<Data>) -> Option<(usize, usize)> {
  range.rows().enumerate().find_map(|(row_index, row)| {
    if !row.iter().any(|cell| !cell_string(cell).is_empty()) {
      return None;
    }

    let direct_headers = row
      .iter()
      .take(ROSTER_HEADERS.len())
      .map(cell_string)
      .collect::<Vec<_>>();
    if direct_headers == ROSTER_HEADERS {
      return Some((row_index, 0));
    }

    let indexed_headers = row
      .iter()
      .skip(1)
      .take(ROSTER_HEADERS.len())
      .map(cell_string)
      .collect::<Vec<_>>();
    if row.first().map(cell_string).as_deref() == Some("\u{5E8F}\u{53F7}")
      && indexed_headers == ROSTER_HEADERS
    {
      return Some((row_index, 1));
    }

    None
  })
}

fn parse_personnel_import_rows_from_sheet(
  range: &calamine::Range<Data>,
  header_row_index: usize,
  column_offset: usize,
) -> Vec<PersonnelImportRow> {
  range
    .rows()
    .skip(header_row_index + 1)
    .filter_map(|row| {
      let values = (0..ROSTER_HEADERS.len())
        .map(|index| row.get(index + column_offset).map(cell_string).unwrap_or_default())
        .collect::<Vec<_>>();
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
    .collect::<Vec<_>>()
}

fn write_payroll_sheet(workbook: &mut Workbook, export: &PayrollSheetExport) -> Result<(), String> {
  let worksheet = workbook.add_worksheet();
  worksheet
    .set_name("工资表")
    .map_err(|error| format!("设置工资表工作表名称失败: {error}"))?;

  let title_format = title_cell_format(18.0);
  let info_format = info_cell_format();
  let cell_format = body_cell_format();
  let header_format = wrapped_header_cell_format();
  let total_label_format = total_label_cell_format();
  let total_value_format = total_value_cell_format();

  worksheet
    .merge_range(0, 0, 0, 11, "工资表", &title_format)
    .map_err(|error| format!("写入工资表标题失败: {error}"))?;
  worksheet
    .write_with_format(1, 0, "编制单位名称：", &info_format)
    .map_err(|error| format!("写入工资表编制单位失败: {error}"))?;
  worksheet
    .merge_range(1, 1, 1, 11, "", &info_format)
    .map_err(|error| format!("写入工资表编制单位空白区失败: {error}"))?;

  worksheet
    .write_with_format(2, 0, "序号", &header_format)
    .map_err(|error| format!("写入工资表序号表头失败: {error}"))?;

  for (index, header) in PAYROLL_HEADER_DISPLAY.iter().enumerate() {
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

  let total_row = (export.records.len() + 3) as u32;
  let total_net_pay = export.records.iter().map(|record| record.net_pay).sum::<f64>();

  for column in 0..8 {
    worksheet
      .write_with_format(total_row, column, "", &cell_format)
      .map_err(|error| format!("写入工资表合计空白区失败: {error}"))?;
  }
  worksheet
    .write_with_format(total_row, 8, "合计", &total_label_format)
    .map_err(|error| format!("写入工资表合计标签失败: {error}"))?;
  worksheet
    .write_with_format(total_row, 9, format_decimal(total_net_pay), &total_value_format)
    .map_err(|error| format!("写入工资表合计金额失败: {error}"))?;
  worksheet
    .write_with_format(total_row, 10, "", &cell_format)
    .map_err(|error| format!("写入工资表合计签字空白区失败: {error}"))?;
  worksheet
    .write_with_format(total_row, 11, "", &cell_format)
    .map_err(|error| format!("写入工资表合计备注空白区失败: {error}"))?;

  apply_payroll_layout(worksheet).map_err(|error| format!("设置工资表样式失败: {error}"))?;
  Ok(())
}

fn write_attendance_sheet(
  workbook: &mut Workbook,
  export: &PayrollSheetExport,
) -> Result<(), String> {
  let worksheet = workbook.add_worksheet();
  worksheet
    .set_name("农民工考勤表")
    .map_err(|error| format!("设置考勤表工作表名称失败: {error}"))?;

  let title_format = title_cell_format(16.0);
  let info_format = info_cell_format();
  let header_format = header_cell_format();
  let cell_format = body_cell_format();

  worksheet
    .merge_range(0, 0, 0, 33, "农民工考勤表", &title_format)
    .map_err(|error| format!("写入考勤表标题失败: {error}"))?;
  worksheet
    .write_with_format(1, 0, "编制单位：", &info_format)
    .map_err(|error| format!("写入考勤表编制单位失败: {error}"))?;
  worksheet
    .merge_range(1, 1, 1, 13, "", &info_format)
    .map_err(|error| format!("写入考勤表编制单位空白区失败: {error}"))?;
  worksheet
    .merge_range(1, 14, 1, 17, &export_month_label(), &info_format)
    .map_err(|error| format!("写入考勤表月份失败: {error}"))?;
  worksheet
    .merge_range(1, 18, 1, 33, "", &info_format)
    .map_err(|error| format!("写入考勤表右侧空白区失败: {error}"))?;

  for (column, header) in ["序号", "姓名", "身份证号"].iter().enumerate() {
    worksheet
      .write_with_format(2, column as u16, *header, &header_format)
      .map_err(|error| format!("写入考勤表固定表头失败: {error}"))?;
  }

  for day in 1..=31 {
    worksheet
      .write_with_format(2, (day + 2) as u16, day.to_string(), &header_format)
      .map_err(|error| format!("写入考勤表日期表头失败: {error}"))?;
  }

  for index in 0..export.personnel.len() {
    let excel_row = (index + 3) as u32;
    worksheet
      .write_with_format(excel_row, 0, (index + 1) as i64, &cell_format)
      .map_err(|error| format!("写入考勤表序号失败: {error}"))?;

    for column in 1..=33 {
      worksheet
        .write_with_format(excel_row, column, "", &cell_format)
        .map_err(|error| format!("写入考勤表空白模板失败: {error}"))?;
    }
  }

  apply_attendance_layout(worksheet)
    .map_err(|error| format!("设置考勤表样式失败: {error}"))?;
  Ok(())
}

fn apply_roster_layout(worksheet: &mut Worksheet) -> Result<(), rust_xlsxwriter::XlsxError> {
  worksheet.set_row_height(0, 28.0)?;
  worksheet.set_row_height(1, 24.0)?;
  worksheet.set_row_height(2, 24.0)?;
  worksheet.set_default_row_height(22.0);
  worksheet.set_column_width(0, 6.0)?;
  worksheet.set_column_width(1, 10.0)?;
  worksheet.set_column_width(2, 8.0)?;
  worksheet.set_column_width(3, 8.0)?;
  worksheet.set_column_width(4, 28.0)?;
  worksheet.set_column_width(5, 22.0)?;
  worksheet.set_column_width(6, 22.0)?;
  worksheet.set_column_width(7, 24.0)?;
  worksheet.set_column_width(8, 10.0)?;
  worksheet.set_column_width(9, 12.0)?;
  worksheet.set_column_width(10, 12.0)?;
  worksheet.set_column_width(11, 14.0)?;
  worksheet.set_column_width(12, 10.0)?;
  Ok(())
}

fn apply_payroll_layout(worksheet: &mut Worksheet) -> Result<(), rust_xlsxwriter::XlsxError> {
  worksheet.set_row_height(0, 30.0)?;
  worksheet.set_row_height(1, 24.0)?;
  worksheet.set_row_height(2, 38.0)?;
  worksheet.set_default_row_height(22.0);
  worksheet.set_column_width(0, 6.0)?;
  worksheet.set_column_width(1, 12.0)?;
  worksheet.set_column_width(2, 24.0)?;
  worksheet.set_column_width(3, 24.0)?;
  worksheet.set_column_width(4, 22.0)?;
  worksheet.set_column_width(5, 10.0)?;
  worksheet.set_column_width(6, 10.0)?;
  worksheet.set_column_width(7, 10.0)?;
  worksheet.set_column_width(8, 10.0)?;
  worksheet.set_column_width(9, 8.0)?;
  worksheet.set_column_width(10, 12.0)?;
  worksheet.set_column_width(11, 10.0)?;
  Ok(())
}

fn apply_attendance_layout(worksheet: &mut Worksheet) -> Result<(), rust_xlsxwriter::XlsxError> {
  worksheet.set_row_height(0, 28.0)?;
  worksheet.set_row_height(1, 24.0)?;
  worksheet.set_row_height(2, 24.0)?;
  worksheet.set_default_row_height(22.0);
  worksheet.set_column_width(0, 6.0)?;
  worksheet.set_column_width(1, 10.0)?;
  worksheet.set_column_width(2, 24.0)?;
  for column in 3..=33 {
    worksheet.set_column_width(column, 4.0)?;
  }
  Ok(())
}

fn base_cell_format() -> Format {
  Format::new()
    .set_border(FormatBorder::Thin)
    .set_align(FormatAlign::Center)
    .set_align(FormatAlign::VerticalCenter)
    .set_font_size(11)
}

fn header_cell_format() -> Format {
  base_cell_format()
    .set_bold()
    .set_font_color(Color::Black)
}

fn wrapped_header_cell_format() -> Format {
  header_cell_format().set_text_wrap()
}

fn title_cell_format(font_size: f64) -> Format {
  base_cell_format().set_bold().set_font_size(font_size)
}

fn info_cell_format() -> Format {
  base_cell_format()
}

fn body_cell_format() -> Format {
  base_cell_format()
}

fn total_label_cell_format() -> Format {
  body_cell_format().set_bold()
}

fn total_value_cell_format() -> Format {
  body_cell_format()
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

  use calamine::{open_workbook_auto, Reader};
  use rust_xlsxwriter::Workbook;
  use tempfile::tempdir;

  use crate::db::{
    add_personnel_to_sheet, create_payroll_sheet, create_personnel, get_payroll_sheet_detail,
    open_connection_at_path, update_payroll_record_net_pay, CreatePayrollSheetInput,
    CreatePersonnelInput,
  };

  use super::{
    cell_string, export_payroll_sheet_excel, export_personnel_excel,
    import_personnel_from_excel, parse_personnel_import_rows, ExcelExportResult,
    ROSTER_HEADERS,
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
  fn personnel_import_accepts_exported_roster_layout() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("exported-roster.xlsx");

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.write_string(0, 0, "title").unwrap();
    worksheet.write_string(1, 0, "unit").unwrap();
    worksheet.write_string(1, 5, "2026-06").unwrap();
    worksheet.write_string(2, 0, "\u{5E8F}\u{53F7}").unwrap();
    for (index, header) in ROSTER_HEADERS.iter().enumerate() {
      worksheet.write_string(2, (index + 1) as u16, *header).unwrap();
    }
    worksheet.write_number(3, 0, 1.0).unwrap();
    worksheet.write_string(3, 1, "Alice").unwrap();
    worksheet.write_string(3, 5, "430623197201192213").unwrap();
    worksheet.write_string(3, 11, "18689852329").unwrap();
    workbook.save(&file_path).unwrap();

    let rows = parse_personnel_import_rows(&file_path).unwrap();

    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].name, "Alice");
    assert_eq!(rows[0].id_card_number.as_deref(), Some("430623197201192213"));
    assert_eq!(rows[0].phone_number.as_deref(), Some("18689852329"));
  }

  #[test]
  fn personnel_import_scans_sheets_for_roster_header() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("multi-sheet-roster.xlsx");

    let mut workbook = Workbook::new();
    let ignored_sheet = workbook.add_worksheet();
    ignored_sheet.set_name("sheet1").unwrap();
    ignored_sheet.write_string(0, 0, "ignored").unwrap();

    let roster_sheet = workbook.add_worksheet();
    roster_sheet.set_name("roster").unwrap();
    roster_sheet.write_string(0, 0, "title").unwrap();
    roster_sheet.write_string(1, 0, "unit").unwrap();
    roster_sheet.write_string(2, 0, "\u{5E8F}\u{53F7}").unwrap();
    for (index, header) in ROSTER_HEADERS.iter().enumerate() {
      roster_sheet
        .write_string(2, (index + 1) as u16, *header)
        .unwrap();
    }
    roster_sheet.write_number(3, 0, 1.0).unwrap();
    roster_sheet.write_string(3, 1, "Bob").unwrap();
    roster_sheet.write_string(3, 5, "430623197201192214").unwrap();
    workbook.save(&file_path).unwrap();

    let rows = parse_personnel_import_rows(&file_path).unwrap();

    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].name, "Bob");
    assert_eq!(rows[0].id_card_number.as_deref(), Some("430623197201192214"));
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
  fn payroll_export_contains_roster_payroll_and_attendance_sheets() {
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

    let mut workbook = open_workbook_auto(&file_path).unwrap();
    assert_eq!(
      workbook.sheet_names(),
      &["花名册".to_string(), "工资表".to_string(), "农民工考勤表".to_string()]
    );

    let payroll_sheet = workbook.worksheet_range("工资表").unwrap();
    assert_eq!(cell_string(payroll_sheet.get_value((2, 5)).unwrap()), "出勤\n天数");
    assert_eq!(cell_string(payroll_sheet.get_value((2, 10)).unwrap()), "领款人\n签字");
    assert_eq!(cell_string(payroll_sheet.get_value((4, 9)).unwrap()), "4000");
    assert_eq!(cell_string(payroll_sheet.get_value((4, 8)).unwrap()), "合计");

    let attendance_sheet = workbook.worksheet_range("农民工考勤表").unwrap();
    assert_eq!(cell_string(attendance_sheet.get_value((0, 0)).unwrap()), "农民工考勤表");
    assert_eq!(cell_string(attendance_sheet.get_value((2, 0)).unwrap()), "序号");
    assert_eq!(cell_string(attendance_sheet.get_value((2, 3)).unwrap()), "1");
    assert_eq!(cell_string(attendance_sheet.get_value((2, 33)).unwrap()), "31");
  }
}
