// Overview: Tests activity repository lifecycle behavior against an in-memory SQLite database.

import { createActivityRepository } from '../src/data/activityRepository';
import { runMigrations } from '../src/data/migrations';
import { createSettingsRepository } from '../src/data/settingsRepository';
import { createSqliteTestClient } from '../test-utils/sqliteTestClient';

// Creates a migrated repository and settings pair for each test.
async function createRepositories() {
  const db = await createSqliteTestClient();
  await runMigrations(db);

  return {
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

  it('persists and reads the activity sort mode', async () => {
    const { settings } = await createRepositories();

    expect(await settings.getSortMode()).toBe('newest');
    await settings.setSortMode('oldest');
    expect(await settings.getSortMode()).toBe('oldest');
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

  it('moves completed activities off home and into completed and all lists', async () => {
    const { activities } = await createRepositories();
    const created = await activities.createActivity('Ship app');

    nowSpy.mockReturnValue(60_000);
    await activities.completeActivity(created.id);

    expect(await activities.listActivities('home', 'newest')).toHaveLength(0);
    expect(await activities.listActivities('completed', 'newest')).toHaveLength(1);
    expect(await activities.listActivities('all', 'newest')).toHaveLength(1);
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
});
