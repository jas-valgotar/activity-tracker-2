// Overview: Verifies schema upgrades preserve existing activities and seed daily presets safely.

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
});
