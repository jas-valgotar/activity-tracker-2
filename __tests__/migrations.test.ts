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
});
