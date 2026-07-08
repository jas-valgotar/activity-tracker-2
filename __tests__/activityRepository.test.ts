// Overview: Tests activity repository lifecycle behavior against an in-memory SQLite database.

import { createActivityRepository } from '../src/data/activityRepository';
import { runMigrations } from '../src/data/migrations';
import { createSettingsRepository } from '../src/data/settingsRepository';
import { createSqliteTestClient } from '../test-utils/sqliteTestClient';

// Creates a migrated database, activity repository, and settings repository for each test.
async function createRepositories() {
  const db = await createSqliteTestClient();
  await runMigrations(db);

  return {
    db,
    activities: createActivityRepository(db),
    settings: createSettingsRepository(db),
  };
}

describe('activity repository', () => {
  let nowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('creates an active activity with a started log', async () => {
    const { activities } = await createRepositories();
    const created = await activities.createActivity('  Write tests  ');

    expect(created.title).toBe('Write tests');
    expect(created.status).toBe('active');
    expect(created.events.map(event => event.type)).toEqual(['started']);
  });

  it('rejects blank activity titles before writing rows', async () => {
    const { activities } = await createRepositories();

    await expect(activities.createActivity('   ')).rejects.toThrow('Activity title is required.');
    expect(await activities.listActivities('all', 'newest')).toHaveLength(0);
  });

  it('persists and reads the activity sort mode', async () => {
    const { settings } = await createRepositories();

    expect(await settings.getSortMode()).toBe('newest');
    await settings.setSortMode('oldest');
    expect(await settings.getSortMode()).toBe('oldest');
  });

  it('falls back to newest when a stored sort mode is invalid', async () => {
    const { db, settings } = await createRepositories();

    await db.execute('UPDATE settings SET value = ? WHERE key = ?', [
      'sideways',
      'activity_sort_mode',
    ]);

    expect(await settings.getSortMode()).toBe('newest');
  });

  it('records pause, resume, and completion events in order', async () => {
    const { activities } = await createRepositories();
    const created = await activities.createActivity('Plan app');

    nowSpy.mockReturnValue(60_000);
    await activities.pauseActivity(created.id);
    nowSpy.mockReturnValue(120_000);
    await activities.resumeActivity(created.id);
    nowSpy.mockReturnValue(180_000);
    await activities.completeActivity(created.id);

    const completed = await activities.getActivityWithLogs(created.id);

    expect(completed?.status).toBe('completed');
    expect(completed?.events.map(event => event.type)).toEqual(['started', 'paused', 'resumed', 'completed']);
  });

  it('does not record duplicate logs for invalid lifecycle transitions', async () => {
    const { activities } = await createRepositories();
    const created = await activities.createActivity('Avoid duplicate logs');

    nowSpy.mockReturnValue(60_000);
    await activities.resumeActivity(created.id);
    await activities.pauseActivity(created.id);
    nowSpy.mockReturnValue(120_000);
    await activities.pauseActivity(created.id);
    await activities.completeActivity(created.id);
    nowSpy.mockReturnValue(180_000);
    await activities.resumeActivity(created.id);
    await activities.completeActivity(created.id);

    const completed = await activities.getActivityWithLogs(created.id);

    expect(completed?.status).toBe('completed');
    expect(completed?.events.map(event => event.type)).toEqual(['started', 'paused', 'completed']);
  });

  it('moves completed activities off home and into completed and all lists', async () => {
    const { activities } = await createRepositories();
    const created = await activities.createActivity('Ship app');

    nowSpy.mockReturnValue(60_000);
    await activities.completeActivity(created.id);

    expect(await activities.listActivities('home', 'newest')).toHaveLength(0);
    expect(await activities.listActivities('completed', 'newest')).toHaveLength(1);
    expect(await activities.listActivities('all', 'newest')).toHaveLength(1);
  });

  it('sorts activities by start time and most recent access', async () => {
    const { activities } = await createRepositories();

    nowSpy.mockReturnValue(1_000);
    const first = await activities.createActivity('First activity');
    nowSpy.mockReturnValue(2_000);
    const second = await activities.createActivity('Second activity');

    expect((await activities.listActivities('all', 'newest')).map(activity => activity.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect((await activities.listActivities('all', 'oldest')).map(activity => activity.id)).toEqual([
      first.id,
      second.id,
    ]);

    nowSpy.mockReturnValue(3_000);
    await activities.getActivityWithLogs(first.id);

    expect((await activities.listActivities('all', 'lastAccessed')).map(activity => activity.id)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it('soft-deletes and restores an activity with log history intact', async () => {
    const { activities } = await createRepositories();
    const created = await activities.createActivity('Undo delete');

    nowSpy.mockReturnValue(60_000);
    await activities.softDeleteActivity(created.id);
    expect(await activities.listActivities('all', 'newest')).toHaveLength(0);

    nowSpy.mockReturnValue(120_000);
    await activities.restoreActivity(created.id);
    const restored = await activities.getActivityWithLogs(created.id);

    expect(restored?.events.map(event => event.type)).toEqual(['started', 'deleted', 'restored']);
    expect(await activities.listActivities('all', 'newest')).toHaveLength(1);
  });

  it('hides soft-deleted activities from direct reads until they are restored', async () => {
    const { activities } = await createRepositories();
    const created = await activities.createActivity('Hidden while deleted');

    nowSpy.mockReturnValue(60_000);
    await activities.softDeleteActivity(created.id);

    expect(await activities.getActivityWithLogs(created.id)).toBeNull();

    nowSpy.mockReturnValue(120_000);
    await activities.restoreActivity(created.id);

    expect(await activities.getActivityWithLogs(created.id)).toMatchObject({
      id: created.id,
      title: 'Hidden while deleted',
      status: 'active',
    });
  });
});
