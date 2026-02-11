import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "..", "data", "tasks.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    status TEXT,
    priority TEXT,
    due TEXT,
    assignee TEXT,
    project TEXT,
    progress INTEGER,
    tags TEXT,
    repeat TEXT,
    notify INTEGER,
    last_notified TEXT,
    reminder_time TEXT,
    created_at TEXT,
    completed_at TEXT,
    checklist TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    tags TEXT,
    color TEXT,
    created_at TEXT,
    order_index INTEGER
  );
`);

const columns = db.prepare("PRAGMA table_info(tasks)").all().map((c) => c.name);
if (!columns.includes("notify")) {
  db.exec("ALTER TABLE tasks ADD COLUMN notify INTEGER");
}
if (!columns.includes("last_notified")) {
  db.exec("ALTER TABLE tasks ADD COLUMN last_notified TEXT");
}
if (!columns.includes("reminder_time")) {
  db.exec("ALTER TABLE tasks ADD COLUMN reminder_time TEXT");
}
if (!columns.includes("created_at")) {
  db.exec("ALTER TABLE tasks ADD COLUMN created_at TEXT");
}
if (!columns.includes("completed_at")) {
  db.exec("ALTER TABLE tasks ADD COLUMN completed_at TEXT");
}
if (!columns.includes("checklist")) {
  db.exec("ALTER TABLE tasks ADD COLUMN checklist TEXT");
}

const noteColumns = db
  .prepare("PRAGMA table_info(notes)")
  .all()
  .map((c) => c.name);
if (!noteColumns.includes("order_index")) {
  db.exec("ALTER TABLE notes ADD COLUMN order_index INTEGER");
}

export default db;
