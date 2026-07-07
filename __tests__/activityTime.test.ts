// Overview: Tests elapsed-time and timer-ring calculations for active, paused, and completed activities.

import type { ActivityEvent, ActivityEventType, ActivityStatus } from '../src/domain/activityTypes';
import { calculateActiveElapsedMs, formatElapsedHours, getHighlightedSpikeCount } from '../src/domain/time';

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
  it('highlights timer spikes using the elapsed minute modulo 15 rule', () => {
    expect(getHighlightedSpikeCount(0)).toBe(0);
    expect(getHighlightedSpikeCount(14 * 60 * 1000)).toBe(14);
    expect(getHighlightedSpikeCount(15 * 60 * 1000)).toBe(0);
    expect(getHighlightedSpikeCount(25 * 60 * 1000)).toBe(10);
    expect(getHighlightedSpikeCount(60 * 60 * 1000)).toBe(0);
  });

  it('formats elapsed hours with one decimal place', () => {
    expect(formatElapsedHours(25 * 60 * 1000)).toBe('0.4');
  });

  it('excludes paused intervals from active elapsed time', () => {
    const events = [
      event('started', 0),
      event('paused', 10 * 60 * 1000),
      event('resumed', 20 * 60 * 1000),
    ];

    expect(elapsed(events, 'active', 35 * 60 * 1000)).toBe(25 * 60 * 1000);
  });

  it('freezes completed activities at completion time', () => {
    const events = [event('started', 0), event('completed', 25 * 60 * 1000)];

    expect(elapsed(events, 'completed', 60 * 60 * 1000)).toBe(25 * 60 * 1000);
  });
});
