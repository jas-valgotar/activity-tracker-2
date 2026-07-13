// Overview: Tests activity repository lifecycle behavior against an in-memory SQLite database.

import { createActivityRepository } from '../src/data/activityRepository';
import { createActivityPresetRepository } from '../src/data/activityPresetRepository';
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
    presets: createActivityPresetRepository(db),
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
    expect(created.targetDurationMinutes).toBe(60);
    expect(created.events.map(event => event.type)).toEqual(['started']);
  });

  it('persists a custom activity target duration', async () => {
    const { activities } = await createRepositories();
    const created = await activities.createActivity('Meditation', 37);

    expect(created.targetDurationMinutes).toBe(37);
    expect((await activities.getActivityWithLogs(created.id))?.targetDurationMinutes).toBe(37);
  });

  it('logs a past completed activity with derived start time and standard lifecycle events', async () => {
    const { activities } = await createRepositories();
    const completedAt = new Date(2026, 6, 10, 14, 30, 0).getTime();
    nowSpy.mockReturnValue(new Date(2026, 6, 13, 12, 0, 0).getTime());

    const logged = await activities.logPastActivity('  Reading  ', 45, completedAt);

    expect(logged).toMatchObject({
      title: 'Reading',
      status: 'completed',
      startedAt: completedAt - 45 * 60 * 1000,
      completedAt,
      targetDurationMinutes: 45,
    });
    expect(logged.events.map(event => [event.type, event.occurredAt])).toEqual([
      ['started', completedAt - 45 * 60 * 1000],
      ['completed', completedAt],
    ]);

    const report = await activities.getActivityProgressReport(
      logged.id,
      'week',
      new Date(2026, 6, 12, 12, 0, 0).getTime(),
    );
    expect(report.totalActiveMs).toBe(45 * 60 * 1000);
    expect(report.sessionsCompleted).toBe(1);
  });

  it('rejects blank, invalid-duration, and future past activities before writing rows', async () => {
    const { activities } = await createRepositories();
    const now = new Date(2026, 6, 13, 12, 0, 0).getTime();
    nowSpy.mockReturnValue(now);

    await expect(activities.logPastActivity('   ', 30, now)).rejects.toThrow('Activity title is required.');
    await expect(activities.logPastActivity('Reading', 14, now)).rejects.toThrow('Activity duration must be');
    await expect(activities.logPastActivity('Reading', 30, now + 1)).rejects.toThrow('Past activity must end in the past.');
    expect(await activities.listActivities('all', 'newest')).toHaveLength(0);
  });

  it('allows only one active activity at a time', async () => {
    const { activities } = await createRepositories();
    const first = await activities.createActivity('First focus');

    await expect(activities.createActivity('Second focus')).rejects.toThrow('Only one activity can be active at a time.');

    await activities.pauseActivity(first.id);
    const second = await activities.createActivity('Second focus');
    expect(second.status).toBe('active');
  });

  it('pauses the current activity and starts the requested activity as one switch', async () => {
    const { activities } = await createRepositories();
    const first = await activities.createActivity('First focus');

    const result = await activities.pauseCurrentAndCreateActivity('Second focus', 37);
    const pausedFirst = await activities.getActivityWithLogs(first.id);

    expect(result.activity.title).toBe('Second focus');
    expect(result.activity.status).toBe('active');
    expect(result.activity.targetDurationMinutes).toBe(37);
    expect(result.pausedActivityId).toBe(first.id);
    expect(pausedFirst?.status).toBe('paused');
    expect(pausedFirst?.events.at(-1)?.type).toBe('paused');
  });

  it('automatically completes the least recently accessed paused activity when Focus would exceed two paused sessions', async () => {
    const { activities } = await createRepositories();
    const first = await activities.createActivity('First focus');

    nowSpy.mockReturnValue(2_000);
    const second = await activities.pauseCurrentAndCreateActivity('Second focus');
    nowSpy.mockReturnValue(3_000);
    const third = await activities.pauseCurrentAndCreateActivity('Third focus');
    nowSpy.mockReturnValue(4_000);
    const fourth = await activities.pauseCurrentAndCreateActivity('Fourth focus');

    expect(fourth.autoCompletedActivityIds).toEqual([first.id]);
    expect((await activities.getActivityWithLogs(first.id))?.events.map(event => [event.type, event.occurredAt])).toEqual([
      ['started', 1_000],
      ['paused', 2_000],
      ['completed', 4_000],
    ]);
    expect((await activities.getActivityWithLogs(first.id))?.status).toBe('completed');
    expect((await activities.listActivities('home', 'newest')).map(activity => activity.id)).toEqual([
      fourth.activity.id,
      third.activity.id,
      second.activity.id,
    ]);
    expect((await activities.listActivities('completed', 'newest')).map(activity => activity.id)).toContain(first.id);
  });

  it('cleans up legacy paused overflow deterministically when Focus capacity is initialized', async () => {
    const { activities, db } = await createRepositories();
    const first = await activities.createActivity('Oldest paused');

    nowSpy.mockReturnValue(2_000);
    const second = await activities.pauseCurrentAndCreateActivity('Middle paused');
    nowSpy.mockReturnValue(3_000);
    const third = await activities.pauseCurrentAndCreateActivity('Newest paused');

    // Simulates a pre-capacity installation with three paused records before app startup cleanup runs.
    await db.execute("UPDATE activities SET status = 'paused' WHERE id = ?", [third.activity.id]);
    nowSpy.mockReturnValue(4_000);
    const autoCompletedIds = await activities.completeExcessPausedActivities();

    expect(autoCompletedIds).toEqual([first.id]);
    expect((await activities.getActivityWithLogs(first.id))?.status).toBe('completed');
    expect((await activities.getActivityWithLogs(first.id))?.events.at(-1)).toMatchObject({
      type: 'completed',
      occurredAt: 4_000,
    });
    expect(await activities.listActivities('home', 'newest')).toHaveLength(2);
    expect((await activities.listActivities('completed', 'newest')).map(activity => activity.id)).toContain(first.id);
    expect(second.activity.status).toBe('active');
  });

  it('prevents resuming a paused activity while another activity is active', async () => {
    const { activities } = await createRepositories();
    const first = await activities.createActivity('First focus');
    await activities.pauseActivity(first.id);
    await activities.createActivity('Second focus');

    await expect(activities.resumeActivity(first.id)).rejects.toThrow('Only one activity can be active at a time.');
  });

  it('pauses the current activity and resumes a selected paused activity as one switch', async () => {
    const { activities } = await createRepositories();
    const selected = await activities.createActivity('Selected focus');
    await activities.pauseActivity(selected.id);
    const current = await activities.createActivity('Current focus');

    const result = await activities.pauseCurrentAndResumeActivity(selected.id);
    const selectedAfter = await activities.getActivityWithLogs(selected.id);
    const currentAfter = await activities.getActivityWithLogs(current.id);

    expect(result.activity.id).toBe(selected.id);
    expect(result.activity.status).toBe('active');
    expect(result.pausedActivityId).toBe(current.id);
    expect(selectedAfter?.events.map(event => event.type)).toEqual(['started', 'paused', 'resumed']);
    expect(currentAfter?.status).toBe('paused');
    expect(currentAfter?.events.at(-1)?.type).toBe('paused');
  });

  it('restores a deleted active activity as paused when another activity has started', async () => {
    const { activities } = await createRepositories();
    const deleted = await activities.createActivity('Deleted focus');
    await activities.softDeleteActivity(deleted.id);
    const other = await activities.createActivity('Current focus');

    await activities.restoreActivity(deleted.id);

    expect((await activities.getActivityWithLogs(deleted.id))?.status).toBe('paused');
    expect((await activities.getActivityWithLogs(other.id))?.status).toBe('active');
  });

  it('seeds and manages Home routines', async () => {
    const { presets } = await createRepositories();
    const seeded = await presets.listPresets();

    expect(seeded.map(preset => preset.title).sort()).toEqual(['Play', 'Reading', 'Walk']);
    expect(seeded.find(preset => preset.title === 'Walk')).toMatchObject({ durationMinutes: 15, reminderTimeMinutes: null });
    expect(seeded.find(preset => preset.title === 'Reading')).toMatchObject({ durationMinutes: 10, reminderTimeMinutes: null });
    expect(seeded.find(preset => preset.title === 'Play')).toMatchObject({ durationMinutes: 10, reminderTimeMinutes: null });

    nowSpy.mockReturnValue(2_000);
    await presets.createPreset('Yoga', 45, 17 * 60);
    const created = (await presets.listPresets()).find(preset => preset.title === 'Yoga');
    expect(created?.durationMinutes).toBe(45);
    expect(created?.reminderTimeMinutes).toBe(17 * 60);

    if (!created) {
      throw new Error('Created preset was not returned.');
    }

    nowSpy.mockReturnValue(3_000);
    await presets.updatePreset(created.id, 'Long Yoga', 60, null);
    expect((await presets.listPresets()).find(preset => preset.id === created.id)).toMatchObject({
      title: 'Long Yoga',
      durationMinutes: 60,
      reminderTimeMinutes: null,
    });
    expect((await presets.listPresets())[0]?.id).toBe(created.id);

    await presets.deletePreset(created.id);
    expect((await presets.listPresets()).some(preset => preset.id === created.id)).toBe(false);
  });

  it('does not recreate deleted seeded routines on a later migration', async () => {
    const { db, presets } = await createRepositories();

    await presets.deletePreset('preset-walk');
    await runMigrations(db);

    expect((await presets.listPresets()).some(preset => preset.id === 'preset-walk')).toBe(false);
  });

  it('reports progress from completed lifecycle intervals', async () => {
    const { activities } = await createRepositories();
    const startedAt = new Date(2026, 6, 13, 9, 0, 0).getTime();
    const completedAt = new Date(2026, 6, 13, 10, 30, 0).getTime();
    nowSpy.mockReturnValue(startedAt);
    const created = await activities.createActivity('Weekly focus');
    nowSpy.mockReturnValue(completedAt);
    await activities.completeActivity(created.id);

    const report = await activities.getActivityProgressReport(created.id, 'week', new Date(2026, 6, 15, 12, 0, 0).getTime());
    expect(report.totalActiveMs).toBe(90 * 60 * 1000);
    expect(report.sessionsStarted).toBe(1);
    expect(report.sessionsCompleted).toBe(1);
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

  it('preserves the original Lock Screen command timestamp for lifecycle events', async () => {
    const { activities } = await createRepositories();
    const created = await activities.createActivity('Lock Screen focus');

    await activities.pauseActivity(created.id, 20_000);
    await activities.resumeActivity(created.id, 40_000);
    await activities.completeActivity(created.id, 60_000);

    const completed = await activities.getActivityWithLogs(created.id);
    expect(completed?.events.map(event => [event.type, event.occurredAt])).toEqual([
      ['started', 1_000],
      ['paused', 20_000],
      ['resumed', 40_000],
      ['completed', 60_000],
    ]);
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
    await activities.pauseActivity(first.id);
    nowSpy.mockReturnValue(2_000);
    const second = await activities.createActivity('Second activity');

    expect((await activities.listActivities('all', 'newest')).map(activity => activity.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect((await activities.listActivities('all', 'oldest')).map(activity => activity.id)).toEqual([
      second.id,
      first.id,
    ]);

    nowSpy.mockReturnValue(3_000);
    await activities.getActivityWithLogs(first.id);

    expect((await activities.listActivities('all', 'lastAccessed')).map(activity => activity.id)).toEqual([
      second.id,
      first.id,
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
