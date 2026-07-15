// Overview: Coordinates one-shot foreground goal alerts independently from React and native playback details.

import type { ActivityWithLogs } from '../domain/activityTypes';
import { calculateActiveElapsedMs } from '../domain/time';

export type ForegroundGoalAlert = {
  activityId: string;
  title: string;
  expiresAt: number;
};

type ForegroundGoalAlertSchedulerOptions = {
  durationMs: number;
  isForeground(): boolean;
  onStart(alert: ForegroundGoalAlert): void;
  onStop(activityId: string): void;
};

// Schedules at most one alert and remembers goal crossings for the lifetime of the app process.
export class ForegroundGoalAlertScheduler {
  private readonly alertedActivityIds = new Set<string>();
  private readonly options: ForegroundGoalAlertSchedulerOptions;
  private triggerTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduledActivityId: string | null = null;

  constructor(options: ForegroundGoalAlertSchedulerOptions) {
    this.options = options;
  }

  // Schedules a future crossing; overdue activities are treated as already handled to prevent relaunch replays.
  schedule(activity: ActivityWithLogs, now = Date.now()): void {
    this.cancel();

    if (activity.status !== 'active' || this.alertedActivityIds.has(activity.id)) {
      return;
    }

    const elapsedMilliseconds = calculateActiveElapsedMs({
      events: activity.events,
      status: activity.status,
      now,
    });
    const remainingMilliseconds = activity.targetDurationMinutes * 60_000 - elapsedMilliseconds;
    if (remainingMilliseconds <= 0) {
      this.alertedActivityIds.add(activity.id);
      return;
    }

    this.scheduledActivityId = activity.id;
    this.triggerTimer = setTimeout(() => {
      this.triggerTimer = null;
      this.alertedActivityIds.add(activity.id);

      if (!this.options.isForeground()) {
        this.scheduledActivityId = null;
        return;
      }

      const alert = {
        activityId: activity.id,
        title: activity.title,
        expiresAt: Date.now() + this.options.durationMs,
      };
      this.options.onStart(alert);
      this.expiryTimer = setTimeout(() => this.cancel(activity.id), this.options.durationMs);
    }, remainingMilliseconds);
  }

  // Cancels a pending or playing alert without marking a not-yet-reached goal as alerted.
  cancel(activityId?: string): void {
    if (!this.scheduledActivityId || (activityId && this.scheduledActivityId !== activityId)) {
      return;
    }

    const cancelledActivityId = this.scheduledActivityId;
    if (this.triggerTimer) {
      clearTimeout(this.triggerTimer);
      this.triggerTimer = null;
    }
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
    this.scheduledActivityId = null;
    this.options.onStop(cancelledActivityId);
  }

  // Releases timers and active playback when the owning provider unmounts.
  dispose(): void {
    this.cancel();
  }
}
