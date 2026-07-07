// Overview: Persists user-level settings, including the selected activity sort mode.

import type { DatabaseClient } from './database';
import type { ActivitySortMode } from '../domain/activityTypes';
import { DEFAULT_SORT_MODE, isActivitySortMode } from '../domain/sort';

const SORT_MODE_KEY = 'activity_sort_mode';

export type SettingsRepository = {
  getSortMode(): Promise<ActivitySortMode>;
  setSortMode(sortMode: ActivitySortMode): Promise<void>;
};

// Creates a settings repository backed by the provided database client.
export function createSettingsRepository(db: DatabaseClient): SettingsRepository {
  return {
    // Reads the persisted sort mode and falls back to newest when unset or invalid.
    async getSortMode() {
      const result = await db.execute('SELECT value FROM settings WHERE key = ?', [SORT_MODE_KEY]);
      const value = result.rows[0]?.value;
      if (typeof value === 'string' && isActivitySortMode(value)) {
        return value;
      }

      return DEFAULT_SORT_MODE;
    },

    // Saves the selected activity sort mode for future app launches.
    async setSortMode(sortMode) {
      await db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        SORT_MODE_KEY,
        sortMode,
      ]);
    },
  };
}
