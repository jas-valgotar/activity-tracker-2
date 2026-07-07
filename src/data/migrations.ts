// Overview: Creates and upgrades the SQLite schema used by the activity tracker.

import type { DatabaseClient } from './database';
import { DEFAULT_SORT_MODE } from '../domain/sort';

// Applies idempotent schema creation and default settings for the app database.
export async function runMigrations(db: DatabaseClient): Promise<void> {
  await db.execute('PRAGMA foreign_keys = ON');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      last_accessed_at INTEGER NOT NULL,
      deleted_at INTEGER
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY NOT NULL,
      activity_id TEXT NOT NULL,
      type TEXT NOT NULL,
      occurred_at INTEGER NOT NULL,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )
  `);
  await db.execute(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    ['activity_sort_mode', DEFAULT_SORT_MODE],
  );
}
