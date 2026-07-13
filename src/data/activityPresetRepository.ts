// Overview: Provides local CRUD operations for reusable Home routines.

import type { DatabaseClient } from './database';
import type { ActivityPreset } from '../domain/activityTypes';
import { isValidReminderTimeMinutes } from '../domain/reminderTime';
import {
  isValidTargetDurationMinutes,
  MAX_TARGET_DURATION_MINUTES,
  MIN_TARGET_DURATION_MINUTES,
} from '../domain/time';

type DbPresetRow = {
  id: string;
  title: string;
  duration_minutes: number;
  reminder_time_minutes: number | null;
  created_at: number;
  updated_at: number;
};

export type ActivityPresetRepository = {
  listPresets(): Promise<ActivityPreset[]>;
  createPreset(title: string, durationMinutes: number, reminderTimeMinutes?: number | null): Promise<void>;
  updatePreset(id: string, title: string, durationMinutes: number, reminderTimeMinutes?: number | null): Promise<void>;
  deletePreset(id: string): Promise<void>;
};

// Creates a repository that owns reusable routine persistence.
export function createActivityPresetRepository(db: DatabaseClient): ActivityPresetRepository {
  function validatePreset(title: string, durationMinutes: number, reminderTimeMinutes: number | null | undefined): string {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Preset title is required.');
    }
    if (reminderTimeMinutes !== null && reminderTimeMinutes !== undefined && !isValidReminderTimeMinutes(reminderTimeMinutes)) {
      throw new Error('Preset reminder time must be a valid local time.');
    }

    if (!isValidTargetDurationMinutes(durationMinutes)) {
      throw new Error(
        `Preset duration must be a whole number of minutes between ${MIN_TARGET_DURATION_MINUTES} and ${MAX_TARGET_DURATION_MINUTES} minutes.`,
      );
    }

    return trimmedTitle;
  }

  return {
    async listPresets() {
      const result = await db.execute(
        'SELECT id, title, duration_minutes, reminder_time_minutes, created_at, updated_at FROM activity_presets ORDER BY updated_at DESC, created_at DESC, id DESC',
      );
      return result.rows.map(row => rowToPreset(row as DbPresetRow));
    },

    async createPreset(title, durationMinutes, reminderTimeMinutes = null) {
      const trimmedTitle = validatePreset(title, durationMinutes, reminderTimeMinutes);
      const now = Date.now();
      await db.execute(
        'INSERT INTO activity_presets (id, title, duration_minutes, reminder_time_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [createId(), trimmedTitle, durationMinutes, reminderTimeMinutes, now, now],
      );
    },

    async updatePreset(id, title, durationMinutes, reminderTimeMinutes = null) {
      const trimmedTitle = validatePreset(title, durationMinutes, reminderTimeMinutes);
      await db.execute(
        'UPDATE activity_presets SET title = ?, duration_minutes = ?, reminder_time_minutes = ?, updated_at = ? WHERE id = ?',
        [trimmedTitle, durationMinutes, reminderTimeMinutes, Date.now(), id],
      );
    },

    async deletePreset(id) {
      await db.execute('DELETE FROM activity_presets WHERE id = ?', [id]);
    },
  };
}

// Converts a database row into the public preset type.
function rowToPreset(row: DbPresetRow): ActivityPreset {
  return {
    id: row.id,
    title: row.title,
    durationMinutes: row.duration_minutes,
    reminderTimeMinutes: row.reminder_time_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Creates compact local IDs without adding another dependency.
function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
