// Overview: Tests consecutive local-day completion streak behavior.

import type { ActivityWithLogs } from '../src/domain/activityTypes';
import { calculateDailyStreak } from '../src/domain/streak';

// Creates the minimum activity history needed to test a completion day.
function completedActivity(completedAt: number): ActivityWithLogs {
  return {
    id: `activity-${completedAt}`,
    title: 'Focus',
    status: 'completed',
    startedAt: completedAt - 60 * 60 * 1000,
    targetDurationMinutes: 60,
    completedAt,
    lastAccessedAt: completedAt,
    deletedAt: null,
    events: [],
  };
}

describe('daily streak calculations', () => {
  it('counts completed activities on consecutive local days once per day', () => {
    const now = new Date(2026, 6, 10, 18, 0, 0).getTime();
    const yesterday = new Date(2026, 6, 9, 18, 0, 0).getTime();
    const twoDaysAgo = new Date(2026, 6, 8, 18, 0, 0).getTime();

    expect(
      calculateDailyStreak(
        [completedActivity(now), completedActivity(now - 30 * 60 * 1000), completedActivity(yesterday), completedActivity(twoDaysAgo)],
        now,
      ),
    ).toBe(3);
  });

  it('keeps yesterday active until the user completes something today', () => {
    const now = new Date(2026, 6, 10, 8, 0, 0).getTime();
    const yesterday = new Date(2026, 6, 9, 18, 0, 0).getTime();
    const twoDaysAgo = new Date(2026, 6, 8, 18, 0, 0).getTime();

    expect(calculateDailyStreak([completedActivity(yesterday), completedActivity(twoDaysAgo)], now)).toBe(2);
  });

  it('resets after a missing completion day and ignores unfinished activities', () => {
    const now = new Date(2026, 6, 10, 18, 0, 0).getTime();
    const twoDaysAgo = new Date(2026, 6, 8, 18, 0, 0).getTime();

    expect(calculateDailyStreak([completedActivity(twoDaysAgo)], now)).toBe(0);
  });
});
