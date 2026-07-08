// Overview: Contains elapsed-time, compact display, and precise display calculations for activity UI and tests.

import type { ActivityEvent, ActivityStatus } from './activityTypes';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const TIMER_FRAME_MINUTES = 30;

type ElapsedInput = {
  events: ActivityEvent[];
  status: ActivityStatus;
  now?: number;
};

type HighlightedSpikeInput = {
  elapsedMs: number;
  showFullRingAtBoundary?: boolean;
};

// Calculates active elapsed time from start/resume intervals while excluding paused time.
export function calculateActiveElapsedMs({
  events,
  status,
  now = Date.now(),
}: ElapsedInput): number {
  const sortedEvents = [...events].sort((left, right) => left.occurredAt - right.occurredAt);
  let elapsedMs = 0;
  let activeStartedAt: number | null = null;

  for (const event of sortedEvents) {
    if (event.type === 'started' || event.type === 'resumed') {
      if (activeStartedAt === null) {
        activeStartedAt = event.occurredAt;
      }
      continue;
    }

    if ((event.type === 'paused' || event.type === 'completed') && activeStartedAt !== null) {
      elapsedMs += Math.max(0, event.occurredAt - activeStartedAt);
      activeStartedAt = null;
    }
  }

  if (status === 'active' && activeStartedAt !== null) {
    elapsedMs += Math.max(0, now - activeStartedAt);
  }

  return elapsedMs;
}

// Returns the number of illuminated minute spikes within the 30-minute timer frame.
export function getHighlightedSpikeCount({
  elapsedMs,
  showFullRingAtBoundary = false,
}: HighlightedSpikeInput): number {
  const elapsedMinutes = Math.floor(elapsedMs / MINUTE_MS);
  const highlightedSpikes = elapsedMinutes % TIMER_FRAME_MINUTES;

  if (showFullRingAtBoundary && elapsedMinutes > 0 && highlightedSpikes === 0) {
    return TIMER_FRAME_MINUTES;
  }

  return highlightedSpikes;
}

// Formats elapsed milliseconds as one-decimal hours for the timer ring center.
export function formatElapsedHours(elapsedMs: number): string {
  return (elapsedMs / HOUR_MS).toFixed(1);
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
