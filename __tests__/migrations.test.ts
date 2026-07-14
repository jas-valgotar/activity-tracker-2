// Overview: Verifies schema upgrades preserve existing data and seed only startable Home routines.

import { runMigrations } from '../src/data/migrations';
import { createSqliteTestClient } from '../test-utils/sqliteTestClient';

describe('database migrations', () => {
  it('adds the default target duration to an existing activity table', async () => {
    const db = await createSqliteTestClient();
    await db.execute(`
      CREATE TABLE activities (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        last_accessed_at INTEGER NOT NULL,
        deleted_at INTEGER
      )
    `);
    await db.execute(
      'INSERT INTO activities (id, title, status, started_at, completed_at, last_accessed_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['legacy-1', 'Legacy activity', 'completed', 1, 2, 2, null],
    );

    await runMigrations(db);

    const activity = await db.execute('SELECT target_duration_minutes FROM activities WHERE id = ?', ['legacy-1']);
    expect(activity.rows[0]?.target_duration_minutes).toBe(60);

    const presets = await db.execute('SELECT COUNT(*) AS count FROM activity_presets');
    expect(presets.rows[0]?.count).toBe(3);
  });

  it('normalizes legacy duplicate active activities before enforcing the unique guard', async () => {
    const db = await createSqliteTestClient();
    await db.execute(`
      CREATE TABLE activities (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        last_accessed_at INTEGER NOT NULL,
        deleted_at INTEGER
      )
    `);
    await db.execute(
      'INSERT INTO activities (id, title, status, started_at, completed_at, last_accessed_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['older-active', 'Older active', 'active', 1, null, 1, null],
    );
    await db.execute(
      'INSERT INTO activities (id, title, status, started_at, completed_at, last_accessed_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['newer-active', 'Newer active', 'active', 2, null, 2, null],
    );

    await runMigrations(db);

    const activeRows = await db.execute("SELECT id FROM activities WHERE status = 'active' AND deleted_at IS NULL");
    const pausedRows = await db.execute("SELECT id FROM activities WHERE status = 'paused' AND deleted_at IS NULL");
    expect(activeRows.rows.map(row => row.id)).toEqual(['newer-active']);
    expect(pausedRows.rows.map(row => row.id)).toEqual(['older-active']);
  });

  it('adds optional reminder times to an existing preset table', async () => {
    const db = await createSqliteTestClient();
    await db.execute(`
      CREATE TABLE activity_presets (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    await runMigrations(db);

    const columns = await db.execute('PRAGMA table_info(activity_presets)');
    expect(columns.rows.some(row => row.name === 'reminder_time_minutes')).toBe(true);
  });

  it('adds current built-ins without deleting legacy or customized routines', async () => {
    const db = await createSqliteTestClient();
    await runMigrations(db);
    await db.execute('DELETE FROM settings WHERE key = ?', ['home_routines_v1_seeded']);
    await db.execute('DELETE FROM activity_presets');
    await db.executeBatch([
      [
        'INSERT INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['preset-meditation', 'Changed meditation', 45, null, 1, 1],
      ],
      [
        'INSERT INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['preset-deep-work', 'Deep Work', 60, null, 1, 1],
      ],
      [
        'INSERT INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['preset-reading', 'Long Reading', 30, null, 1, 1],
      ],
      [
        'INSERT INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['custom-routine', 'Stretch', 20, 8 * 60, 1, 1],
      ],
    ]);

    await runMigrations(db);

    const routines = await db.execute('SELECT id, title, duration_minutes, reminder_time_minutes FROM activity_presets ORDER BY id ASC');
    expect(routines.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'preset-walk', title: 'Walk', duration_minutes: 15, reminder_time_minutes: null }),
      expect.objectContaining({ id: 'preset-reading', title: 'Long Reading', duration_minutes: 30, reminder_time_minutes: null }),
      expect.objectContaining({ id: 'preset-play', title: 'Play', duration_minutes: 15, reminder_time_minutes: null }),
      expect.objectContaining({ id: 'custom-routine', title: 'Stretch', duration_minutes: 20, reminder_time_minutes: 8 * 60 }),
    ]));
    expect(routines.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'preset-meditation', title: 'Changed meditation', duration_minutes: 45 }),
      expect.objectContaining({ id: 'preset-deep-work', title: 'Deep Work', duration_minutes: 60 }),
    ]));
  });

  it('repairs routines created by historical builds with durations below the supported minimum', async () => {
    const db = await createSqliteTestClient();
    await runMigrations(db);
    await db.execute('DELETE FROM settings WHERE key = ?', ['preset_minimum_duration_v2']);
    await db.execute('UPDATE activity_presets SET duration_minutes = ? WHERE id IN (?, ?)', [10, 'preset-reading', 'preset-play']);

    await runMigrations(db);

    const routines = await db.execute('SELECT id, duration_minutes FROM activity_presets WHERE id IN (?, ?)', ['preset-reading', 'preset-play']);
    expect(routines.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'preset-reading', duration_minutes: 15 }),
      expect.objectContaining({ id: 'preset-play', duration_minutes: 15 }),
    ]));
  });
});
