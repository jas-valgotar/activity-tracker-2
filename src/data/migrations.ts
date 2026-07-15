// Overview: Creates and upgrades the SQLite schema while preserving routine data and valid timer durations.

import type { DatabaseClient } from './database';
import { ACTIVITY_COLOR_KEYS } from '../domain/activityColor';
import { DEFAULT_SORT_MODE } from '../domain/sort';
import { DEFAULT_TARGET_DURATION_MINUTES } from '../domain/time';

// Applies idempotent schema creation and default settings for the app database.
export async function runMigrations(db: DatabaseClient): Promise<void> {
  await db.execute('PRAGMA foreign_keys = ON');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY NOT NULL,
      color_key INTEGER NOT NULL DEFAULT 0,
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
  await ensureActivityColorKeyColumn(db);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY NOT NULL,
      activity_id TEXT NOT NULL,
      type TEXT NOT NULL,
      occurred_at INTEGER NOT NULL,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    )
  `);
  await normalizeActiveActivities(db);
  await db.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS one_active_activity ON activities (status) WHERE status = \'active\' AND deleted_at IS NULL',
  );
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
      reminder_time_minutes INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await ensurePresetReminderColumn(db);
  await db.execute(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    ['activity_sort_mode', DEFAULT_SORT_MODE],
  );
  await seedDefaultPresets(db);
  await upgradeLegacyDefaultPresets(db);
  await normalizeLegacyPresetDurations(db);
}

// Preserves the most recently accessed active activity and pauses older duplicates before enforcing the unique index.
async function normalizeActiveActivities(db: DatabaseClient): Promise<void> {
  const result = await db.execute(
    `SELECT id
     FROM activities
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY last_accessed_at DESC, started_at DESC`,
  );
  const duplicateRows = result.rows.slice(1);

  if (duplicateRows.length === 0) {
    return;
  }

  const now = Date.now();
  const commands = duplicateRows.flatMap(row => [
    ['UPDATE activities SET status = ?, last_accessed_at = ? WHERE id = ?', ['paused', now, row.id]],
    [
      'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
      [createMigrationId(), row.id, 'paused', now],
    ],
  ]);

  await db.executeBatch(commands as Array<[string, Array<string | number | null>]>);
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

// Adds durable color keys and distributes legacy goals in creation order before the UI reads them.
async function ensureActivityColorKeyColumn(db: DatabaseClient): Promise<void> {
  const result = await db.execute('PRAGMA table_info(activities)');
  if (result.rows.some(row => row.name === 'color_key')) {
    return;
  }

  await db.execute('ALTER TABLE activities ADD COLUMN color_key INTEGER NOT NULL DEFAULT 0');
  const activities = await db.execute('SELECT id FROM activities ORDER BY started_at ASC, id ASC');
  const commands = activities.rows.map((row, index) => [
    'UPDATE activities SET color_key = ? WHERE id = ?',
    [ACTIVITY_COLOR_KEYS[index % ACTIVITY_COLOR_KEYS.length], row.id],
  ] as [string, Array<string | number | null>]);
  if (commands.length > 0) {
    await db.executeBatch(commands);
  }
}

// Seeds the editable routines shown on a fresh Home screen.
async function seedDefaultPresets(db: DatabaseClient): Promise<void> {
  const seededResult = await db.execute('SELECT value FROM settings WHERE key = ?', ['daily_presets_seeded']);
  if (seededResult.rows[0]?.value === 'true') {
    return;
  }

  const now = Date.now();
  await db.executeBatch([
    [
      'INSERT OR IGNORE INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['preset-walk', 'Walk', 15, null, now, now],
    ],
    [
      'INSERT OR IGNORE INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['preset-reading', 'Reading', 15, null, now, now],
    ],
    [
      'INSERT OR IGNORE INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['preset-play', 'Play', 15, null, now, now],
    ],
    ['INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['daily_presets_seeded', 'true']],
  ]);
}

// Adds current built-in routines once without deleting or overwriting a user's existing routines.
async function upgradeLegacyDefaultPresets(db: DatabaseClient): Promise<void> {
  const upgradeResult = await db.execute('SELECT value FROM settings WHERE key = ?', ['home_routines_v1_seeded']);
  if (upgradeResult.rows[0]?.value === 'true') {
    return;
  }

  const now = Date.now();
  await db.executeBatch([
    [
      'INSERT OR IGNORE INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['preset-walk', 'Walk', 15, null, now, now],
    ],
    [
      'INSERT OR IGNORE INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['preset-reading', 'Reading', 15, null, now, now],
    ],
    [
      'INSERT OR IGNORE INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['preset-play', 'Play', 15, null, now, now],
    ],
    ['INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['home_routines_v1_seeded', 'true']],
  ]);
}

// Raises durations from historical builds to the current minimum so every routine can be started.
async function normalizeLegacyPresetDurations(db: DatabaseClient): Promise<void> {
  const migrationKey = 'preset_minimum_duration_v2';
  const migrationResult = await db.execute('SELECT value FROM settings WHERE key = ?', [migrationKey]);
  if (migrationResult.rows[0]?.value === 'true') {
    return;
  }

  const now = Date.now();
  await db.executeBatch([
    [
      'UPDATE activity_presets SET duration_minutes = ?, updated_at = ? WHERE duration_minutes < ?',
      [15, now, 15],
    ],
    ['INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [migrationKey, 'true']],
  ]);
}

// Adds reminder time support to preset tables created before daily reminders existed.
async function ensurePresetReminderColumn(db: DatabaseClient): Promise<void> {
  const result = await db.execute('PRAGMA table_info(activity_presets)');
  if (!result.rows.some(row => row.name === 'reminder_time_minutes')) {
    await db.execute('ALTER TABLE activity_presets ADD COLUMN reminder_time_minutes INTEGER');
  }
}

// Creates a migration-local event ID without adding another dependency.
function createMigrationId(): string {
  return `migration-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
