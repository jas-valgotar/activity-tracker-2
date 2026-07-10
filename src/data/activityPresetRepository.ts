// Overview: Provides local CRUD operations for reusable daily activity presets.

import type { DatabaseClient } from './database';
import type { ActivityPreset } from '../domain/activityTypes';
import {
  isValidTargetDurationMinutes,
  MAX_TARGET_DURATION_MINUTES,
  MIN_TARGET_DURATION_MINUTES,
  TARGET_DURATION_STEP_MINUTES,
} from '../domain/time';

type DbPresetRow = {
  id: string;
  title: string;
  duration_minutes: number;
  created_at: number;
  updated_at: number;
};

export type ActivityPresetRepository = {
  listPresets(): Promise<ActivityPreset[]>;
  createPreset(title: string, durationMinutes: number): Promise<void>;
  updatePreset(id: string, title: string, durationMinutes: number): Promise<void>;
  deletePreset(id: string): Promise<void>;
};

// Creates a repository that owns reusable daily preset persistence.
export function createActivityPresetRepository(db: DatabaseClient): ActivityPresetRepository {
  function validatePreset(title: string, durationMinutes: number): string {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Preset title is required.');
    }

    if (!isValidTargetDurationMinutes(durationMinutes)) {
      throw new Error(
        `Preset duration must be between ${MIN_TARGET_DURATION_MINUTES} and ${MAX_TARGET_DURATION_MINUTES} minutes in ${TARGET_DURATION_STEP_MINUTES}-minute increments.`,
      );
    }

    return trimmedTitle;
  }

  return {
    async listPresets() {
      const result = await db.execute(
        'SELECT id, title, duration_minutes, created_at, updated_at FROM activity_presets ORDER BY created_at ASC',
      );
      return result.rows.map(row => rowToPreset(row as DbPresetRow));
    },

    async createPreset(title, durationMinutes) {
      const trimmedTitle = validatePreset(title, durationMinutes);
      const now = Date.now();
      await db.execute(
        'INSERT INTO activity_presets (id, title, duration_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [createId(), trimmedTitle, durationMinutes, now, now],
      );
    },

    async updatePreset(id, title, durationMinutes) {
      const trimmedTitle = validatePreset(title, durationMinutes);
      await db.execute(
        'UPDATE activity_presets SET title = ?, duration_minutes = ?, updated_at = ? WHERE id = ?',
        [trimmedTitle, durationMinutes, Date.now(), id],
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Creates compact local IDs without adding another dependency.
function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
