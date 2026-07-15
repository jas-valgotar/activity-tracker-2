// Overview: Guards the iOS Live Activity intent contract for correctly targeted, in-place Lock Screen controls.

export {};

const { readFileSync } = require('node:fs') as { readFileSync(path: string, encoding: string): string };

const intentsSource = readFileSync('ios/ActivityTracker/ActivityLiveActivityIntents.swift', 'utf8');
const liveActivityViewSource = readFileSync('ios/ActivityTrackerLiveActivity/ActivityTrackerLiveActivity.swift', 'utf8');
const liveActivityManagerSource = readFileSync('ios/ActivityTracker/ActivityLiveActivityManager.swift', 'utf8');
const liveActivityAttributesSource = readFileSync('ios/ActivityTracker/ActivityLiveActivityAttributes.swift', 'utf8');

function intentDeclaration(name: string): string {
  const declaration = new RegExp(`struct ${name}: LiveActivityIntent \\{([\\s\\S]*?)(?=\\n@available|$)`);
  return intentsSource.match(declaration)?.[0] ?? '';
}

describe('Live Activity control intents', () => {
  it.each(['PauseActivityIntent', 'ResumeActivityIntent', 'CompleteActivityIntent'])(
    'preserves the activity identifier and keeps the app closed after %s runs',
    intentName => {
      const source = intentDeclaration(intentName);
      expect(source).toContain('static var openAppWhenRun: Bool = false');
      expect(source).toContain('@Parameter(title: "Activity identifier")');
      expect(source).toContain('var activityId: String');
    },
  );

  it('does not add a whole-card deep link that intercepts control button taps', () => {
    expect(liveActivityViewSource).not.toContain('.widgetURL(');
  });

  it('renders a system-managed one-second remaining-time countdown while active', () => {
    expect(liveActivityViewSource).toContain('Text(\n        timerInterval: countdownRange,');
    expect(liveActivityViewSource).toContain('countsDown: true');
    expect(liveActivityViewSource).toContain('.monospacedDigit()');
    expect(liveActivityViewSource).toContain('RemainingTimeLabel(context: context)');
    expect(liveActivityViewSource).toContain('return targetMilliseconds - elapsedMilliseconds');
    expect(liveActivityViewSource).toContain('let sign = milliseconds < 0 ? "-" : ""');
    expect(liveActivityViewSource).toContain('"\\(sign)\\(hours)h\\(minutes)m"');
    expect(liveActivityViewSource).toContain('"\\(sign)\\(minutes)m\\(seconds)s"');
  });

  it('uses 56-point controls beside the progress bar', () => {
    expect(liveActivityViewSource).toContain('.frame(width: 56, height: 56)');
    expect(liveActivityViewSource).toContain('HStack(spacing: 10)');
    expect(liveActivityViewSource).toContain('label: "Stop"');
  });

  it('synchronizes local target and pause reminders before queued commands reach JavaScript', () => {
    expect(intentsSource).toContain('ActivityIntentNotifications.pause(activityId: activityId, title: activity.attributes.title)');
    expect(intentsSource).toContain('ActivityIntentNotifications.resume(');
    expect(intentsSource).toContain('ActivityIntentNotifications.complete(activityId: activityId)');
    expect(intentsSource).toContain('removePendingNotificationRequests');
    expect(intentsSource).toContain('UNTimeIntervalNotificationTrigger');
  });

  it('uses the persisted goal color key with a safe upgrade fallback', () => {
    expect(liveActivityManagerSource).toContain('let colorKey = payload["colorKey"] as? NSNumber');
    expect(liveActivityManagerSource).toContain('(0...7).contains(colorKey.intValue)');
    expect(liveActivityManagerSource).toContain('existing.attributes.colorKey == colorKey.intValue');
    expect(liveActivityAttributesSource).toContain('let colorKey: Int?');
    expect(liveActivityViewSource).toContain('LiveActivityPalette.forKey(context.attributes.colorKey)');
  });
});
