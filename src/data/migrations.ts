// Overview: Creates and upgrades the SQLite schema used by the activity tracker.

import type { DatabaseClient } from './database';
import { DEFAULT_SORT_MODE } from '../domain/sort';
import { DEFAULT_TARGET_DURATION_MINUTES } from '../domain/time';

// Applies idempotent schema creation and default settings for the app database.
export async function runMigrations(db: DatabaseClient): Promise<void> {
  await db.execute('PRAGMA foreign_keys = ON');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      target_duration_minutes INTEGER NOT NULL DEFAULT ${DEFAULT_TARGET_DURATION_MINUTES},
      completed_at INTEGER,
      last_accessed_at INTEGER NOT NULL,
      deleted_at INTEGER
    )
  `);
  await ensureActivityTargetDurationColumn(db);
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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_presets (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await db.execute(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    ['activity_sort_mode', DEFAULT_SORT_MODE],
  );
  await seedDefaultPresets(db);
}

// Adds the target duration to databases created before timed activities existed.
async function ensureActivityTargetDurationColumn(db: DatabaseClient): Promise<void> {
  const result = await db.execute('PRAGMA table_info(activities)');
  const hasTargetDuration = result.rows.some(row => row.name === 'target_duration_minutes');

  if (!hasTargetDuration) {
    await db.execute(
      `ALTER TABLE activities ADD COLUMN target_duration_minutes INTEGER NOT NULL DEFAULT ${DEFAULT_TARGET_DURATION_MINUTES}`,
    );
  }
}

// Seeds editable examples once so the Daily screen is immediately useful on a new install.
async function seedDefaultPresets(db: DatabaseClient): Promise<void> {
  const seededResult = await db.execute('SELECT value FROM settings WHERE key = ?', ['daily_presets_seeded']);
  if (seededResult.rows[0]?.value === 'true') {
    return;
  }

  const now = Date.now();
  await db.executeBatch([
    [
      'INSERT OR IGNORE INTO activity_presets (id, title, duration_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['preset-meditation', 'Meditation', 30, now, now],
    ],
    [
      'INSERT OR IGNORE INTO activity_presets (id, title, duration_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['preset-deep-work', 'Deep Work', 60, now, now],
    ],
    [
      'INSERT OR IGNORE INTO activity_presets (id, title, duration_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['preset-reading', 'Reading', 30, now, now],
    ],
    ['INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['daily_presets_seeded', 'true']],
  ]);
}
