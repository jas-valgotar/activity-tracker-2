// Overview: Provides reusable CRUD and lifecycle operations for activities and their event logs.

import type { DatabaseClient } from './database';
import type {
  Activity,
  ActivityEvent,
  ActivityEventType,
  ActivityFilter,
  ActivitySortMode,
  ActivityWithLogs,
  ProgressPeriod,
  ProgressReport,
} from '../domain/activityTypes';
import { toOrderByClause } from '../domain/sort';
import {
  buildProgressReport,
  DEFAULT_TARGET_DURATION_MINUTES,
  isValidTargetDurationMinutes,
} from '../domain/time';

type DbActivityRow = {
  id: string;
  title: string;
  status: string;
  started_at: number;
  target_duration_minutes: number;
  completed_at: number | null;
  last_accessed_at: number;
  deleted_at: number | null;
};

type DbEventRow = {
  id: string;
  activity_id: string;
  type: string;
  occurred_at: number;
};

export type ActivityRepository = {
  createActivity(title: string, targetDurationMinutes?: number): Promise<ActivityWithLogs>;
  logPastActivity(title: string, durationMinutes: number, completedAt: number): Promise<ActivityWithLogs>;
  pauseCurrentAndCreateActivity(title: string, targetDurationMinutes?: number): Promise<ActivityStartResult>;
  pauseCurrentAndResumeActivity(id: string, occurredAt?: number): Promise<ActivityStartResult>;
  listActivities(filter: ActivityFilter, sortMode: ActivitySortMode): Promise<ActivityWithLogs[]>;
  getActivityWithLogs(id: string): Promise<ActivityWithLogs | null>;
  getActivityProgressReport(id: string, period: ProgressPeriod, now?: number): Promise<ProgressReport>;
  pauseActivity(id: string, occurredAt?: number): Promise<ActivityPauseResult>;
  resumeActivity(id: string, occurredAt?: number): Promise<ActivityLifecycleResult>;
  completeActivity(id: string, occurredAt?: number): Promise<void>;
  softDeleteActivity(id: string): Promise<void>;
  restoreActivity(id: string): Promise<ActivityLifecycleResult>;
  completeExcessPausedActivities(occurredAt?: number): Promise<string[]>;
};

export type ActivityLifecycleResult = {
  autoCompletedActivityIds: string[];
};

export type ActivityPauseResult = ActivityLifecycleResult & {
  pausedActivity: ActivityWithLogs | null;
};

export type ActivityStartResult = ActivityLifecycleResult & {
  activity: ActivityWithLogs;
  pausedActivityId: string | null;
};

const MAX_PAUSED_FOCUS_ACTIVITIES = 2;

