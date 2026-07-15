// Overview: Defines the closed, persistence-safe set of automatic goal color keys and allocation helpers.

export const ACTIVITY_COLOR_KEYS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export type ActivityColorKey = typeof ACTIVITY_COLOR_KEYS[number];

export const DEFAULT_ACTIVITY_COLOR_KEY: ActivityColorKey = ACTIVITY_COLOR_KEYS[0];

// Converts persisted numeric values into the closed color-key set with a safe legacy fallback.
export function toActivityColorKey(value: number): ActivityColorKey {
  return ACTIVITY_COLOR_KEYS.includes(value as ActivityColorKey)
    ? value as ActivityColorKey
    : DEFAULT_ACTIVITY_COLOR_KEY;
}

// Chooses the least-used color and resolves equal counts by the lowest stable key.
export function chooseLeastUsedActivityColorKey(colorCounts: ReadonlyMap<ActivityColorKey, number>): ActivityColorKey {
  return ACTIVITY_COLOR_KEYS.reduce((selectedKey, candidateKey) => (
    (colorCounts.get(candidateKey) ?? 0) < (colorCounts.get(selectedKey) ?? 0)
      ? candidateKey
      : selectedKey
  ), ACTIVITY_COLOR_KEYS[0]);
}
