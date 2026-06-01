# Local SQLite Payroll Schema Design

## Summary

Add a local SQLite database to the Tauri desktop application and let the Rust backend manage it. The database file will live in the Tauri `app_data_dir` so data persists across app restarts and follows normal desktop application storage conventions.

This milestone only covers the database foundation:

- create or open the local SQLite database on app startup
- create the required tables if they do not already exist
- enforce the agreed required fields and uniqueness constraints

This milestone does not include Excel import, data entry UI, query screens, or edit/delete workflows.

## Goals

- Use SQLite as the local persistent database.
- Store the database file in the application data directory.
- Initialize the database automatically on application startup.
- Keep database access inside the Rust backend.
- Create three tables:
  - `personnel`
  - `payroll_sheet`
  - `payroll_record`
- Preserve existing data across restarts.

## Recommended Approach

Use `rusqlite` in the Rust backend and keep initialization logic inside a focused database module. This is the simplest and most controlled option for the current stage of the project.

Why this approach:

- minimal dependency surface
- straightforward startup initialization
- clear separation between frontend UI and local persistence
- easy to extend later for import, query, update, and validation flows

Alternatives such as `sqlx` or a frontend-oriented SQLite plugin were considered, but they add complexity without helping the current milestone.

## Storage Location And Lifecycle

- Database engine: SQLite
- Database file location: Tauri `app_data_dir`
- Suggested filename: `payroll.db`
- Initialization timing: automatic during application startup

Startup behavior:

1. Resolve the application data directory.
2. Ensure the parent directory exists.
3. Open `payroll.db` if it exists, otherwise create it.
4. Enable foreign key enforcement for the connection.
5. Run schema initialization using `CREATE TABLE IF NOT EXISTS` and the required unique indexes.

This behavior must never clear existing user data. If the database file and tables already exist, startup should reuse them as-is.

## Table Design

### `personnel`

Purpose: store the base identity and employment information for each worker.

Columns:

- `id` integer primary key autoincrement
- `name` text not null
- `gender` text null
- `ethnicity` text null
- `native_place` text null
- `id_card_number` text null unique
- `payroll_card_number` text null
- `bank_name` text null
- `job_type` text null
- `start_date` text null
- `end_date` text null
- `phone_number` text null
- `remark` text null
- `updated_at` text not null

Notes:

- `name` is required.
- `id_card_number` is unique when present.
- date fields stay as nullable text in this milestone to keep schema setup simple and flexible for later import normalization.

### `payroll_sheet`

Purpose: represent one named payroll sheet batch or settlement sheet.

Columns:

- `id` integer primary key autoincrement
- `name` text not null unique
- `updated_at` text not null

Notes:

- `name` is the required human-readable payroll table name.
- duplicate sheet names are not allowed.

### `payroll_record`

Purpose: store payroll amounts for one worker inside one payroll sheet.

Columns:

- `id` integer primary key autoincrement
- `payroll_sheet_id` integer not null
- `personnel_id` integer not null
- `attendance_days` real null
- `wage_standard` real null
- `gross_pay` real null
- `deduction_amount` real null
- `net_pay` real not null
- `payee_signature` text null
- `remark` text null
- `updated_at` text not null

Constraints:

- foreign key `payroll_sheet_id` references `payroll_sheet(id)`
- foreign key `personnel_id` references `personnel(id)`
- unique pair `(payroll_sheet_id, personnel_id)`

Notes:

- `net_pay` is required.
- the unique pair prevents the same worker from appearing twice in the same payroll sheet.

## Application Architecture

### Rust backend

The Rust backend owns all database responsibilities:

- resolve the application data path
- open the SQLite connection
- initialize schema
- expose later database commands to the frontend

This work should be extracted into a dedicated module rather than left inline in the Tauri bootstrap function.

Suggested internal responsibilities:

- path resolution helper
- connection open helper
- schema initialization helper
- startup integration layer

### Frontend

The frontend does not access SQLite directly in this milestone. It may later call Tauri commands, but for now the only requirement is that the app can launch successfully with the local database initialized in the backend.

## Error Handling

- If the app data directory cannot be resolved, startup should fail with a clear Rust error.
- If the database file cannot be created or opened, startup should fail with a clear Rust error.
- If schema initialization fails, startup should fail rather than continue with a broken persistence layer.
- Initialization errors should be logged through the existing Tauri logging setup when possible.

Fail-fast behavior is preferred here because later payroll workflows should never run against a half-initialized local database.

## Testing And Verification

Verification for this milestone should cover:

- first run creates the SQLite file in `app_data_dir`
- first run creates all three tables
- rerunning initialization does not fail and does not drop data
- unique constraint on `personnel.id_card_number` exists
- unique constraint on `payroll_sheet.name` exists
- unique constraint on `(payroll_sheet_id, personnel_id)` exists
- foreign key relationships from `payroll_record` are enforced

Implementation should follow TDD where practical by extracting schema initialization into testable Rust functions rather than hiding it entirely inside the Tauri startup closure.

## Resolved Decisions

- database engine: `SQLite`
- storage location: `app_data_dir`
- backend ownership: `Rust backend`
- initialization timing: automatic on app startup
- import behavior: no data import in this milestone
- table split:
  - `personnel`
  - `payroll_sheet`
  - `payroll_record`
- uniqueness:
  - `personnel.id_card_number`
  - `payroll_sheet.name`
  - `(payroll_sheet_id, personnel_id)`

## Non-Goals

- importing data from `砌砖班组.xlsx`
- adding a visual CRUD interface
- building query, filter, or search screens
- supporting schema migrations beyond first-time schema creation
- designing sync, backup, or export workflows
