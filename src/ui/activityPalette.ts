// Overview: Provides deterministic, iOS-inspired color palettes for activity list cards.

export type ActivityPalette = {
  background: string;
  border: string;
  accent: string;
};

const ACTIVITY_PALETTES: ActivityPalette[] = [
  { background: '#EEF5FF', border: '#B9D7FF', accent: '#007AFF' },
  { background: '#ECFAF7', border: '#B6E5DA', accent: '#00A88F' },
  { background: '#F1F0FF', border: '#C9C6FF', accent: '#5856D6' },
  { background: '#F7F0FF', border: '#DEC5FF', accent: '#AF52DE' },
  { background: '#FFF1F5', border: '#FFC9D8', accent: '#FF2D55' },
  { background: '#FFF6EA', border: '#FFD7A3', accent: '#FF9500' },
  { background: '#F0FAF1', border: '#BFE8C8', accent: '#34C759' },
  { background: '#EDF9FC', border: '#B5E8F0', accent: '#32ADE6' },
];

// Assigns each visible row a distinct palette before cycling for longer lists.
export function getActivityPalette(index: number): ActivityPalette {
  return ACTIVITY_PALETTES[index % ACTIVITY_PALETTES.length];
}
