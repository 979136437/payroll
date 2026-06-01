# Local SQLite Payroll Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Rust-managed local SQLite database that is created in the Tauri app data directory on startup and contains the `personnel`, `payroll_sheet`, and `payroll_record` tables with the agreed constraints.

**Architecture:** The Rust backend owns database initialization. A dedicated `db` module will resolve the app data path, open the SQLite file, enable foreign keys, and create tables using idempotent schema SQL. The Tauri startup path will call that module during `setup`, and tests will validate schema creation and constraint behavior independently of the UI.

**Tech Stack:** Tauri 2, Rust, rusqlite, tempfile, existing tauri-plugin-log

---

### Task 1: Add SQLite dependencies and test support

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Write the failing dependency-aware test usage target**

Plan to add tests that import `rusqlite::Connection` and `tempfile::tempdir` from the Rust crate graph:

```rust
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
```

- [ ] **Step 2: Run Rust tests to verify they fail before dependencies exist**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: FAIL with unresolved import errors for `rusqlite` and `tempfile`.

- [ ] **Step 3: Add the minimal dependencies to Cargo**

Update `src-tauri/Cargo.toml` dependencies to include:

```toml
[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
log = "0.4"
tauri = { version = "2.11.2" }
tauri-plugin-log = "2"
rusqlite = { version = "0.37", features = ["bundled"] }

[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 4: Run Cargo tests again to verify dependency resolution succeeds**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: test build progresses past dependency resolution. It may still fail later because the real database module has not been implemented yet.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "build(db): add sqlite dependencies"
```

### Task 2: Create a focused database module with schema initialization

**Files:**
- Create: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/db.rs`

- [ ] **Step 1: Write the first failing schema creation test**

Create `src-tauri/src/db.rs` with a test-first skeleton:

```rust
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
}
```

- [ ] **Step 2: Run the targeted Rust test to verify it fails**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml creates_all_required_tables -- --exact
```

Expected: FAIL because `initialize_schema` does not exist yet.

- [ ] **Step 3: Write the minimal schema initializer**

In `src-tauri/src/db.rs`, add the schema SQL and the initializer:

```rust
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
```

- [ ] **Step 4: Run the targeted Rust test to verify it passes**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml creates_all_required_tables -- --exact
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db.rs
git commit -m "feat(db): add sqlite schema initializer"
```

### Task 3: Add constraint and idempotency tests

**Files:**
- Modify: `src-tauri/src/db.rs`
- Test: `src-tauri/src/db.rs`

- [ ] **Step 1: Write a failing idempotency test**

Add this test:

```rust
#[test]
fn schema_initialization_is_idempotent() {
  let dir = tempdir().unwrap();
  let db_path = dir.path().join("payroll.db");
  let conn = Connection::open(db_path).unwrap();

  initialize_schema(&conn).unwrap();
  initialize_schema(&conn).unwrap();
}
```

- [ ] **Step 2: Write a failing unique constraint test for personnel id cards**

Add this test:

```rust
#[test]
fn rejects_duplicate_personnel_id_card_numbers() {
  let dir = tempdir().unwrap();
  let db_path = dir.path().join("payroll.db");
  let conn = Connection::open(db_path).unwrap();

  initialize_schema(&conn).unwrap();

  conn.execute(
    "INSERT INTO personnel (name, id_card_number, updated_at) VALUES (?1, ?2, ?3)",
    ("Alice", "ID-001", "2026-05-29T00:00:00Z"),
  ).unwrap();

  let second_insert = conn.execute(
    "INSERT INTO personnel (name, id_card_number, updated_at) VALUES (?1, ?2, ?3)",
    ("Bob", "ID-001", "2026-05-29T00:00:00Z"),
  );

  assert!(second_insert.is_err());
}
```

- [ ] **Step 3: Write a failing unique pair test for payroll records**

Add this test:

```rust
#[test]
fn rejects_duplicate_personnel_per_payroll_sheet() {
  let dir = tempdir().unwrap();
  let db_path = dir.path().join("payroll.db");
  let conn = Connection::open(db_path).unwrap();

  initialize_schema(&conn).unwrap();
  conn.execute("PRAGMA foreign_keys = ON", []).unwrap();

  conn.execute(
    "INSERT INTO payroll_sheet (name, updated_at) VALUES (?1, ?2)",
    ("Sheet A", "2026-05-29T00:00:00Z"),
  ).unwrap();

  conn.execute(
    "INSERT INTO personnel (name, updated_at) VALUES (?1, ?2)",
    ("Alice", "2026-05-29T00:00:00Z"),
  ).unwrap();

  conn.execute(
    "INSERT INTO payroll_record (payroll_sheet_id, personnel_id, net_pay, updated_at) VALUES (?1, ?2, ?3, ?4)",
    (1_i64, 1_i64, 3000.0_f64, "2026-05-29T00:00:00Z"),
  ).unwrap();

  let duplicate = conn.execute(
    "INSERT INTO payroll_record (payroll_sheet_id, personnel_id, net_pay, updated_at) VALUES (?1, ?2, ?3, ?4)",
    (1_i64, 1_i64, 3200.0_f64, "2026-05-29T00:00:00Z"),
  );

  assert!(duplicate.is_err());
}
```

- [ ] **Step 4: Write a failing foreign key enforcement test**

Add this test:

```rust
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
```

- [ ] **Step 5: Run the targeted test set and verify behavior**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml schema_initialization_is_idempotent -- --exact
cargo test --manifest-path src-tauri/Cargo.toml rejects_duplicate_personnel_id_card_numbers -- --exact
cargo test --manifest-path src-tauri/Cargo.toml rejects_duplicate_personnel_per_payroll_sheet -- --exact
cargo test --manifest-path src-tauri/Cargo.toml rejects_payroll_record_without_existing_foreign_keys -- --exact
```

