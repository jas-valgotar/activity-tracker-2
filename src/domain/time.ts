// Overview: Contains elapsed-time, compact display, and precise display calculations for activity UI and tests.

import type {
  ActivityEvent,
  ActivityStatus,
  ActivityWithLogs,
  ProgressBucket,
  ProgressPeriod,
  ProgressReport,
} from './activityTypes';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
export const DEFAULT_TARGET_DURATION_MINUTES = 60;
export const MIN_TARGET_DURATION_MINUTES = 15;
export const MAX_TARGET_DURATION_MINUTES = 8 * 60;
export const TIMER_FRAME_SEGMENTS = 30;

type ElapsedInput = {
  events: ActivityEvent[];
  status: ActivityStatus;
  now?: number;
};

type HighlightedSpikeInput = {
  elapsedMs: number;
  targetDurationMinutes?: number;
  showFullRingAtBoundary?: boolean;
};

export type ActivityInterval = {
  startAt: number;
  endAt: number;
};

// Returns whether a target duration is a supported whole-minute value in the allowed range.
export function isValidTargetDurationMinutes(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_TARGET_DURATION_MINUTES &&
    value <= MAX_TARGET_DURATION_MINUTES
  );
}

// Applies the app default when older data or an optional UI value has no target.
export function normalizeTargetDurationMinutes(value?: number | null): number {
  return value !== undefined && value !== null && isValidTargetDurationMinutes(value)
    ? value
    : DEFAULT_TARGET_DURATION_MINUTES;
}

// Calculates active elapsed time from start/resume intervals while excluding paused time.
export function calculateActiveElapsedMs({
  events,
  status,
  now = Date.now(),
}: ElapsedInput): number {
  return getActiveIntervals(events, status, now).reduce(
    (total, interval) => total + Math.max(0, interval.endAt - interval.startAt),
    0,
  );
}

// Converts lifecycle events into active intervals shared by timer and progress calculations.
export function getActiveIntervals(
  events: ActivityEvent[],
  status: ActivityStatus,
  now = Date.now(),
): ActivityInterval[] {
  const sortedEvents = [...events].sort((left, right) => left.occurredAt - right.occurredAt);
  const intervals: ActivityInterval[] = [];
  let activeStartedAt: number | null = null;

  for (const event of sortedEvents) {
    if (event.type === 'started' || event.type === 'resumed') {
      if (activeStartedAt === null) {
        activeStartedAt = event.occurredAt;
      }
      continue;
    }

    if ((event.type === 'paused' || event.type === 'completed') && activeStartedAt !== null) {
      intervals.push({
        startAt: activeStartedAt,
        endAt: Math.max(activeStartedAt, event.occurredAt),
      });
      activeStartedAt = null;
    }
  }

  if (status === 'active' && activeStartedAt !== null) {
    intervals.push({
      startAt: activeStartedAt,
      endAt: Math.max(activeStartedAt, now),
    });
  }

  return intervals;
}

// Returns the number of illuminated spikes in the target-duration timer frame.
export function getHighlightedSpikeCount({
  elapsedMs,
  targetDurationMinutes = DEFAULT_TARGET_DURATION_MINUTES,
  showFullRingAtBoundary = false,
}: HighlightedSpikeInput): number {
  const targetMs = normalizeTargetDurationMinutes(targetDurationMinutes) * MINUTE_MS;
  const boundedElapsedMs = Math.max(0, elapsedMs);
  const highlightedSpikes = Math.floor((boundedElapsedMs / targetMs) * TIMER_FRAME_SEGMENTS);

  if (showFullRingAtBoundary && boundedElapsedMs >= targetMs) {
    return TIMER_FRAME_SEGMENTS;
  }

  return Math.min(TIMER_FRAME_SEGMENTS, highlightedSpikes);
}

// Converts active time into a capped percentage of the activity's selected target.
export function getTargetProgressPercent(activeMs: number, targetDurationMinutes: number): number {
  const targetMs = normalizeTargetDurationMinutes(targetDurationMinutes) * MINUTE_MS;
  return Math.min(100, Math.max(0, (Math.max(0, activeMs) / targetMs) * 100));
}

// Formats elapsed milliseconds as one-decimal hours for the timer ring center.
export function formatElapsedHours(elapsedMs: number): string {
  return (elapsedMs / HOUR_MS).toFixed(1);
}

