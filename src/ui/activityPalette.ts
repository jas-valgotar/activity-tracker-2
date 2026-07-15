// Overview: Provides deterministic grayscale palettes that give activity list cards gentle tonal separation.

export type ActivityPalette = {
  background: string;
  border: string;
  accent: string;
};

const ACTIVITY_PALETTES: ActivityPalette[] = [
  { background: '#FAFAFA', border: '#D4D4D8', accent: '#18181B' },
  { background: '#F5F5F5', border: '#D4D4D8', accent: '#27272A' },
  { background: '#F0F0F1', border: '#C9C9CE', accent: '#3F3F46' },
  { background: '#EBEBED', border: '#C4C4C8', accent: '#52525B' },
  { background: '#F7F7F8', border: '#D0D0D4', accent: '#27272A' },
  { background: '#EFEFF0', border: '#C8C8CC', accent: '#3F3F46' },
  { background: '#F3F3F4', border: '#CCCCD0', accent: '#18181B' },
  { background: '#E9E9EB', border: '#C2C2C6', accent: '#52525B' },
];

// Assigns each visible row a distinct palette before cycling for longer lists.
export function getActivityPalette(index: number): ActivityPalette {
  return ACTIVITY_PALETTES[index % ACTIVITY_PALETTES.length];
}
