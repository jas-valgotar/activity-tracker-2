// Overview: Schedules local activity notifications and reports whether alerts are available to the app UI.

import { NativeModules } from 'react-native';
import type { ActivityPreset, ActivityWithLogs } from '../domain/activityTypes';
import { calculateActiveElapsedMs } from '../domain/time';
import { isValidReminderTimeMinutes } from '../domain/reminderTime';
import {
  COMPLETION_NOTICE_DURATION_SECONDS,
  GOAL_ALERT_VIBRATION_INTERVAL_MS,
} from '../domain/completionTimer';

type ActivityNotificationManager = {
  requestPermission(): Promise<boolean>;
  scheduleTargetNotification(
    activityId: string,
    title: string,
    delaySeconds: number,
    alarmDurationSeconds: number,
    vibrationIntervalSeconds: number,
  ): Promise<void>;
  startGoalAlert(activityId: string, alarmDurationSeconds: number, vibrationIntervalSeconds: number): void;
  stopGoalAlert(activityId: string): void;
  schedulePauseReminder(activityId: string, title: string, delaySeconds: number): Promise<void>;
  schedulePresetReminder(presetId: string, title: string, reminderTimeMinutes: number): Promise<void>;
  cancelTargetNotification(activityId: string): void;
  cancelPauseReminder(activityId: string): void;
  cancelPresetReminder(presetId: string): void;
};

export type NotificationAvailability = 'unknown' | 'granted' | 'denied' | 'unavailable';

const PAUSE_REMINDER_DELAY_SECONDS = 30 * 60;
let permissionPromise: Promise<NotificationAvailability> | null = null;
const notificationManager = NativeModules.ActivityNotificationManager as ActivityNotificationManager | undefined;

// Confirms the native notification module is loaded; the native delegate self-registers at app startup.
export function configureActivityNotifications(): NotificationAvailability {
  if (!notificationManager) {
    console.warn('Activity notification native module is unavailable.');
    return 'unavailable';
  }

  return 'unknown';
}

// Requests notification permission once while keeping activity creation independent of permission failures.
async function ensureNotificationPermission(): Promise<NotificationAvailability> {
  if (!notificationManager) {
    return 'unavailable';
  }

  if (!permissionPromise) {
    permissionPromise = notificationManager.requestPermission()
      .then(isGranted => (isGranted ? 'granted' : 'denied'))
      .catch(error => {
        console.warn('Activity notifications are unavailable', error);
        return 'unavailable';
      });
  }

  return permissionPromise;
}

// Schedules a local notification for the remaining active time of one activity.
export async function scheduleActivityTargetNotification(
  activity: ActivityWithLogs,
  now = Date.now(),
): Promise<NotificationAvailability> {
  try {
    const availability = await ensureNotificationPermission();
    if (availability !== 'granted' || !notificationManager) {
      return availability;
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
      return availability;
    }

    await notificationManager.scheduleTargetNotification(
      activity.id,
      `Nice work — ${activity.title} reached its ${formatTarget(activity.targetDurationMinutes)} target. Take a breath, then start another focus session when ready.`,
      remainingMs / 1000,
      COMPLETION_NOTICE_DURATION_SECONDS,
      GOAL_ALERT_VIBRATION_INTERVAL_MS / 1_000,
    );
    return availability;
  } catch (error) {
    console.warn('Could not schedule activity target notification', error);
    return 'unavailable';
  }
}

// Cancels the pending target notification for an activity after pause, completion, or deletion.
export function cancelActivityTargetNotification(activityId: string): void {
  notificationManager?.cancelTargetNotification(activityId);
  notificationManager?.stopGoalAlert(activityId);
}

// Starts idempotent native sound and vibration for a foreground goal crossing.
export function startGoalAlert(activityId: string): void {
  notificationManager?.startGoalAlert(
    activityId,
    COMPLETION_NOTICE_DURATION_SECONDS,
    GOAL_ALERT_VIBRATION_INTERVAL_MS / 1_000,
  );
}

// Stops native goal sound and vibration without changing future notification scheduling.
export function stopGoalAlert(activityId: string): void {
  notificationManager?.stopGoalAlert(activityId);
}

// Schedules one gentle reminder for a paused activity so momentum is easy to recover.
export async function scheduleActivityPauseReminder(activity: ActivityWithLogs): Promise<NotificationAvailability> {
  try {
    const availability = await ensureNotificationPermission();
    if (availability !== 'granted' || !notificationManager) {
      return availability;
    }

    notificationManager.cancelPauseReminder(activity.id);
    notificationManager.cancelTargetNotification(activity.id);
    if (activity.status !== 'paused') {
      return availability;
    }

    await notificationManager.schedulePauseReminder(
      activity.id,
      `Ready to resume ${activity.title}? A short focus session can keep your momentum going.`,
      PAUSE_REMINDER_DELAY_SECONDS,
    );
    return availability;
  } catch (error) {
    console.warn('Could not schedule activity pause reminder', error);
    return 'unavailable';
  }
}

// Cancels a paused-activity reminder after resume, completion, or deletion.
export function cancelActivityPauseReminder(activityId: string): void {
  notificationManager?.cancelPauseReminder(activityId);
}

// Schedules a repeating local reminder for an optional routine time.
export async function schedulePresetReminder(preset: ActivityPreset): Promise<NotificationAvailability> {
  if (!notificationManager) {
    return 'unavailable';
  }

  notificationManager.cancelPresetReminder(preset.id);
  if (!isValidReminderTimeMinutes(preset.reminderTimeMinutes)) {
    return 'unknown';
  }

  try {
    const availability = await ensureNotificationPermission();
    if (availability !== 'granted') {
      return availability;
    }
    await notificationManager.schedulePresetReminder(
      preset.id,
      `Start ${preset.title} — ${formatTarget(preset.durationMinutes)} focus session.`,
      preset.reminderTimeMinutes,
    );
    return availability;
  } catch (error) {
    console.warn('Could not schedule preset reminder', error);
    return 'unavailable';
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