// Formats a selected target duration for compact UI labels.
export function formatTargetDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${safeMinutes}m`;
  }

  return remainingMinutes === 0 ? `${hours}h` : `${hours}h${remainingMinutes}m`;
}

// Formats an event timestamp for display in the activity detail log.
export function formatEventTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// Formats elapsed milliseconds using up to two compact units for dense list and ring labels.
export function formatDuration(elapsedMs: number): string {
  const safeElapsedMs = Math.max(0, elapsedMs);
  const totalSeconds = Math.floor(safeElapsedMs / SECOND_MS);

  if (totalSeconds <= 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(safeElapsedMs / MINUTE_MS);
  const seconds = totalSeconds % 60;

  if (safeElapsedMs <= HOUR_MS) {
    return seconds > 0 ? `${totalMinutes}m${seconds}s` : `${totalMinutes}m`;
  }

  const totalHours = Math.floor(safeElapsedMs / HOUR_MS);
  const minutes = totalMinutes % 60;

  if (safeElapsedMs <= DAY_MS) {
    return minutes > 0 ? `${totalHours}h${minutes}m` : `${totalHours}h`;
  }

  const days = Math.floor(safeElapsedMs / DAY_MS);
  const hours = totalHours % 24;

  return hours > 0 ? `${days}d${hours}h` : `${days}d`;
}

// Formats elapsed milliseconds as a readable total duration that keeps seconds visible.
export function formatDurationWithSeconds(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / SECOND_MS));
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0 || parts.length > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || parts.length > 0) {
    parts.push(`${minutes}m`);
  }

  parts.push(`${seconds}s`);

  return parts.join(' ');
}

// Builds local-calendar buckets for the requested progress period.
function getProgressBuckets(period: ProgressPeriod, now: number): ProgressBucket[] {
  const current = new Date(now);

  if (period === 'week') {
    const dayOfWeek = current.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(current.getFullYear(), current.getMonth(), current.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, index) => {
      const bucketStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const bucketEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index + 1);
      return createProgressBucket(
        `${bucketStart.getFullYear()}-${bucketStart.getMonth() + 1}-${bucketStart.getDate()}`,
        bucketStart.toLocaleDateString(undefined, { weekday: 'short' }),
        bucketStart.getTime(),
        bucketEnd.getTime(),
      );
    });
  }

  if (period === 'month') {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const nextMonthStart = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    const buckets: ProgressBucket[] = [];
    let bucketStart = monthStart;
    let index = 1;

    while (bucketStart.getTime() < nextMonthStart.getTime()) {
      const bucketEnd = new Date(
        Math.min(
          new Date(bucketStart.getFullYear(), bucketStart.getMonth(), bucketStart.getDate() + 7).getTime(),
          nextMonthStart.getTime(),
        ),
      );
      buckets.push(createProgressBucket(`week-${index}`, `W${index}`, bucketStart.getTime(), bucketEnd.getTime()));
      bucketStart = bucketEnd;
      index += 1;
    }

    return buckets;
  }

  const quarterStartMonth = Math.floor(current.getMonth() / 3) * 3;

  return Array.from({ length: 3 }, (_, index) => {
    const bucketStart = new Date(current.getFullYear(), quarterStartMonth + index, 1);
    const bucketEnd = new Date(current.getFullYear(), quarterStartMonth + index + 1, 1);
    return createProgressBucket(
      `${bucketStart.getFullYear()}-${bucketStart.getMonth() + 1}`,
      bucketStart.toLocaleDateString(undefined, { month: 'short' }),
      bucketStart.getTime(),
      bucketEnd.getTime(),
    );
  });
}

// Creates an empty progress bucket ready for interval and session aggregation.
function createProgressBucket(key: string, label: string, startAt: number, endAt: number): ProgressBucket {
  return {
    key,
    label,
    startAt,
    endAt,
    activeMs: 0,
    sessionsStarted: 0,
    sessionsCompleted: 0,
  };
}

// Aggregates local activity history into weekly, monthly, or quarterly progress.
export function buildProgressReport(
  activities: ActivityWithLogs[],
  period: ProgressPeriod,
  now = Date.now(),
): ProgressReport {
  const buckets = getProgressBuckets(period, now);
  const startAt = buckets[0]?.startAt ?? now;
  const endAt = buckets[buckets.length - 1]?.endAt ?? now;
  let totalActiveMs = 0;
  let sessionsStarted = 0;
  let sessionsCompleted = 0;

  for (const activity of activities) {
    const activityIntervals = getActiveIntervals(activity.events, activity.status, now);
    const startedBucket = findBucket(buckets, activity.startedAt);
    const completedBucket = activity.completedAt === null ? null : findBucket(buckets, activity.completedAt);

    if (startedBucket) {
      startedBucket.sessionsStarted += 1;
      sessionsStarted += 1;
    }

    if (completedBucket) {
      completedBucket.sessionsCompleted += 1;
      sessionsCompleted += 1;
    }

    for (const interval of activityIntervals) {
      for (const bucket of buckets) {
        const overlapStart = Math.max(interval.startAt, bucket.startAt);
        const overlapEnd = Math.min(interval.endAt, bucket.endAt);
        if (overlapEnd <= overlapStart) {
          continue;
        }

        const activeMs = overlapEnd - overlapStart;
        bucket.activeMs += activeMs;
        totalActiveMs += activeMs;
      }
    }
  }

  return {
    period,
    startAt,
    endAt,
    totalActiveMs,
    sessionsStarted,
    sessionsCompleted,
    buckets,
  };
}

// Finds the local-calendar bucket containing a timestamp.
function findBucket(buckets: ProgressBucket[], timestamp: number): ProgressBucket | null {
  return buckets.find(bucket => timestamp >= bucket.startAt && timestamp < bucket.endAt) ?? null;
}
