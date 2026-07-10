// Overview: Tests elapsed-time and timer-ring calculations for active, paused, and completed activities.

import type { ActivityEvent, ActivityEventType, ActivityStatus } from '../src/domain/activityTypes';
import {
  buildProgressReport,
  calculateActiveElapsedMs,
  formatDuration,
  formatDurationWithSeconds,
  formatElapsedHours,
  getHighlightedSpikeCount,
} from '../src/domain/time';

// Creates a minimal activity event for elapsed-time tests.
function event(type: ActivityEventType, occurredAt: number): ActivityEvent {
  return {
    id: `${type}-${occurredAt}`,
    activityId: 'activity-1',
    type,
    occurredAt,
  };
}

// Calculates elapsed milliseconds for a compact test event list.
function elapsed(events: ActivityEvent[], status: ActivityStatus, now: number): number {
  return calculateActiveElapsedMs({ events, status, now });
}

describe('activity time calculations', () => {
  it('fills the default 60-minute timer proportionally across 30 segments', () => {
    expect(getHighlightedSpikeCount({ elapsedMs: 0 })).toBe(0);
    expect(getHighlightedSpikeCount({ elapsedMs: 14 * 60 * 1000 })).toBe(7);
    expect(getHighlightedSpikeCount({ elapsedMs: 30 * 60 * 1000 })).toBe(15);
    expect(getHighlightedSpikeCount({ elapsedMs: 59 * 60 * 1000 })).toBe(29);
    expect(getHighlightedSpikeCount({ elapsedMs: 60 * 60 * 1000 })).toBe(30);
    expect(getHighlightedSpikeCount({ elapsedMs: 90 * 60 * 1000 })).toBe(30);
  });

  it('fills at the selected target duration', () => {
    expect(getHighlightedSpikeCount({ elapsedMs: 0, showFullRingAtBoundary: true })).toBe(0);
    expect(getHighlightedSpikeCount({ elapsedMs: 15 * 60 * 1000, targetDurationMinutes: 30 })).toBe(15);
    expect(getHighlightedSpikeCount({ elapsedMs: 30 * 60 * 1000, targetDurationMinutes: 30 })).toBe(30);
    expect(getHighlightedSpikeCount({ elapsedMs: 45 * 60 * 1000, targetDurationMinutes: 30 })).toBe(30);
    expect(getHighlightedSpikeCount({ elapsedMs: 60 * 60 * 1000, showFullRingAtBoundary: true })).toBe(30);
  });

  it('formats elapsed hours with one decimal place', () => {
    expect(formatElapsedHours(25 * 60 * 1000)).toBe('0.4');
    expect(formatElapsedHours(90 * 60 * 1000)).toBe('1.5');
  });

  it('formats compact durations with up to two units from seconds through days', () => {
    const cases = [
      [0, '0s'],
      [1_000, '1s'],
      [60 * 1000, '60s'],
      [61 * 1000, '1m1s'],
      [50 * 60 * 1000 + 1_000, '50m1s'],
      [60 * 60 * 1000, '60m'],
      [61 * 60 * 1000, '1h1m'],
      [80 * 60 * 1000, '1h20m'],
      [24 * 60 * 60 * 1000, '24h'],
      [25 * 60 * 60 * 1000, '1d1h'],
      [365 * 24 * 60 * 60 * 1000, '365d'],
    ] as const;

    cases.forEach(([elapsedMs, formattedDuration]) => {
      expect(formatDuration(elapsedMs)).toBe(formattedDuration);
    });
  });

  it('formats detailed durations with second precision', () => {
    expect(formatDurationWithSeconds(999)).toBe('0s');
    expect(formatDurationWithSeconds(61_000)).toBe('1m 1s');
    expect(formatDurationWithSeconds(75 * 60 * 1000 + 3_000)).toBe('1h 15m 3s');
    expect(formatDurationWithSeconds(26 * 60 * 60 * 1000 + 4_000)).toBe('1d 2h 0m 4s');
  });

  it('excludes paused intervals from active elapsed time', () => {
    const events = [
      event('started', 0),
      event('paused', 10 * 60 * 1000),
      event('resumed', 20 * 60 * 1000),
    ];

    expect(elapsed(events, 'active', 35 * 60 * 1000)).toBe(25 * 60 * 1000);
  });

  it('calculates elapsed time from unordered lifecycle events', () => {
    const events = [
      event('resumed', 20 * 60 * 1000),
      event('completed', 40 * 60 * 1000),
      event('started', 0),
      event('paused', 10 * 60 * 1000),
    ];

    expect(elapsed(events, 'completed', 60 * 60 * 1000)).toBe(30 * 60 * 1000);
  });

  it('ignores duplicate start and resume events while already active', () => {
    const events = [
      event('started', 0),
      event('started', 5 * 60 * 1000),
      event('paused', 10 * 60 * 1000),
      event('resumed', 20 * 60 * 1000),
      event('resumed', 25 * 60 * 1000),
    ];

    expect(elapsed(events, 'active', 35 * 60 * 1000)).toBe(25 * 60 * 1000);
  });

  it('freezes completed activities at completion time', () => {
    const events = [event('started', 0), event('completed', 25 * 60 * 1000)];

    expect(elapsed(events, 'completed', 60 * 60 * 1000)).toBe(25 * 60 * 1000);
  });

  it('does not let clock-skewed events produce negative elapsed time', () => {
    const events = [event('started', 20 * 60 * 1000), event('paused', 10 * 60 * 1000)];

    expect(elapsed(events, 'paused', 60 * 60 * 1000)).toBe(0);
  });

  it('clips active intervals into weekly, monthly, and quarterly buckets', () => {
    const startedAt = new Date(2026, 6, 13, 9, 0, 0).getTime();
    const completedAt = new Date(2026, 6, 13, 10, 30, 0).getTime();
    const now = new Date(2026, 6, 15, 12, 0, 0).getTime();
    const activity = {
      id: 'progress-1',
      title: 'Focused session',
      status: 'completed' as const,
      startedAt,
      targetDurationMinutes: 60,
      completedAt,
      lastAccessedAt: completedAt,
      deletedAt: null,
      events: [event('started', startedAt), event('completed', completedAt)],
    };

    const weekly = buildProgressReport([activity], 'week', now);
    const monthly = buildProgressReport([activity], 'month', now);
    const quarterly = buildProgressReport([activity], 'quarter', now);

    expect(weekly.totalActiveMs).toBe(90 * 60 * 1000);
    expect(weekly.sessionsStarted).toBe(1);
    expect(weekly.sessionsCompleted).toBe(1);
    expect(weekly.buckets).toHaveLength(7);
    expect(monthly.buckets).toHaveLength(5);
    expect(quarterly.buckets).toHaveLength(3);
    expect(quarterly.buckets[0]?.activeMs).toBe(90 * 60 * 1000);
  });
});
