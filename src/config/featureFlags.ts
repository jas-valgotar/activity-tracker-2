// Overview: Defines small, typed application feature flags that can be changed in one place during development.

/**
 * Development-only switches. Change a value here and refresh the app to enable or disable a feature.
 * Keep flags disabled by default so shipped behavior remains unchanged.
 */
export const featureFlags = {
  debugComponentLabels: false,
};

export type FeatureFlag = keyof typeof featureFlags;

// Reads a flag through one shared API so future flag sources can replace this local registry.
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
