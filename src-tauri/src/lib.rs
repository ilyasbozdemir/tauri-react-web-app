use std::sync::Mutex;
use rusqlite::Connection;
use serde_json::{Map, Value};
use rusqlite::types::ValueRef;

pub struct DbState(pub Mutex<Option<(Connection, String)>>);

fn json_to_sqlite(val: &Value) -> rusqlite::types::Value {
    match val {
        Value::Null => rusqlite::types::Value::Null,
        Value::Bool(b) => rusqlite::types::Value::Integer(*b as i64),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                rusqlite::types::Value::Integer(i)
            } else if let Some(f) = n.as_f64() {
                rusqlite::types::Value::Real(f)
            } else {
                rusqlite::types::Value::Null
            }
        }
        Value::String(s) => rusqlite::types::Value::Text(s.clone()),
        Value::Array(_) | Value::Object(_) => {
            rusqlite::types::Value::Text(val.to_string())
        }
    }
}

fn row_to_json(row: &rusqlite::Row) -> rusqlite::Result<Value> {
    let mut map = Map::new();
    for i in 0..row.column_count() {
        let name = row.column_name(i)?;
        let val = match row.get_ref(i)? {
            ValueRef::Null => Value::Null,
            ValueRef::Integer(n) => Value::Number(n.into()),
            ValueRef::Real(f) => {
                if let Some(num) = serde_json::Number::from_f64(f) {
                    Value::Number(num)
                } else {
                    Value::Null
                }
            }
            ValueRef::Text(s) => Value::String(String::from_utf8_lossy(s).into_owned()),
            ValueRef::Blob(b) => {
                let bytes: Vec<Value> = b.iter().map(|&byte| Value::Number(byte.into())).collect();
                Value::Array(bytes)
            }
        };
        map.insert(name.to_string(), val);
    }
    Ok(Value::Object(map))
}

const MIGRATIONS: &str = "
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    purchase_price REAL DEFAULT 0.0,
    sale_price REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personnel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    source_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    target_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    quantity REAL NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    personnel_id INTEGER REFERENCES personnel(id) ON DELETE SET NULL,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP
);
";

fn initialize_db(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(MIGRATIONS)
        .map_err(|e| format!("Migration error: {}", e))
}

#[tauri::command]
fn select_and_open_db(state: tauri::State<'_, DbState>) -> Result<Option<String>, String> {
    let file_path = rfd::FileDialog::new()
        .add_filter("Stok Veritabanı (.stkdb)", &["stkdb"])
        .pick_file();

    if let Some(path) = file_path {
        let path_str = path.to_string_lossy().to_string();
        let mut conn = Connection::open(&path)
            .map_err(|e| format!("Could not open database: {}", e))?;
        
        initialize_db(&mut conn)?;

        let mut db_guard = state.0.lock().unwrap();
        *db_guard = Some((conn, path_str.clone()));

        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn create_new_db(state: tauri::State<'_, DbState>) -> Result<Option<String>, String> {
    let file_path = rfd::FileDialog::new()
        .add_filter("Stok Veritabanı (.stkdb)", &["stkdb"])
        .set_file_name("stok.stkdb")
        .save_file();

    if let Some(path) = file_path {
        let path_str = path.to_string_lossy().to_string();
        let mut conn = Connection::open(&path)
            .map_err(|e| format!("Could not create database: {}", e))?;
        
        initialize_db(&mut conn)?;

        let mut db_guard = state.0.lock().unwrap();
        *db_guard = Some((conn, path_str.clone()));

        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn open_db_by_path(state: tauri::State<'_, DbState>, path: String) -> Result<bool, String> {
    let mut conn = Connection::open(&path)
        .map_err(|e| format!("Could not open database by path: {}", e))?;
    
    initialize_db(&mut conn)?;

    let mut db_guard = state.0.lock().unwrap();
    *db_guard = Some((conn, path.clone()));

    Ok(true)
}

#[tauri::command]
fn close_current_db(state: tauri::State<'_, DbState>) -> Result<bool, String> {
    let mut db_guard = state.0.lock().unwrap();
    *db_guard = None;
    Ok(true)
}

#[tauri::command]
fn get_current_db_path(state: tauri::State<'_, DbState>) -> Result<Option<String>, String> {
    let db_guard = state.0.lock().unwrap();
    if let Some((_, path)) = &*db_guard {
        Ok(Some(path.clone()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn execute_sql(
    state: tauri::State<'_, DbState>,
    sql: String,
    params: Vec<Value>,
) -> Result<Value, String> {
    let db_guard = state.0.lock().unwrap();
    if let Some((conn, _)) = &*db_guard {
        let sqlite_params: Vec<rusqlite::types::Value> = params.iter().map(json_to_sqlite).collect();
        let params_ref: Vec<&dyn rusqlite::types::ToSql> = sqlite_params
            .iter()
            .map(|v| v as &dyn rusqlite::types::ToSql)
            .collect();

        let rows_affected = conn
            .execute(&sql, params_ref.as_slice())
            .map_err(|e| format!("Execute error: {}", e))?;

        let last_insert_id = conn.last_insert_rowid();

        let mut res = Map::new();
        res.insert("rows_affected".to_string(), Value::Number(rows_affected.into()));
        res.insert("last_insert_id".to_string(), Value::Number(last_insert_id.into()));

        Ok(Value::Object(res))
    } else {
        Err("No database is open".to_string())
    }
}

#[tauri::command]
fn query_sql(
    state: tauri::State<'_, DbState>,
    sql: String,
    params: Vec<Value>,
) -> Result<Vec<Value>, String> {
    let db_guard = state.0.lock().unwrap();
    if let Some((conn, _)) = &*db_guard {
        let sqlite_params: Vec<rusqlite::types::Value> = params.iter().map(json_to_sqlite).collect();
        let params_ref: Vec<&dyn rusqlite::types::ToSql> = sqlite_params
            .iter()
            .map(|v| v as &dyn rusqlite::types::ToSql)
            .collect();

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("Prepare error: {}", e))?;

        let rows = stmt
            .query_map(params_ref.as_slice(), |row| row_to_json(row))
            .map_err(|e| format!("Query error: {}", e))?;

        let mut results = Vec::new();
        for row_result in rows {
            let row_val = row_result.map_err(|e| format!("Row serialization error: {}", e))?;
            results.push(row_val);
        }

        Ok(results)
    } else {
        Err("No database is open".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            select_and_open_db,
            create_new_db,
            open_db_by_path,
            close_current_db,
            get_current_db_path,
            execute_sql,
            query_sql
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
