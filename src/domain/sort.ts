// Overview: Defines activity sort labels, storage values, and SQL order clauses in one place.

import type { ActivitySortMode } from './activityTypes';

export const DEFAULT_SORT_MODE: ActivitySortMode = 'newest';

export const SORT_LABELS: Record<ActivitySortMode, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  lastAccessed: 'Last Accessed',
};

export const SORT_MODES: ActivitySortMode[] = ['newest', 'oldest', 'lastAccessed'];

// Checks whether a stored string is a supported activity sort mode.
export function isActivitySortMode(value: string | null | undefined): value is ActivitySortMode {
  return value === 'newest' || value === 'oldest' || value === 'lastAccessed';
}

// Converts the UI sort mode into a constrained SQL ORDER BY clause.
export function toOrderByClause(sortMode: ActivitySortMode): string {
  switch (sortMode) {
    case 'oldest':
      return 'started_at ASC';
    case 'lastAccessed':
      return 'last_accessed_at DESC';
    case 'newest':
    default:
      return 'started_at DESC';
  }
}
