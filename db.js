import Database from 'better-sqlite3';

const db = new Database('bot.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' | 'assistant'
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Bot is active by default
const activeRow = db.prepare(`SELECT value FROM settings WHERE key = 'bot_active'`).get();
if (!activeRow) {
  db.prepare(`INSERT INTO settings (key, value) VALUES ('bot_active', '1')`).run();
}

export function getHistory(phone, limit = 30) {
  const rows = db.prepare(
    `SELECT role, content FROM messages WHERE phone = ? ORDER BY id DESC LIMIT ?`
  ).all(phone, limit);
  return rows.reverse();
}

export function saveMessage(phone, role, content) {
  db.prepare(`INSERT INTO messages (phone, role, content) VALUES (?, ?, ?)`).run(phone, role, content);
}

export function isBotActive() {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'bot_active'`).get();
  return row ? row.value === '1' : true;
}

export function setBotActive(active) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('bot_active', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(active ? '1' : '0');
}

export default db;