Expected: PASS with the current schema implementation. If any test fails, adjust only the schema or pragma setup required to satisfy the exact test.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/db.rs
git commit -m "test(db): cover sqlite schema constraints"
```

### Task 4: Add app data path resolution and database opening helpers

**Files:**
- Modify: `src-tauri/src/db.rs`
- Test: `src-tauri/src/db.rs`

- [ ] **Step 1: Write a failing path helper test**

Add a pure helper test that does not depend on a Tauri app handle:

```rust
#[test]
fn app_database_path_uses_payroll_db_filename() {
  let dir = tempdir().unwrap();
  let path = database_path_from_base_dir(dir.path());
  assert_eq!(path.file_name().and_then(|name| name.to_str()), Some("payroll.db"));
}
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml app_database_path_uses_payroll_db_filename -- --exact
```

Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Add the minimal path and connection helpers**

Extend `src-tauri/src/db.rs` with:

```rust
use std::fs;
use std::path::{Path, PathBuf};

pub fn database_path_from_base_dir(base_dir: &Path) -> PathBuf {
  base_dir.join("payroll.db")
}

pub fn open_connection_at_path(path: &Path) -> Result<Connection> {
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|error| {
      rusqlite::Error::ToSqlConversionFailure(Box::new(error))
    })?;
  }

  let conn = Connection::open(path)?;
  conn.execute("PRAGMA foreign_keys = ON", [])?;
  initialize_schema(&conn)?;
  Ok(conn)
}
```

- [ ] **Step 4: Run the path helper test**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml app_database_path_uses_payroll_db_filename -- --exact
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db.rs
git commit -m "feat(db): add sqlite path and connection helpers"
```

### Task 5: Integrate database initialization into Tauri startup

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/db.rs`
- Test: `src-tauri/src/db.rs`

- [ ] **Step 1: Write a failing rerun test against a file-backed database**

Add this test:

```rust
#[test]
fn reopening_existing_database_preserves_inserted_data() {
  let dir = tempdir().unwrap();
  let db_path = database_path_from_base_dir(dir.path());

  {
    let conn = open_connection_at_path(&db_path).unwrap();
    conn.execute(
      "INSERT INTO payroll_sheet (name, updated_at) VALUES (?1, ?2)",
      ("May Payroll", "2026-05-29T00:00:00Z"),
    ).unwrap();
  }

  {
    let conn = open_connection_at_path(&db_path).unwrap();
    let count: i64 = conn
      .query_row("SELECT COUNT(*) FROM payroll_sheet", [], |row| row.get(0))
      .unwrap();
    assert_eq!(count, 1);
  }
}
```

- [ ] **Step 2: Run the targeted test**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml reopening_existing_database_preserves_inserted_data -- --exact
```

Expected: PASS with the helper-based implementation. If it fails, fix only the file-backed initialization behavior.

- [ ] **Step 3: Add Tauri startup integration**

Update `src-tauri/src/lib.rs` to:

```rust
mod db;

use db::{database_path_from_base_dir, open_connection_at_path};

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
```

- [ ] **Step 4: Run full Rust tests and static verification**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/db.rs
git commit -m "feat(db): initialize sqlite on tauri startup"
```

### Task 6: Run full project verification

**Files:**
- No repo-tracked file changes required

- [ ] **Step 1: Run frontend TypeScript verification**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS

- [ ] **Step 2: Run frontend production build**

Run:

```bash
pnpm build
```

Expected: PASS

- [ ] **Step 3: Run final Rust verification**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: PASS

- [ ] **Step 4: Optionally run the desktop app**

Run:

```bash
pnpm tauri dev
```

Expected: the app launches successfully and startup does not error while initializing the local SQLite database.

- [ ] **Step 5: Commit**

```bash
git status -sb
```

Expected: clean working tree if all planned commits were created as written.
