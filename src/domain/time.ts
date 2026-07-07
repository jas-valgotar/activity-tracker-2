// Overview: Contains elapsed-time and timer-ring calculations for activity rows and tests.

import type { ActivityEvent, ActivityStatus } from './activityTypes';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const RING_MINUTES = 15;

type ElapsedInput = {
  events: ActivityEvent[];
  status: ActivityStatus;
  now?: number;
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

// Returns the number of illuminated minute spikes within the 15-minute timer ring.
export function getHighlightedSpikeCount(elapsedMs: number): number {
  return Math.floor(elapsedMs / MINUTE_MS) % RING_MINUTES;
}

// Formats elapsed milliseconds as one-decimal hours for the timer ring center.
export function formatElapsedHours(elapsedMs: number): string {
  return (elapsedMs / HOUR_MS).toFixed(1);
}

// Formats an event timestamp for display in the activity detail log.
export function formatEventTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// Formats elapsed milliseconds as a compact hour-and-minute label.
export function formatDuration(elapsedMs: number): string {
  const totalMinutes = Math.floor(elapsedMs / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}
