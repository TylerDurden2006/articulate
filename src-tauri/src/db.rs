use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
    pub app_data_dir: PathBuf,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&app_data_dir).ok();
        let db_path = app_data_dir.join("articulate.db");
        let conn = Connection::open(&db_path).expect("Failed to open database");
        Self::init_schema(&conn);
        Database { conn: Mutex::new(conn), app_data_dir }
    }

    fn init_schema(conn: &Connection) {
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL UNIQUE,
                rank INTEGER NOT NULL,
                tier INTEGER NOT NULL DEFAULT 0,
                ease REAL NOT NULL DEFAULT 2.5,
                interval INTEGER NOT NULL DEFAULT 0,
                due_date TEXT,
                reviews INTEGER NOT NULL DEFAULT 0,
                lapses INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS word_senses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
                part_of_speech TEXT NOT NULL DEFAULT '',
                definition TEXT NOT NULL DEFAULT '',
                example_sentence TEXT NOT NULL DEFAULT '',
                register TEXT NOT NULL DEFAULT 'conversational'
            );

            CREATE TABLE IF NOT EXISTS review_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating IN (1,2,3,4)),
                tier_before INTEGER NOT NULL,
                tier_after INTEGER NOT NULL,
                elapsed_ms INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS confusion_pairs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word_id_1 INTEGER NOT NULL REFERENCES words(id),
                word_id_2 INTEGER NOT NULL REFERENCES words(id),
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_words_due ON words(due_date);
            CREATE INDEX IF NOT EXISTS idx_words_tier ON words(tier);
            CREATE INDEX IF NOT EXISTS idx_review_log_word ON review_log(word_id);
            CREATE INDEX IF NOT EXISTS idx_review_log_date ON review_log(created_at);
        ").expect("Failed to initialize schema");
    }

}