// Creates a repository that owns activity persistence and lifecycle event logging.
export function createActivityRepository(db: DatabaseClient): ActivityRepository {
  // Updates the activity's last-accessed timestamp for sorting and detail opens.
  async function touchActivity(id: string, timestamp = Date.now()) {
    await db.execute('UPDATE activities SET last_accessed_at = ? WHERE id = ?', [timestamp, id]);
  }

  // Loads a raw activity row without mutating last-accessed state.
  async function getActivityRow(id: string): Promise<DbActivityRow | null> {
    const result = await db.execute(
      `SELECT id, title, status, started_at, target_duration_minutes, completed_at, last_accessed_at, deleted_at
       FROM activities
       WHERE id = ?`,
      [id],
    );

    return (result.rows[0] as DbActivityRow | undefined) ?? null;
  }

  // Loads all lifecycle events for an activity in chronological order.
  async function getEvents(activityId: string): Promise<ActivityEvent[]> {
    const result = await db.execute(
      'SELECT id, activity_id, type, occurred_at FROM activity_events WHERE activity_id = ? ORDER BY occurred_at ASC',
      [activityId],
    );

    return result.rows.map(rowToEvent);
  }

  // Combines activity rows with their event logs for UI and elapsed-time calculations.
  async function hydrateActivities(rows: DbActivityRow[]): Promise<ActivityWithLogs[]> {
    return Promise.all(
      rows.map(async row => ({
        ...rowToActivity(row),
        events: await getEvents(row.id),
      })),
    );
  }

  return {
    // Starts a new active activity and records its start event.
    async createActivity(title, targetDurationMinutes = DEFAULT_TARGET_DURATION_MINUTES) {
      const trimmedTitle = validateActivityInput(title, targetDurationMinutes);
      await ensureNoOtherActiveActivity();

      const now = Date.now();
      const id = createId();

      await db.executeBatch([
        [
          'INSERT INTO activities (id, title, status, started_at, target_duration_minutes, completed_at, last_accessed_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, trimmedTitle, 'active', now, targetDurationMinutes, null, now, null],
        ],
        [
          'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
          [createId(), id, 'started', now],
        ],
      ]);

      const activity = await this.getActivityWithLogs(id);
      if (!activity) {
        throw new Error('Activity could not be loaded after creation.');
      }

      return activity;
    },

    // Records a completed session in the past using the same lifecycle events as a tracked activity.
    async logPastActivity(title, durationMinutes, completedAt) {
      const trimmedTitle = validateActivityInput(title, durationMinutes);
      validatePastCompletionTimestamp(completedAt);

      const id = createId();
      const startedAt = completedAt - durationMinutes * 60_000;
      await db.executeBatch([
        [
          'INSERT INTO activities (id, title, status, started_at, target_duration_minutes, completed_at, last_accessed_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, trimmedTitle, 'completed', startedAt, durationMinutes, completedAt, completedAt, null],
        ],
        [
          'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
          [createId(), id, 'started', startedAt],
        ],
        [
          'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
          [createId(), id, 'completed', completedAt],
        ],
      ]);

      const activity = await this.getActivityWithLogs(id);
      if (!activity) {
        throw new Error('Past activity could not be loaded after saving.');
      }

      return activity;
    },

    // Pauses the current active activity and starts the requested activity in one database batch.
    async pauseCurrentAndCreateActivity(title, targetDurationMinutes = DEFAULT_TARGET_DURATION_MINUTES) {
      const trimmedTitle = validateActivityInput(title, targetDurationMinutes);
      const activeResult = await db.execute(
        "SELECT id FROM activities WHERE status = 'active' AND deleted_at IS NULL LIMIT 1",
      );
      const pausedActivityId = (activeResult.rows[0] as { id?: string } | undefined)?.id ?? null;
      const now = Date.now();
      const id = createId();
      const commands: Array<[string, Array<string | number | null>]> = [];

      if (pausedActivityId) {
        commands.push(
          ['UPDATE activities SET status = ?, last_accessed_at = ? WHERE id = ?', ['paused', now, pausedActivityId]],
          [
            'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
            [createId(), pausedActivityId, 'paused', now],
          ],
        );
      }

      commands.push(
        [
          'INSERT INTO activities (id, title, status, started_at, target_duration_minutes, completed_at, last_accessed_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, trimmedTitle, 'active', now, targetDurationMinutes, null, now, null],
        ],
        [
          'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
          [createId(), id, 'started', now],
        ],
      );
      await db.executeBatch(commands);

      const activity = await this.getActivityWithLogs(id);
      if (!activity) {
        throw new Error('Activity could not be loaded after switching focus.');
      }

      return {
        activity,
        pausedActivityId,
        autoCompletedActivityIds: await completeExcessPausedActivities(now),
      };
    },

    // Pauses the current active activity and resumes the requested paused activity atomically.
    async pauseCurrentAndResumeActivity(id, occurredAt = Date.now()) {
      const target = await getActivityRow(id);
      if (!target || target.deleted_at !== null || target.status !== 'paused') {
        throw new Error('Only paused activities can be resumed.');
      }

      const activeResult = await db.execute(
        "SELECT id FROM activities WHERE status = 'active' AND deleted_at IS NULL LIMIT 1",
      );
      const pausedActivityId = (activeResult.rows[0] as { id?: string } | undefined)?.id ?? null;
      const now = occurredAt;
      const commands: Array<[string, Array<string | number | null>]> = [];

      if (pausedActivityId) {
        commands.push(
          ['UPDATE activities SET status = ?, last_accessed_at = ? WHERE id = ?', ['paused', now, pausedActivityId]],
          [
            'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
            [createId(), pausedActivityId, 'paused', now],
          ],
        );
      }

      commands.push(
        ['UPDATE activities SET status = ?, last_accessed_at = ? WHERE id = ?', ['active', now, id]],
        [
          'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
          [createId(), id, 'resumed', now],
        ],
      );
      await db.executeBatch(commands);

      const activity = await this.getActivityWithLogs(id);
      if (!activity) {
        throw new Error('Activity could not be loaded after switching focus.');
      }

      return {
        activity,
        pausedActivityId,
        autoCompletedActivityIds: await completeExcessPausedActivities(now),
      };
    },

    // Lists non-deleted activities for the requested screen and sort mode.
    async listActivities(filter, sortMode) {
      const statusWhere = getFilterWhereClause(filter);
      const orderBy = toOrderByClause(sortMode);
      const result = await db.execute(
        `SELECT id, title, status, started_at, target_duration_minutes, completed_at, last_accessed_at, deleted_at
         FROM activities
         WHERE deleted_at IS NULL ${statusWhere}
         ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, ${orderBy}`,
      );

      return hydrateActivities(result.rows as DbActivityRow[]);
    },

    // Loads one activity with logs and touches its last-accessed timestamp.
    async getActivityWithLogs(id) {
      await touchActivity(id);
      const result = await db.execute(
        `SELECT id, title, status, started_at, target_duration_minutes, completed_at, last_accessed_at, deleted_at
         FROM activities
         WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      const row = result.rows[0] as DbActivityRow | undefined;

      if (!row) {
        return null;
      }

      return {
        ...rowToActivity(row),
        events: await getEvents(id),
      };
    },

    // Builds a progress report from one non-deleted activity and its event history.
    async getActivityProgressReport(id, period, now = Date.now()) {
      const result = await db.execute(
        `SELECT id, title, status, started_at, target_duration_minutes, completed_at, last_accessed_at, deleted_at
         FROM activities
         WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      const activities = await hydrateActivities(result.rows as DbActivityRow[]);
      return buildProgressReport(activities, period, now);
    },

    // Pauses an active activity and records the pause event.
    async pauseActivity(id, occurredAt = Date.now()) {
      const activity = await getActivityRow(id);
      if (!activity || activity.deleted_at !== null || activity.status !== 'active') {
        return { autoCompletedActivityIds: [], pausedActivity: null };
      }

      const now = occurredAt;
      await db.executeBatch([
        ['UPDATE activities SET status = ?, last_accessed_at = ? WHERE id = ?', ['paused', now, id]],
        ['INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)', [createId(), id, 'paused', now]],
      ]);

      return {
        autoCompletedActivityIds: await completeExcessPausedActivities(now),
        pausedActivity: await this.getActivityWithLogs(id),
      };
    },

    // Resumes a paused activity and records the resume event.
    async resumeActivity(id, occurredAt = Date.now()) {
      const activity = await getActivityRow(id);
      if (!activity || activity.deleted_at !== null || activity.status !== 'paused') {
        return { autoCompletedActivityIds: [] };
      }
      await ensureNoOtherActiveActivity(id);

      const now = occurredAt;
      await db.executeBatch([
        ['UPDATE activities SET status = ?, last_accessed_at = ? WHERE id = ?', ['active', now, id]],
        ['INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)', [createId(), id, 'resumed', now]],
      ]);

      return { autoCompletedActivityIds: await completeExcessPausedActivities(now) };
    },

    // Marks an activity complete and freezes its elapsed time at completion.
    async completeActivity(id, occurredAt = Date.now()) {
      const activity = await getActivityRow(id);
      if (!activity || activity.deleted_at !== null || activity.status === 'completed') {
        return;
      }

      const now = occurredAt;
      await db.executeBatch([
        ['UPDATE activities SET status = ?, completed_at = ?, last_accessed_at = ? WHERE id = ?', ['completed', now, now, id]],
        ['INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)', [createId(), id, 'completed', now]],
      ]);
    },

    // Soft-deletes an activity so the undo action can restore it with logs intact.
    async softDeleteActivity(id) {
      const activity = await getActivityRow(id);
      if (!activity || activity.deleted_at !== null) {
        return;
      }

      const now = Date.now();
      await db.executeBatch([
        ['UPDATE activities SET deleted_at = ?, last_accessed_at = ? WHERE id = ?', [now, now, id]],
        ['INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)', [createId(), id, 'deleted', now]],
      ]);
    },

    // Restores a soft-deleted activity and records the restore event.
    async restoreActivity(id) {
      const activity = await getActivityRow(id);
      if (!activity || activity.deleted_at === null) {
        return { autoCompletedActivityIds: [] };
      }

      const now = Date.now();
      const shouldRestorePaused =
        activity.status === 'active' && (await hasOtherActiveActivity(activity.id));
      const restoredStatus = shouldRestorePaused ? 'paused' : activity.status;
      const restoreCommands: Array<[string, Array<string | number | null>]> = [
        ['UPDATE activities SET deleted_at = NULL, status = ?, last_accessed_at = ? WHERE id = ?', [restoredStatus, now, id]],
        [
          'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
          [createId(), id, 'restored', now],
        ],
      ];
      if (shouldRestorePaused) {
        restoreCommands.push([
          'INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)',
          [createId(), id, 'paused', now],
        ]);
      }
      await db.executeBatch(restoreCommands);

      return { autoCompletedActivityIds: await completeExcessPausedActivities(now) };
    },

    // Completes the oldest paused activities so Focus always contains at most two paused sessions.
    async completeExcessPausedActivities(occurredAt = Date.now()) {
      return completeExcessPausedActivities(occurredAt);
    },
  };

  // Marks paused overflow as complete using a deterministic least-recently-accessed, then oldest-started order.
  async function completeExcessPausedActivities(occurredAt: number): Promise<string[]> {
    const pausedResult = await db.execute(
      `SELECT id
       FROM activities
       WHERE status = 'paused' AND deleted_at IS NULL
       ORDER BY last_accessed_at ASC, started_at ASC, id ASC`,
    );
    const overflowIds = (pausedResult.rows as Array<{ id: string }>)
      .slice(0, Math.max(0, pausedResult.rows.length - MAX_PAUSED_FOCUS_ACTIVITIES))
      .map(row => row.id);

    if (overflowIds.length === 0) {
      return [];
    }

    const commands: Array<[string, Array<string | number | null>]> = [];
    overflowIds.forEach(id => {
      commands.push(
        ['UPDATE activities SET status = ?, completed_at = ?, last_accessed_at = ? WHERE id = ?', ['completed', occurredAt, occurredAt, id]],
        ['INSERT INTO activity_events (id, activity_id, type, occurred_at) VALUES (?, ?, ?, ?)', [createId(), id, 'completed', occurredAt]],
      );
    });
    await db.executeBatch(commands);

    return overflowIds;
  }

  // Prevents a second activity from entering the active state.
  async function ensureNoOtherActiveActivity(excludedId?: string): Promise<void> {
    if (await hasOtherActiveActivity(excludedId)) {
      throw new Error('Only one activity can be active at a time. Pause or complete the current activity first.');
    }
  }

  // Checks whether a non-deleted active activity exists besides the optional excluded activity.
  async function hasOtherActiveActivity(excludedId?: string): Promise<boolean> {
    const result = await db.execute(
      `SELECT id
       FROM activities
       WHERE status = 'active' AND deleted_at IS NULL
       ${excludedId ? 'AND id <> ?' : ''}
       LIMIT 1`,
      excludedId ? [excludedId] : [],
    );

    return result.rows.length > 0;
  }
}

// Validates activity input before either normal or focus-switch creation writes to SQLite.
function validateActivityInput(title: string, targetDurationMinutes: number): string {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error('Activity title is required.');
  }
  if (!isValidTargetDurationMinutes(targetDurationMinutes)) {
    throw new Error('Activity duration must be a whole number of minutes between 15 minutes and 8 hours.');
  }

  return trimmedTitle;
}

