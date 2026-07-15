// Overview: Maps persisted goal color keys to calm pastel palettes with grayscale-friendly borders and accents.

import type { ActivityColorKey } from '../domain/activityColor';

export type ActivityPalette = {
  background: string;
  border: string;
  accent: string;
};

const ACTIVITY_PALETTES: Record<ActivityColorKey, ActivityPalette> = {
  0: { background: '#F3F9FD', border: '#C9E0F0', accent: '#5E9BC7' },
  1: { background: '#F4FAF5', border: '#CCE4D2', accent: '#70A884' },
  2: { background: '#FFFBEF', border: '#EDDCAD', accent: '#C39A45' },
  3: { background: '#F8F5FC', border: '#DCD1ED', accent: '#9C87C3' },
  4: { background: '#FDF5F7', border: '#EDCED8', accent: '#C77A92' },
  5: { background: '#F1FAF8', border: '#C4E5E0', accent: '#64A9A0' },
  6: { background: '#FDF6F2', border: '#EDD2C4', accent: '#C58669' },
  7: { background: '#F4F6FC', border: '#CDD6EB', accent: '#7D96C6' },
};

// Returns the palette assigned to one activity independently of list order.
export function getActivityPalette(colorKey: ActivityColorKey): ActivityPalette {
  return ACTIVITY_PALETTES[colorKey];
}
