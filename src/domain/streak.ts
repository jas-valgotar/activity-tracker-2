// Overview: Calculates the current consecutive-day completion streak from local activity history.

import type { ActivityWithLogs } from './activityTypes';

// Returns a stable local-calendar key so completions are grouped by the user's device day.
function getLocalDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Calculates consecutive completed days, keeping yesterday's streak alive until today ends.
export function calculateDailyStreak(activities: ActivityWithLogs[], now = Date.now()): number {
  const completedDays = new Set(
    activities
      .filter(activity => activity.completedAt !== null)
      .map(activity => getLocalDayKey(activity.completedAt as number)),
  );
  const today = new Date(now);
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!completedDays.has(getLocalDayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (completedDays.has(getLocalDayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
