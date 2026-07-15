// Overview: Verifies the ten-second iOS alarm asset, native player, actions, and Xcode resource wiring stay connected.

const { readFileSync } = require('fs');

const notificationSource = readFileSync('ios/ActivityTracker/ActivityNotificationManager.m', 'utf8');
const playerSource = readFileSync('ios/ActivityTracker/ActivityGoalAlarmPlayer.m', 'utf8');
const projectSource = readFileSync('ios/ActivityTracker.xcodeproj/project.pbxproj', 'utf8');
const sound = readFileSync('ios/ActivityTracker/goal-alarm.wav');
const { COMPLETION_NOTICE_DURATION_SECONDS, GOAL_ALERT_VIBRATION_INTERVAL_MS } = require('../src/domain/completionTimer');

describe('iOS goal alarm wiring', () => {
  it('bundles a ten-second supported PCM WAV notification sound', () => {
    expect(sound.toString('ascii', 0, 4)).toBe('RIFF');
    expect(sound.toString('ascii', 8, 12)).toBe('WAVE');
    const byteRate = sound.readUInt32LE(28);
    const dataSize = sound.readUInt32LE(40);
    const durationSeconds = dataSize / byteRate;

    expect(durationSeconds).toBe(COMPLETION_NOTICE_DURATION_SECONDS);
    expect(durationSeconds).toBeLessThan(30);
    expect(projectSource).toContain('goal-alarm.wav in Resources');
  });

  it('uses app-controlled foreground playback without a duplicate system sound', () => {
    expect(notificationSource).toContain('[UNNotificationSound soundNamed:ActivityGoalAlarmSound]');
    expect(notificationSource).toContain('startAlarmForActivityId:activityId');
    expect(notificationSource).toContain('completionHandler(UNNotificationPresentationOptionBanner | UNNotificationPresentationOptionBadge)');
    expect(notificationSource).toContain('ActivityGoalAlarmDurationKey: alarmDurationSeconds');
    expect(notificationSource).toContain('ActivityGoalAlarmVibrationIntervalKey: vibrationIntervalSeconds');
    expect(playerSource).toContain('resolvedDurationSeconds');
    expect(playerSource).toContain('resolvedVibrationIntervalSeconds');
    expect(GOAL_ALERT_VIBRATION_INTERVAL_MS).toBe(1_000);
  });

  it('registers and handles the lock-screen Stop alarm action', () => {
    expect(notificationSource).toContain('ActivityStopGoalAlarmAction');
    expect(notificationSource).toContain('title:@"Stop alarm"');
    expect(notificationSource).toContain('content.categoryIdentifier = ActivityTargetNotificationCategory');
    expect(notificationSource).toContain('actions:@[stopAlarmAction, openFocusAction]');
    expect(notificationSource).toContain('actions:@[openFocusAction]');
    expect(notificationSource).toContain('[response.actionIdentifier isEqual:ActivityStopGoalAlarmAction]');
    expect(notificationSource).toContain('removeDeliveredNotificationsWithIdentifiers');
  });

  it('compiles the reusable player in the main app target', () => {
    expect(projectSource).toContain('ActivityGoalAlarmPlayer.m in Sources');
    expect(projectSource).toContain('ActivityGoalAlarmPlayer.h');
  });
});
