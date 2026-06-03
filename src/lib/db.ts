import fs from "fs";
import Database from "better-sqlite3";
import { config } from "./config";

let _db: Database.Database | null = null;

/**
 * Returns a singleton SQLite connection, creating the schema on first use.
 * The DB file and files directory live under DATA_DIR.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.filesDir, { recursive: true });

  const db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id      TEXT NOT NULL UNIQUE,
      original_name  TEXT NOT NULL,
      stored_name    TEXT NOT NULL,
      mime_type      TEXT NOT NULL DEFAULT 'application/octet-stream',
      ext            TEXT NOT NULL DEFAULT '',
      size           INTEGER NOT NULL DEFAULT 0,
      source         TEXT NOT NULL DEFAULT 'upload',
      sender_email   TEXT,
      subject        TEXT,
      status         TEXT NOT NULL DEFAULT 'pending',
      error          TEXT,
      ocr_text       TEXT,
      summary        TEXT,
      classification TEXT,
      amount         REAL,
      currency       TEXT,
      vendor         TEXT,
      doc_date       TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at   TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_classification ON documents(classification);
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

    -- Full-text search index over the human-meaningful fields.
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      original_name,
      vendor,
      classification,
      summary,
      ocr_text,
      content='documents',
      content_rowid='id'
    );

    -- Keep the FTS index in sync with the documents table via triggers.
    CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(rowid, original_name, vendor, classification, summary, ocr_text)
      VALUES (new.id, new.original_name, new.vendor, new.classification, new.summary, new.ocr_text);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, original_name, vendor, classification, summary, ocr_text)
      VALUES ('delete', old.id, old.original_name, old.vendor, old.classification, old.summary, old.ocr_text);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, original_name, vendor, classification, summary, ocr_text)
      VALUES ('delete', old.id, old.original_name, old.vendor, old.classification, old.summary, old.ocr_text);
      INSERT INTO documents_fts(rowid, original_name, vendor, classification, summary, ocr_text)
      VALUES (new.id, new.original_name, new.vendor, new.classification, new.summary, new.ocr_text);
    END;
  `);

  _db = db;
  return db;
}
