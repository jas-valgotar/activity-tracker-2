// Overview: Calculates the current consecutive-day completion streak from local activity history.

import type { ActivityWithLogs } from './activityTypes';

// Returns the start of a local calendar day so date arithmetic respects daylight-saving changes.
function getLocalDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Moves between local calendar days without assuming every day has exactly 24 hours.
function shiftLocalDay(dayStart: number, offset: number): number {
  const date = new Date(dayStart);
  date.setDate(date.getDate() + offset);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Collects one local day for each completed activity, so multiple sessions count once.
function getCompletedDays(activities: ActivityWithLogs[]): Set<number> {
  return new Set(
    activities
      .filter(activity => activity.completedAt !== null)
      .map(activity => getLocalDayStart(activity.completedAt as number)),
  );
}

// Calculates consecutive completed days, keeping yesterday's streak alive until today ends.
export function calculateDailyStreak(activities: ActivityWithLogs[], now = Date.now()): number {
  const completedDays = getCompletedDays(activities);
  const today = getLocalDayStart(now);
  let cursor = today;

  if (!completedDays.has(cursor)) {
    cursor = shiftLocalDay(cursor, -1);
  }

  let streak = 0;
  while (completedDays.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDay(cursor, -1);
  }

  return streak;
}

// Calculates the longest completed-day streak in the user's history.
export function calculateBestDailyStreak(activities: ActivityWithLogs[]): number {
  const completedDays = getCompletedDays(activities);
  let bestStreak = 0;

  for (const day of completedDays) {
    if (completedDays.has(shiftLocalDay(day, -1))) {
      continue;
    }

    let streak = 1;
    let cursor = shiftLocalDay(day, 1);
    while (completedDays.has(cursor)) {
      streak += 1;
      cursor = shiftLocalDay(cursor, 1);
    }
    bestStreak = Math.max(bestStreak, streak);
  }

  return bestStreak;
}
