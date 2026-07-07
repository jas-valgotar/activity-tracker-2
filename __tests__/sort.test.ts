// Overview: Tests persisted sort values and SQL order mappings.

import { DEFAULT_SORT_MODE, isActivitySortMode, toOrderByClause } from '../src/domain/sort';

describe('activity sort helpers', () => {
  it('uses newest as the default sort mode', () => {
    expect(DEFAULT_SORT_MODE).toBe('newest');
  });

  it('validates persisted sort values', () => {
    expect(isActivitySortMode('newest')).toBe(true);
    expect(isActivitySortMode('oldest')).toBe(true);
    expect(isActivitySortMode('lastAccessed')).toBe(true);
    expect(isActivitySortMode('unknown')).toBe(false);
  });

  it('maps sort modes to constrained SQL order clauses', () => {
    expect(toOrderByClause('newest')).toBe('started_at DESC');
    expect(toOrderByClause('oldest')).toBe('started_at ASC');
    expect(toOrderByClause('lastAccessed')).toBe('last_accessed_at DESC');
  });
});
