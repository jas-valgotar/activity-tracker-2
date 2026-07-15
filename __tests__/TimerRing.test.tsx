// Overview: Guards the active hourglass rendering rule without starting a native animation in Jest.

export {};

const { readFileSync } = require('node:fs') as { readFileSync(path: string, encoding: string): string };

const timerRingSource = readFileSync('src/ui/TimerRing.tsx', 'utf8');

describe('TimerRing', () => {
  it('continues rendering the active sand stream after the target is reached', () => {
    expect(timerRingSource).toContain('{blinkNextSpike && !frozen ? (');
    expect(timerRingSource).not.toContain('{blinkNextSpike && !frozen && !isAtEnd ? (');
  });

  it('keeps a completed goal using its assigned accent color', () => {
    expect(timerRingSource).toContain('const sandColor = accentColor;');
  });
});
