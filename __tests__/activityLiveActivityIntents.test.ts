// Overview: Guards the iOS Live Activity intent contract for correctly targeted, in-place Lock Screen controls.

const { readFileSync } = require('node:fs') as { readFileSync(path: string, encoding: string): string };

const intentsSource = readFileSync('ios/ActivityTracker/ActivityLiveActivityIntents.swift', 'utf8');
const liveActivityViewSource = readFileSync('ios/ActivityTrackerLiveActivity/ActivityTrackerLiveActivity.swift', 'utf8');

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

  it('renders a one-second remaining-time countdown that becomes negative after the goal', () => {
    expect(liveActivityViewSource).toContain('TimelineView(.periodic(from: .now, by: 1))');
    expect(liveActivityViewSource).toContain('let remainingMilliseconds = targetMilliseconds - elapsedMilliseconds');
    expect(liveActivityViewSource).toContain('let sign = milliseconds < 0 ? "-" : ""');
  });

  it('uses 56-point controls beside the progress bar', () => {
    expect(liveActivityViewSource).toContain('.frame(width: 56, height: 56)');
    expect(liveActivityViewSource).toContain('HStack(spacing: 10)');
    expect(liveActivityViewSource).toContain('label: "Stop"');
  });
});
