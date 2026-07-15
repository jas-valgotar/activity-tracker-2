// Overview: Bridges activity lifecycle state and queued Lock Screen commands to the iOS Live Activity implementation.

import { NativeModules, Platform } from 'react-native';
import type { ActivityColorKey } from '../domain/activityColor';

export type LiveActivityStatus = 'active' | 'paused';

export type LiveActivityPayload = {
  activityId: string;
  colorKey: ActivityColorKey;
  title: string;
  targetDurationMinutes: number;
  status: LiveActivityStatus;
  elapsedMilliseconds: number;
};

export type LiveActivityCommandAction = 'pause' | 'resume' | 'complete';

export type LiveActivityCommand = {
  commandId: string;
  activityId: string;
  action: LiveActivityCommandAction;
  occurredAt: number;
};

type NativeLiveActivityManager = {
  startOrUpdate(payload: LiveActivityPayload): Promise<boolean>;
  end(activityId: string): Promise<void>;
  getCurrentActivityId(): Promise<string | null>;
  consumeCommands(): Promise<LiveActivityCommand[]>;
  acknowledgeCommands(commandIds: string[]): Promise<void>;
};

const nativeManager =
  Platform.OS === 'ios'
    ? (NativeModules.ActivityLiveActivityManager as NativeLiveActivityManager | undefined)
    : undefined;

// Starts or updates the one Live Activity representing the current focus activity.
export async function startOrUpdateLiveActivity(payload: LiveActivityPayload): Promise<boolean> {
  if (!nativeManager) {
    return false;
  }

  return nativeManager.startOrUpdate(payload);
}

// Ends the Live Activity for one completed, deleted, or replaced activity.
export async function endLiveActivity(activityId: string): Promise<void> {
  if (!nativeManager) {
    return;
  }

  await nativeManager.end(activityId);
}

// Returns the activity currently represented by the native Live Activity, if any.
export async function getCurrentLiveActivityId(): Promise<string | null> {
  if (!nativeManager) {
    return null;
  }

  return nativeManager.getCurrentActivityId();
}

// Reads Lock Screen commands without removing them until the data layer acknowledges them.
export async function consumeLiveActivityCommands(): Promise<LiveActivityCommand[]> {
  if (!nativeManager) {
    return [];
  }

  return nativeManager.consumeCommands();
}

// Removes commands after their database lifecycle operations have completed.
export async function acknowledgeLiveActivityCommands(commandIds: string[]): Promise<void> {
  if (!nativeManager || commandIds.length === 0) {
    return;
  }

  await nativeManager.acknowledgeCommands(commandIds);
}

// Exposes whether the current platform can display this feature without coupling callers to NativeModules.
export function isLiveActivityAvailable(): boolean {
  return nativeManager !== undefined;
}
