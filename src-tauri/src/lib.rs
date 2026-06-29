mod db;
mod definitions;

use db::Database;
use rusqlite::params;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize)]
pub struct Word {
    id: i64,
    word: String,
    rank: i64,
    tier: i64,
    due_date: Option<String>,
}

#[derive(Serialize)]
pub struct WordDetail {
    id: i64,
    word: String,
    rank: i64,
    tier: i64,
    ease: f64,
    interval: i64,
    reviews: i64,
    lapses: i64,
    senses: Vec<WordSense>,
}

#[derive(Serialize)]
pub struct WordSense {
    id: i64,
    part_of_speech: String,
    definition: String,
    example_sentence: String,
    register: String,
}

#[derive(Serialize)]
pub struct DashboardStats {
    total_words: i64,
    due_today: i64,
    mastered: i64,
    learning: i64,
    weak: i64,
    streak: i64,
}

#[derive(Serialize)]
pub struct WeakWord {
    id: i64,
    word: String,
    tier: i64,
    lapses: i64,
    accuracy: f64,
}

#[tauri::command]
fn get_due_words(db: tauri::State<Database>, count: i64) -> Result<Vec<Word>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let mut stmt = conn.prepare(
        "SELECT id, word, rank, tier, due_date FROM words 
         WHERE (due_date IS NULL OR due_date <= ?1) AND tier < 4 
         ORDER BY due_date ASC, rank ASC LIMIT ?2"
    ).map_err(|e| e.to_string())?;
    let words = stmt.query_map(params![today, count], |row| {
        Ok(Word {
            id: row.get(0)?,
            word: row.get(1)?,
            rank: row.get(2)?,
            tier: row.get(3)?,
            due_date: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(words)
}

#[tauri::command]
fn get_word_detail(db: tauri::State<Database>, word_id: i64) -> Result<WordDetail, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let word = conn.query_row(
        "SELECT id, word, rank, tier, ease, interval, reviews, lapses FROM words WHERE id = ?1",
        params![word_id],
        |row| {
            Ok(WordDetail {
                id: row.get(0)?,
                word: row.get(1)?,
                rank: row.get(2)?,
                tier: row.get(3)?,
                ease: row.get(4)?,
                interval: row.get(5)?,
                reviews: row.get(6)?,
                lapses: row.get(7)?,
                senses: Vec::new(),
            })
        }
    ).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, part_of_speech, definition, example_sentence, register FROM word_senses WHERE word_id = ?1"
    ).map_err(|e| e.to_string())?;
    let senses = stmt.query_map(params![word_id], |row| {
        Ok(WordSense {
            id: row.get(0)?,
            part_of_speech: row.get(1)?,
            definition: row.get(2)?,
            example_sentence: row.get(3)?,
            register: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(WordDetail { senses, ..word })
}

#[tauri::command]
fn search_words(db: tauri::State<Database>, query: String) -> Result<Vec<Word>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT id, word, rank, tier, due_date FROM words WHERE word LIKE ?1 ORDER BY rank ASC LIMIT 50"
    ).map_err(|e| e.to_string())?;
    let words = stmt.query_map(params![pattern], |row| {
        Ok(Word {
            id: row.get(0)?,
            word: row.get(1)?,
            rank: row.get(2)?,
            tier: row.get(3)?,
            due_date: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(words)
}

#[tauri::command]
fn record_review(db: tauri::State<Database>, word_id: i64, rating: i64, elapsed_ms: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let (tier, ease, interval, reviews): (i64, f64, i64, i64) = conn.query_row(
        "SELECT tier, ease, interval, reviews FROM words WHERE id = ?1",
        params![word_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|e| e.to_string())?;

    let (new_tier, new_ease, new_interval, new_reviews) = sm2_step(tier, ease, interval, reviews, rating);

    let due_date = if new_tier >= 4 {
        None
    } else {
        let days = if new_tier == 1 { 1 } else { new_interval.max(1) };
        let due = chrono::Utc::now() + chrono::Duration::days(days);
        Some(due.format("%Y-%m-%d").to_string())
    };

    conn.execute(
        "UPDATE words SET tier = ?1, ease = ?2, interval = ?3, reviews = ?4, lapses = CASE WHEN ?5 = 1 THEN lapses + 1 ELSE lapses END, due_date = ?6 WHERE id = ?7",
        params![new_tier, new_ease, new_interval, new_reviews, rating, due_date, word_id],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO review_log (word_id, rating, tier_before, tier_after, elapsed_ms) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![word_id, rating, tier, new_tier, elapsed_ms],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

fn sm2_step(tier: i64, ease: f64, interval: i64, reviews: i64, rating: i64) -> (i64, f64, i64, i64) {
    let new_reviews = reviews + 1;
    match rating {
        1 => {
            if tier > 1 && tier < 4 {
                (tier - 1, ease.max(1.3), 0, new_reviews)
            } else {
                (0.max(tier - 1), ease.max(1.3), 0, new_reviews)
            }
        }
        2 => {
            let new_ease = (ease - 0.15).max(1.3);
            let new_interval = if tier <= 1 { 1 } else { (interval as f64 * new_ease * 1.2) as i64 };
            (tier.min(2), new_ease, new_interval, new_reviews)
        }
        3 => {
            let new_tier = (tier + 1).min(4);
            let new_ease = (ease + 0.15).min(3.0);
            let new_interval = match tier {
                0 => 1,
                1 => 3,
                _ => (interval as f64 * new_ease) as i64,
            };
            (new_tier, new_ease, new_interval, new_reviews)
        }
        4 => {
            let new_tier = (tier + 2).min(4);
            let new_ease = (ease + 0.3).min(3.0);
            let new_interval = match tier {
                0 => 2,
                1 => 7,
                _ => (interval as f64 * new_ease * 1.3) as i64,
            };
            (new_tier, new_ease, new_interval, new_reviews)
        }
        _ => (tier, ease, interval, new_reviews),
    }
}

#[tauri::command]
fn get_stats(db: tauri::State<Database>) -> Result<DashboardStats, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let total_words: i64 = conn.query_row("SELECT COUNT(*) FROM words", [], |r| r.get(0)).unwrap_or(0);
    let due_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM words WHERE (due_date IS NULL OR due_date <= ?1) AND tier < 4",
        params![today],
        |r| r.get(0),
    ).unwrap_or(0);
    let mastered: i64 = conn.query_row("SELECT COUNT(*) FROM words WHERE tier >= 4", [], |r| r.get(0)).unwrap_or(0);
    let learning: i64 = conn.query_row("SELECT COUNT(*) FROM words WHERE tier > 0 AND tier < 4", [], |r| r.get(0)).unwrap_or(0);
    let weak: i64 = conn.query_row("SELECT COUNT(*) FROM words WHERE lapses > 3", [], |r| r.get(0)).unwrap_or(0);

    let streak = calculate_streak(&*conn);

    Ok(DashboardStats {
        total_words,
        due_today,
        mastered,
        learning,
        weak,
        streak,
    })
}

fn calculate_streak(conn: &rusqlite::Connection) -> i64 {
    let mut stmt = match conn.prepare(
        "SELECT DISTINCT DATE(created_at) AS d FROM review_log ORDER BY d DESC"
    ) {
        Ok(s) => s,
        Err(_) => return 0,
    };
    let dates: Vec<String> = match stmt.query_map([], |r| r.get(0)) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(_) => return 0,
    };

    if dates.is_empty() {
        return 0;
    }

    let today = chrono::Utc::now().date_naive();
    let yesterday = today - chrono::Duration::days(1);

    let first = match chrono::NaiveDate::parse_from_str(&dates[0], "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => return 0,
    };

    if first != today && first != yesterday {
        return 0;
    }

    let mut streak = 1i64;
    for i in 1..dates.len() {
        let prev = match chrono::NaiveDate::parse_from_str(&dates[i-1], "%Y-%m-%d") {
            Ok(d) => d,
            Err(_) => break,
        };
        let curr = match chrono::NaiveDate::parse_from_str(&dates[i], "%Y-%m-%d") {
            Ok(d) => d,
            Err(_) => break,
        };
        match prev.signed_duration_since(curr).num_days() {
            1 => streak += 1,
            _ => break,
        }
    }
    streak
}

#[tauri::command]
fn get_weak_words(db: tauri::State<Database>) -> Result<Vec<WeakWord>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT w.id, w.word, w.tier, w.lapses, 
            ROUND(100.0 * SUM(CASE WHEN r.rating >= 3 THEN 1 ELSE 0 END) / COUNT(r.id), 1) as accuracy
         FROM words w 
         LEFT JOIN review_log r ON r.word_id = w.id
         WHERE w.lapses > 0 OR (w.tier > 0 AND w.tier < 4)
         GROUP BY w.id
         ORDER BY accuracy ASC, w.lapses DESC
         LIMIT 20"
    ).map_err(|e| e.to_string())?;
    let words = stmt.query_map([], |row| {
        Ok(WeakWord {
            id: row.get(0)?,
            word: row.get(1)?,
            tier: row.get(2)?,
            lapses: row.get(3)?,
            accuracy: row.get::<_, f64>(4).unwrap_or(0.0),
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(words)
}

#[tauri::command]
fn seed_word_list(db: tauri::State<Database>) -> Result<i64, String> {
    let word_list = include_str!("../../top_5000_english_words.txt");
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut count = 0i64;
    for (i, line) in word_list.lines().enumerate() {
        let word = line.trim().to_lowercase();
        if word.is_empty() { continue; }
        let result = conn.execute(
            "INSERT OR IGNORE INTO words (word, rank) VALUES (?1, ?2)",
            params![word, (i + 1) as i64],
        );
        if let Ok(rows) = result { count += rows as i64; }
    }
    Ok(count)
}

#[tauri::command]
fn seed_word_senses(db: tauri::State<Database>) -> Result<i64, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let defs = definitions::sample_definitions();
    let mut count = 0i64;
    for def in defs.iter() {
        let word_id: Option<i64> = conn.query_row(
            "SELECT id FROM words WHERE word = ?1",
            params![def.word],
            |row| row.get(0),
        ).ok();
        if let Some(wid) = word_id {
            let result = conn.execute(
                "INSERT OR IGNORE INTO word_senses (word_id, part_of_speech, definition, example_sentence, register) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![wid, def.part_of_speech, def.definition, def.example, def.register],
            );
            if let Ok(rows) = result { count += rows as i64; }
        }
    }
    Ok(count)
}

#[tauri::command]
fn add_confusion_pair(db: tauri::State<Database>, word_id_1: i64, word_id_2: i64, notes: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO confusion_pairs (word_id_1, word_id_2, notes) VALUES (?1, ?2, ?3)",
        params![word_id_1, word_id_2, notes],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct BackupInfo {
    filename: String,
    size_bytes: i64,
    created_at: String,
}

#[tauri::command]
fn backup_database(db: tauri::State<Database>) -> Result<BackupInfo, String> {
    let backups_dir = db.app_data_dir.join("backups");
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().format("%Y-%m-%d_%H%M%S");
    let filename = format!("articulate_{}.db", now);
    let dest = backups_dir.join(&filename);

    let db_path = db.app_data_dir.join("articulate.db");
    fs::copy(&db_path, &dest).map_err(|e| format!("Backup failed: {}", e))?;

    let metadata = fs::metadata(&dest).map_err(|e| e.to_string())?;

    // Prune old backups, keep last 10
    let mut entries: Vec<PathBuf> = fs::read_dir(&backups_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("db"))
        .collect();
    entries.sort();
    if entries.len() > 10 {
        for old in entries.iter().take(entries.len() - 10) {
            fs::remove_file(old).ok();
        }
    }

    Ok(BackupInfo {
        filename,
        size_bytes: metadata.len() as i64,
        created_at: now.to_string(),
    })
}

#[tauri::command]
fn get_backups(db: tauri::State<Database>) -> Result<Vec<BackupInfo>, String> {
    let backups_dir = db.app_data_dir.join("backups");
    if !backups_dir.exists() {
        return Ok(Vec::new());
    }
    let mut backups: Vec<BackupInfo> = fs::read_dir(&backups_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("db"))
        .filter_map(|e| {
            let metadata = e.metadata().ok()?;
            let created = metadata.created().ok()?;
            let datetime: chrono::DateTime<chrono::Utc> = created.into();
            Some(BackupInfo {
                filename: e.file_name().to_string_lossy().to_string(),
                size_bytes: metadata.len() as i64,
                created_at: datetime.format("%Y-%m-%d %H:%M:%S").to_string(),
            })
        })
        .collect();
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
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
            let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            let db = Database::new(app_dir.clone());
            // Auto-backup on launch
            {
                let backups_dir = app_dir.join("backups");
                fs::create_dir_all(&backups_dir).ok();
                let now = chrono::Utc::now().format("%Y-%m-%d_%H%M%S");
                let dest = backups_dir.join(format!("articulate_{}.db", now));
                let db_path = app_dir.join("articulate.db");
                if db_path.exists() {
                    fs::copy(&db_path, &dest).ok();
                    // Prune old backups, keep last 10
                    if let Ok(mut entries) = fs::read_dir(&backups_dir)
                        .map(|d| d.filter_map(|e| e.ok()).map(|e| e.path()).filter(|p| p.extension().and_then(|s| s.to_str()) == Some("db")).collect::<Vec<_>>())
                    {
                        entries.sort();
                        if entries.len() > 10 {
                            for old in entries.iter().take(entries.len() - 10) {
                                fs::remove_file(old).ok();
                            }
                        }
                    }
                }
            }
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_due_words,
            get_word_detail,
            search_words,
            record_review,
            get_stats,
            get_weak_words,
            seed_word_list,
            seed_word_senses,
            add_confusion_pair,
            backup_database,
            get_backups,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
