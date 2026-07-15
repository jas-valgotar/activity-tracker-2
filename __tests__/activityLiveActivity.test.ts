// Overview: Verifies the typed React Native Live Activity bridge forwards lifecycle payloads and queued commands.

const nativeManager = {
  startOrUpdate: jest.fn<Promise<boolean>, [unknown]>(),
  end: jest.fn<Promise<void>, [string]>(),
  getCurrentActivityId: jest.fn<Promise<string | null>, []>(),
  consumeCommands: jest.fn<Promise<unknown[]>, []>(),
  acknowledgeCommands: jest.fn<Promise<void>, [string[]]>(),
};

let liveActivityService: typeof import('../src/services/activityLiveActivity');

describe('activity Live Activity bridge', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    nativeManager.startOrUpdate.mockResolvedValue(true);
    nativeManager.end.mockResolvedValue(undefined);
    nativeManager.getCurrentActivityId.mockResolvedValue('activity-1');
    nativeManager.consumeCommands.mockResolvedValue([
      { commandId: 'command-1', activityId: 'activity-1', action: 'pause', occurredAt: 20_000 },
      { commandId: 'command-2', activityId: 'activity-1', action: 'resume', occurredAt: 30_000 },
      { commandId: 'command-3', activityId: 'activity-1', action: 'complete', occurredAt: 40_000 },
    ]);
    nativeManager.acknowledgeCommands.mockResolvedValue(undefined);
    jest.doMock('react-native', () => ({
      NativeModules: { ActivityLiveActivityManager: nativeManager },
      Platform: { OS: 'ios' },
    }));
    liveActivityService = require('../src/services/activityLiveActivity');
  });

  it('forwards a typed activity payload to the native manager', async () => {
    const payload = {
      activityId: 'activity-1',
      colorKey: 3 as const,
      title: 'Write tests',
      targetDurationMinutes: 60,
      status: 'active' as const,
      elapsedMilliseconds: 12_000,
    };

    await expect(liveActivityService.startOrUpdateLiveActivity(payload)).resolves.toBe(true);
    expect(nativeManager.startOrUpdate).toHaveBeenCalledWith(payload);
  });

  it('preserves command order and acknowledges exact command identifiers', async () => {
    await expect(liveActivityService.consumeLiveActivityCommands()).resolves.toEqual([
      { commandId: 'command-1', activityId: 'activity-1', action: 'pause', occurredAt: 20_000 },
      { commandId: 'command-2', activityId: 'activity-1', action: 'resume', occurredAt: 30_000 },
      { commandId: 'command-3', activityId: 'activity-1', action: 'complete', occurredAt: 40_000 },
    ]);

    await liveActivityService.acknowledgeLiveActivityCommands(['command-1', 'command-2', 'command-3']);
    expect(nativeManager.acknowledgeCommands).toHaveBeenCalledWith(['command-1', 'command-2', 'command-3']);
  });

  it('returns a safe no-op result when the native Live Activity manager is unavailable', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      NativeModules: {},
      Platform: { OS: 'android' },
    }));
    const unavailableService = require('../src/services/activityLiveActivity') as typeof liveActivityService;

    await expect(unavailableService.startOrUpdateLiveActivity({
      activityId: 'activity-1',
      colorKey: 3,
      title: 'Write tests',
      targetDurationMinutes: 60,
      status: 'active',
      elapsedMilliseconds: 0,
    })).resolves.toBe(false);
    await expect(unavailableService.consumeLiveActivityCommands()).resolves.toEqual([]);
  });
});
