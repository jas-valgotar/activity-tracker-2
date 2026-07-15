// Overview: Verifies every persisted goal color key maps to a unique light card palette.

import { ACTIVITY_COLOR_KEYS } from '../src/domain/activityColor';
import { getActivityPalette } from '../src/ui/activityPalette';

describe('activity palettes', () => {
  it('maps every closed color key to a unique accent and calm card colors', () => {
    const palettes = ACTIVITY_COLOR_KEYS.map(getActivityPalette);

    expect(new Set(palettes.map(palette => palette.accent)).size).toBe(ACTIVITY_COLOR_KEYS.length);
    palettes.forEach(palette => {
      expect(palette.background).toMatch(/^#[0-9A-F]{6}$/);
      expect(palette.border).toMatch(/^#[0-9A-F]{6}$/);
      expect(palette.accent).toMatch(/^#[0-9A-F]{6}$/);
    });
  });
});
