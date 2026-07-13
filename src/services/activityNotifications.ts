// Overview: Schedules local target-completion notifications and triggers haptics when they arrive in the foreground.

import { NativeModules } from 'react-native';
import type { ActivityPreset, ActivityWithLogs } from '../domain/activityTypes';
import { calculateActiveElapsedMs } from '../domain/time';
import { isValidReminderTimeMinutes } from '../domain/reminderTime';

type ActivityNotificationManager = {
  requestPermission(): Promise<boolean>;
  scheduleTargetNotification(activityId: string, title: string, delaySeconds: number): Promise<void>;
  schedulePauseReminder(activityId: string, title: string, delaySeconds: number): Promise<void>;
  schedulePresetReminder(presetId: string, title: string, reminderTimeMinutes: number): Promise<void>;
  cancelTargetNotification(activityId: string): void;
  cancelPauseReminder(activityId: string): void;
  cancelPresetReminder(presetId: string): void;
};

const PAUSE_REMINDER_DELAY_SECONDS = 30 * 60;
let permissionPromise: Promise<unknown> | null = null;
const notificationManager = NativeModules.ActivityNotificationManager as ActivityNotificationManager | undefined;

// Confirms the native notification module is loaded; the native delegate self-registers at app startup.
export function configureActivityNotifications(): void {
  if (!notificationManager) {
    console.warn('Activity notification native module is unavailable.');
  }
}

// Requests notification permission once and keeps activity creation independent of permission failures.
async function ensureNotificationPermission(): Promise<void> {
  if (!notificationManager) {
    return;
  }

  if (!permissionPromise) {
    permissionPromise = notificationManager.requestPermission().catch(error => {
      console.warn('Activity notifications are unavailable', error);
    });
  }

  await permissionPromise;
}

// Schedules a local notification for the remaining active time of one activity.
export async function scheduleActivityTargetNotification(activity: ActivityWithLogs, now = Date.now()): Promise<void> {
  try {
    await ensureNotificationPermission();
    if (!notificationManager) {
      return;
    }

    notificationManager.cancelTargetNotification(activity.id);
    notificationManager.cancelPauseReminder(activity.id);

    const elapsedMs = calculateActiveElapsedMs({
      events: activity.events,
      status: activity.status,
      now,
    });
    const targetMs = activity.targetDurationMinutes * 60_000;
    const remainingMs = targetMs - elapsedMs;

    if (activity.status !== 'active' || remainingMs <= 0) {
      return;
    }

    await notificationManager.scheduleTargetNotification(
      activity.id,
      `Nice work — ${activity.title} reached its ${formatTarget(activity.targetDurationMinutes)} target. Take a breath, then start another focus session when ready.`,
      remainingMs / 1000,
    );
  } catch (error) {
    console.warn('Could not schedule activity target notification', error);
  }
}

// Cancels the pending target notification for an activity after pause, completion, or deletion.
export function cancelActivityTargetNotification(activityId: string): void {
  notificationManager?.cancelTargetNotification(activityId);
}

// Schedules one gentle reminder for a paused activity so momentum is easy to recover.
export async function scheduleActivityPauseReminder(activity: ActivityWithLogs): Promise<void> {
  try {
    await ensureNotificationPermission();
    if (!notificationManager) {
      return;
    }

    notificationManager.cancelPauseReminder(activity.id);
    notificationManager.cancelTargetNotification(activity.id);
    if (activity.status !== 'paused') {
      return;
    }

    await notificationManager.schedulePauseReminder(
      activity.id,
      `Ready to resume ${activity.title}? A short focus session can keep your momentum going.`,
      PAUSE_REMINDER_DELAY_SECONDS,
    );
  } catch (error) {
    console.warn('Could not schedule activity pause reminder', error);
  }
}

// Cancels a paused-activity reminder after resume, completion, or deletion.
export function cancelActivityPauseReminder(activityId: string): void {
  notificationManager?.cancelPauseReminder(activityId);
}

// Schedules a repeating local reminder for an optional routine time.
export async function schedulePresetReminder(preset: ActivityPreset): Promise<void> {
  if (!notificationManager) {
    return;
  }

  notificationManager.cancelPresetReminder(preset.id);
  if (!isValidReminderTimeMinutes(preset.reminderTimeMinutes)) {
    return;
  }

  try {
    await ensureNotificationPermission();
    await notificationManager.schedulePresetReminder(
      preset.id,
      `Start ${preset.title} — ${formatTarget(preset.durationMinutes)} focus session.`,
      preset.reminderTimeMinutes,
    );
  } catch (error) {
    console.warn('Could not schedule preset reminder', error);
  }
}

// Cancels a repeating routine reminder.
export function cancelPresetReminder(presetId: string): void {
  notificationManager?.cancelPresetReminder(presetId);
}

// Formats notification copy without coupling this service to UI formatting helpers.
function formatTarget(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes} minutes`;
  }

  return remainingMinutes === 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours}h ${remainingMinutes}m`;
}
