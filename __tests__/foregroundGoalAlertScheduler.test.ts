// Overview: Verifies foreground goal alerts fire once, stop exactly, and follow activity lifecycle cancellation.

import type { ActivityWithLogs } from '../src/domain/activityTypes';
import {
  ForegroundGoalAlertScheduler,
  type ForegroundGoalAlert,
} from '../src/services/foregroundGoalAlertScheduler';

const MINUTE_MS = 60_000;

// Creates a one-minute active activity whose elapsed time is controlled by Jest's clock.
function activity(overrides: Partial<ActivityWithLogs> = {}): ActivityWithLogs {
  return {
    id: 'activity-1',
    title: 'Deep work',
    status: 'active',
    startedAt: 0,
    targetDurationMinutes: 1,
    completedAt: null,
    lastAccessedAt: 0,
    deletedAt: null,
    events: [{ id: 'event-start', activityId: 'activity-1', type: 'started', occurredAt: 0 }],
    ...overrides,
  };
}

describe('ForegroundGoalAlertScheduler', () => {
  let foreground: boolean;
  let onStart: jest.Mock<void, [ForegroundGoalAlert]>;
  let onStop: jest.Mock<void, [string]>;
  let scheduler: ForegroundGoalAlertScheduler;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    foreground = true;
    onStart = jest.fn();
    onStop = jest.fn();
    scheduler = new ForegroundGoalAlertScheduler({
      durationMs: 10_000,
      isForeground: () => foreground,
      onStart,
      onStop,
    });
  });

  afterEach(() => {
    scheduler.dispose();
    jest.useRealTimers();
  });

  it('starts at the goal and stops after exactly ten seconds', () => {
    scheduler.schedule(activity(), 0);
    jest.advanceTimersByTime(MINUTE_MS);

    expect(onStart).toHaveBeenCalledWith({
      activityId: 'activity-1',
      title: 'Deep work',
      expiresAt: MINUTE_MS + 10_000,
    });

    jest.advanceTimersByTime(9_999);
    expect(onStop).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onStop).toHaveBeenCalledWith('activity-1');
  });

  it('stops immediately and never starts when completed before the goal', () => {
    scheduler.schedule(activity(), 0);
    jest.advanceTimersByTime(30_000);
    scheduler.cancel('activity-1');
    jest.advanceTimersByTime(MINUTE_MS);

    expect(onStart).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledWith('activity-1');
  });

  it('stops an alarm immediately when the activity completes during playback', () => {
    scheduler.schedule(activity(), 0);
    jest.advanceTimersByTime(MINUTE_MS);
    scheduler.cancel('activity-1');

    expect(onStop).toHaveBeenCalledWith('activity-1');
    jest.advanceTimersByTime(10_000);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('does not start foreground playback when the target is crossed in the background', () => {
    foreground = false;
    scheduler.schedule(activity(), 0);
    jest.advanceTimersByTime(MINUTE_MS);

    expect(onStart).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('alerts only once per activity even if it is scheduled again', () => {
    scheduler.schedule(activity(), 0);
    jest.advanceTimersByTime(MINUTE_MS + 10_000);
    scheduler.schedule(activity(), Date.now());
    jest.advanceTimersByTime(MINUTE_MS + 10_000);

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('does not replay an activity that is already overdue at initialization', () => {
    jest.setSystemTime(2 * MINUTE_MS);
    scheduler.schedule(activity(), Date.now());
    jest.runOnlyPendingTimers();

    expect(onStart).not.toHaveBeenCalled();
  });

  it('allows a pre-goal pause to cancel and a later resume to reschedule remaining active time', () => {
    scheduler.schedule(activity(), 0);
    jest.advanceTimersByTime(20_000);
    scheduler.cancel('activity-1');
    jest.setSystemTime(40_000);
    scheduler.schedule(activity({
      events: [
        { id: 'event-start', activityId: 'activity-1', type: 'started', occurredAt: 0 },
        { id: 'event-pause', activityId: 'activity-1', type: 'paused', occurredAt: 20_000 },
        { id: 'event-resume', activityId: 'activity-1', type: 'resumed', occurredAt: 40_000 },
      ],
    }), 40_000);
    jest.advanceTimersByTime(39_999);
    expect(onStart).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('ignores completed and paused activities', () => {
    scheduler.schedule(activity({ status: 'completed', completedAt: 1 }), 0);
    scheduler.schedule(activity({ status: 'paused' }), 0);
    jest.runOnlyPendingTimers();

    expect(onStart).not.toHaveBeenCalled();
  });
});
