// Overview: Verifies notification timing follows active lifecycle time and never alerts for inactive targets.

import type { ActivityWithLogs } from '../src/domain/activityTypes';

const notificationManager = {
  requestPermission: jest.fn<Promise<boolean>, []>(),
  scheduleTargetNotification: jest.fn<Promise<void>, [string, string, number]>(),
  cancelTargetNotification: jest.fn<void, [string]>(),
};

let notificationService: typeof import('../src/services/activityNotifications');

// Creates a compact activity fixture with a configurable lifecycle and target.
function activity(overrides: Partial<ActivityWithLogs>): ActivityWithLogs {
  const startedAt = 0;
  return {
    id: 'activity-1',
    title: 'Meditation',
    status: 'active',
    startedAt,
    targetDurationMinutes: 60,
    completedAt: null,
    lastAccessedAt: startedAt,
    deletedAt: null,
    events: [{ id: 'event-start', activityId: 'activity-1', type: 'started', occurredAt: startedAt }],
    ...overrides,
  };
}

describe('activity target notifications', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    notificationManager.requestPermission.mockResolvedValue(true);
    notificationManager.scheduleTargetNotification.mockResolvedValue(undefined);
    jest.doMock('react-native', () => {
      return {
        NativeModules: { ActivityNotificationManager: notificationManager },
      };
    });
    notificationService = require('../src/services/activityNotifications');
  });

  it('schedules only the remaining active time', async () => {
    await notificationService.scheduleActivityTargetNotification(activity({}), 30 * 60 * 1000);

    expect(notificationManager.requestPermission).toHaveBeenCalledTimes(1);
    expect(notificationManager.cancelTargetNotification).toHaveBeenCalledWith('activity-1');
    expect(notificationManager.scheduleTargetNotification).toHaveBeenCalledWith(
      'activity-1',
      'Meditation reached its 1 hour focus target.',
      30 * 60,
    );
  });

  it('cancels but does not schedule paused or completed activities', async () => {
    const now = 30 * 60 * 1000;

    await notificationService.scheduleActivityTargetNotification(
      activity({
        status: 'paused',
        events: [
          { id: 'event-start', activityId: 'activity-1', type: 'started', occurredAt: 0 },
          { id: 'event-pause', activityId: 'activity-1', type: 'paused', occurredAt: 15 * 60 * 1000 },
        ],
      }),
      now,
    );
    await notificationService.scheduleActivityTargetNotification(activity({ status: 'completed', completedAt: now }), now);

    expect(notificationManager.cancelTargetNotification).toHaveBeenCalledTimes(2);
    expect(notificationManager.scheduleTargetNotification).not.toHaveBeenCalled();
  });

  it('does not schedule an active activity after its target has elapsed', async () => {
    await notificationService.scheduleActivityTargetNotification(activity({}), 61 * 60 * 1000);

    expect(notificationManager.cancelTargetNotification).toHaveBeenCalledWith('activity-1');
    expect(notificationManager.scheduleTargetNotification).not.toHaveBeenCalled();
  });
});
