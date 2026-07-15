// Overview: Defines the one configurable foreground completion-notice duration used after a focus goal is reached.

// Change this value to adjust how long the dismissible completion notice remains visible.
export const COMPLETION_NOTICE_DURATION_SECONDS = 10;

export const COMPLETION_NOTICE_DURATION_MS = COMPLETION_NOTICE_DURATION_SECONDS * 1_000;

// Strong haptic pulses remain spaced enough to be noticeable without becoming continuous vibration.
export const GOAL_ALERT_VIBRATION_INTERVAL_MS = 1_000;