// Rejects invalid or future timestamps so a historical session cannot become an active timer by accident.
function validatePastCompletionTimestamp(completedAt: number): void {
  if (!Number.isFinite(completedAt)) {
    throw new Error('Past activity completion time is required.');
  }
  if (completedAt > Date.now()) {
    throw new Error('Past activity must end in the past.');
  }
}

// Returns the screen-specific SQL filter for non-deleted activity lists.
function getFilterWhereClause(filter: ActivityFilter): string {
  switch (filter) {
    case 'home':
      return "AND status IN ('active', 'paused')";
    case 'completed':
      return "AND status = 'completed'";
    case 'all':
    default:
      return '';
  }
}

// Converts a database activity row into the public activity type.
function rowToActivity(row: DbActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    status: row.status as Activity['status'],
    startedAt: row.started_at,
    targetDurationMinutes: row.target_duration_minutes,
    completedAt: row.completed_at,
    lastAccessedAt: row.last_accessed_at,
    deletedAt: row.deleted_at,
  };
}

// Converts a database event row into the public event type.
function rowToEvent(row: Record<string, unknown>): ActivityEvent {
  const typedRow = row as DbEventRow;
  return {
    id: typedRow.id,
    activityId: typedRow.activity_id,
    type: typedRow.type as ActivityEventType,
    occurredAt: typedRow.occurred_at,
  };
}

// Creates compact local IDs without adding another dependency.
function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
