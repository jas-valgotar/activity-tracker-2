// Overview: Initializes repositories and exposes activity actions, settings, and undo state to the UI.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { PropsWithChildren } from 'react';
import type {
  ActivityFilter,
  ActivityPreset,
  ActivitySortMode,
  ActivityWithLogs,
  ProgressPeriod,
  ProgressReport,
} from '../domain/activityTypes';
import { DEFAULT_SORT_MODE } from '../domain/sort';
import { calculateActiveElapsedMs } from '../domain/time';
import { createActivityRepository, type ActivityRepository } from './activityRepository';
import { createActivityPresetRepository, type ActivityPresetRepository } from './activityPresetRepository';
import { getActivityDatabase } from './database';
import { runMigrations } from './migrations';
import { createSettingsRepository, type SettingsRepository } from './settingsRepository';
import {
  cancelActivityPauseReminder,
  cancelActivityTargetNotification,
  cancelPresetReminder,
  configureActivityNotifications,
  scheduleActivityPauseReminder,
  schedulePresetReminder,
  scheduleActivityTargetNotification,
} from '../services/activityNotifications';
import {
  acknowledgeLiveActivityCommands,
  consumeLiveActivityCommands,
  endLiveActivity,
  getCurrentLiveActivityId,
  startOrUpdateLiveActivity,
  type LiveActivityCommand,
} from '../services/activityLiveActivity';

type UndoState = {
  activityId: string;
  title: string;
  expiresAt: number;
};

type AppDataContextValue = {
  isReady: boolean;
  sortMode: ActivitySortMode;
  activityRevision: number;
  pendingUndo: UndoState | null;
  setSortMode(sortMode: ActivitySortMode): Promise<void>;
  listActivities(filter: ActivityFilter): Promise<ActivityWithLogs[]>;
  getActivityWithLogs(id: string): Promise<ActivityWithLogs | null>;
  createActivity(title: string, targetDurationMinutes?: number): Promise<void>;
  logPastActivity(title: string, durationMinutes: number, completedAt: number): Promise<void>;
  pauseCurrentAndCreateActivity(title: string, targetDurationMinutes?: number): Promise<void>;
  pauseCurrentAndResumeActivity(id: string): Promise<void>;
  listPresets(): Promise<ActivityPreset[]>;
  createPreset(title: string, durationMinutes: number, reminderTimeMinutes?: number | null): Promise<void>;
  updatePreset(id: string, title: string, durationMinutes: number, reminderTimeMinutes?: number | null): Promise<void>;
  deletePreset(id: string): Promise<void>;
  getActivityProgressReport(activityId: string, period: ProgressPeriod): Promise<ProgressReport>;
  pauseActivity(id: string): Promise<void>;
  resumeActivity(id: string): Promise<void>;
  completeActivity(id: string): Promise<void>;
  deleteActivity(activity: ActivityWithLogs): Promise<void>;
  undoDelete(): Promise<void>;
  clearUndo(): void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

// Provides initialized database repositories and app-level activity operations.
export function AppDataProvider({ children }: PropsWithChildren) {
  const repositoriesRef = useRef<{
    activities: ActivityRepository;
    presets: ActivityPresetRepository;
    settings: SettingsRepository;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [sortModeState, setSortModeState] = useState<ActivitySortMode>(DEFAULT_SORT_MODE);
  const [activityRevision, setActivityRevision] = useState(0);
  const [pendingUndo, setPendingUndo] = useState<UndoState | null>(null);

  // Mirrors one activity into the native Live Activity without allowing native presentation failures to block SQLite writes.
  const syncLiveActivityForActivity = useCallback(async (activity: ActivityWithLogs | null) => {
    try {
      if (!activity || activity.status === 'completed') {
        if (activity) {
          await endLiveActivity(activity.id);
        } else {
          const currentActivityId = await getCurrentLiveActivityId();
          if (currentActivityId) {
            await endLiveActivity(currentActivityId);
          }
        }
        return;
      }

      const elapsedMilliseconds = calculateActiveElapsedMs({
        events: activity.events,
        status: activity.status,
      });
      await startOrUpdateLiveActivity({
        activityId: activity.id,
        title: activity.title,
        targetDurationMinutes: activity.targetDurationMinutes,
        status: activity.status,
        elapsedMilliseconds,
      });
    } catch (error) {
      console.warn('Live Activity is unavailable', error);
    }
  }, []);

  // Cancels native work for activities the focus-capacity policy moved into completed history.
  const cleanupAutoCompletedActivities = useCallback(async (activityIds: string[]) => {
    activityIds.forEach(activityId => {
      cancelActivityTargetNotification(activityId);
      cancelActivityPauseReminder(activityId);
    });

    await Promise.all(activityIds.map(async activityId => {
      try {
        await endLiveActivity(activityId);
      } catch (error) {
        console.warn('Could not end Live Activity after focus cleanup', error);
      }
    }));
  }, []);

  // Boots SQLite, runs migrations, creates repositories, and restores settings.
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      const db = getActivityDatabase();
      await runMigrations(db);
      const activities = createActivityRepository(db);
      const presets = createActivityPresetRepository(db);
      const settings = createSettingsRepository(db);
      const savedSortMode = await settings.getSortMode();

      if (!isMounted) {
        return;
      }

      repositoriesRef.current = { activities, presets, settings };
      setSortModeState(savedSortMode);
      configureActivityNotifications();

      const autoCompletedActivityIds = await activities.completeExcessPausedActivities();
      await cleanupAutoCompletedActivities(autoCompletedActivityIds);

      const storedPresets = await presets.listPresets();
      storedPresets.forEach(preset => {
        schedulePresetReminder(preset).catch(() => undefined);
      });

      const allActivities = await activities.listActivities('all', DEFAULT_SORT_MODE);
      const activeActivity = allActivities.find(activity => activity.status === 'active');
      if (activeActivity) {
        scheduleActivityTargetNotification(activeActivity).catch(() => undefined);
      }

      const currentLiveActivityId = await getCurrentLiveActivityId();
      const trackedActivity = currentLiveActivityId
        ? allActivities.find(activity => activity.id === currentLiveActivityId) ?? null
        : null;
      await syncLiveActivityForActivity(trackedActivity ?? activeActivity ?? null);

      if (isMounted) {
        setIsReady(true);
      }
    }

    initialize().catch(error => {
      console.error('Failed to initialize activity database', error);
    });

    return () => {
      isMounted = false;
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, [cleanupAutoCompletedActivities, syncLiveActivityForActivity]);

  // Returns initialized repositories or throws if a screen calls too early.
  const getRepositories = useCallback(() => {
    if (!repositoriesRef.current) {
      throw new Error('Activity data is not ready yet.');
    }

    return repositoriesRef.current;
  }, []);

  // Signals focused lists to reload after activity mutations complete.
  const bumpActivityRevision = useCallback(() => {
    setActivityRevision(currentRevision => currentRevision + 1);
  }, []);

  // Applies native Lock Screen commands in order and keeps failed commands queued for a later foreground attempt.
  const processPendingLiveActivityCommands = useCallback(async () => {
    let commands: LiveActivityCommand[];
    try {
      commands = await consumeLiveActivityCommands();
    } catch (error) {
      console.warn('Could not read Live Activity commands', error);
      return;
    }

    for (const command of commands) {
      try {
        const { activities } = getRepositories();
        if (command.action === 'pause') {
          const pauseResult = await activities.pauseActivity(command.activityId, command.occurredAt);
          cancelActivityTargetNotification(command.activityId);
          await cleanupAutoCompletedActivities(pauseResult.autoCompletedActivityIds);
          const pausedActivity = pauseResult.pausedActivity;
          if (pausedActivity) {
            scheduleActivityPauseReminder(pausedActivity).catch(() => undefined);
            await syncLiveActivityForActivity(pausedActivity);
          }
        } else if (command.action === 'resume') {
          const currentActivity = await activities.getActivityWithLogs(command.activityId);
          if (currentActivity?.status === 'paused') {
            const result = await activities.pauseCurrentAndResumeActivity(command.activityId, command.occurredAt);
            if (result.pausedActivityId) {
              cancelActivityTargetNotification(result.pausedActivityId);
            }
            await cleanupAutoCompletedActivities(result.autoCompletedActivityIds);
            cancelActivityPauseReminder(command.activityId);
            scheduleActivityTargetNotification(result.activity).catch(() => undefined);
            await syncLiveActivityForActivity(result.activity);
          } else if (currentActivity?.status === 'active') {
            await syncLiveActivityForActivity(currentActivity);
          }
        } else {
          await activities.completeActivity(command.activityId, command.occurredAt);
          cancelActivityTargetNotification(command.activityId);
          cancelActivityPauseReminder(command.activityId);
          try {
            await endLiveActivity(command.activityId);
          } catch (endError) {
            console.warn('Could not end Live Activity after command', endError);
          }
        }

        bumpActivityRevision();
        await acknowledgeLiveActivityCommands([command.commandId]);
      } catch (error) {
        console.warn('Could not apply Live Activity command', command.action, error);
        break;
      }
    }
  }, [bumpActivityRevision, cleanupAutoCompletedActivities, getRepositories, syncLiveActivityForActivity]);

  // Replays Lock Screen actions whenever the app becomes active after the widget handled them in the background.
  useEffect(() => {
    if (!isReady) {
      return;
    }

    processPendingLiveActivityCommands().catch(error => {
      console.warn('Could not process Live Activity commands', error);
    });

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        processPendingLiveActivityCommands().catch(error => {
          console.warn('Could not process Live Activity commands', error);
        });
      }
    });

    return () => subscription.remove();
  }, [isReady, processPendingLiveActivityCommands]);

  // Saves a new sort mode and updates all screens that depend on it.
  const setSortMode = useCallback(
    async (nextSortMode: ActivitySortMode) => {
      const { settings } = getRepositories();
      await settings.setSortMode(nextSortMode);
      setSortModeState(nextSortMode);
    },
    [getRepositories],
  );

  // Loads activities for one screen using the current sort mode.
  const listActivities = useCallback(
    async (filter: ActivityFilter) => {
      const { activities } = getRepositories();
      return activities.listActivities(filter, sortModeState);
    },
    [getRepositories, sortModeState],
  );

  // Loads one activity and updates its last-accessed timestamp.
  const getActivityWithLogs = useCallback(
    async (id: string) => {
      const { activities } = getRepositories();
      return activities.getActivityWithLogs(id);
    },
    [getRepositories],
  );

  // Creates a new activity from the home input.
  const createActivity = useCallback(
    async (title: string, targetDurationMinutes?: number) => {
      const { activities } = getRepositories();
      const activity = await activities.createActivity(title, targetDurationMinutes);
      scheduleActivityTargetNotification(activity).catch(() => undefined);
      await syncLiveActivityForActivity(activity);
      bumpActivityRevision();
    },
    [bumpActivityRevision, getRepositories, syncLiveActivityForActivity],
  );

  // Records an already-completed session without scheduling notifications or changing the Live Activity.
  const logPastActivity = useCallback(
    async (title: string, durationMinutes: number, completedAt: number) => {
      const { activities } = getRepositories();
      await activities.logPastActivity(title, durationMinutes, completedAt);
      bumpActivityRevision();
    },
    [bumpActivityRevision, getRepositories],
  );

  // Pauses the current focus and starts a new activity after the user confirms the switch.
  const pauseCurrentAndCreateActivity = useCallback(
    async (title: string, targetDurationMinutes?: number) => {
      const { activities } = getRepositories();
      const result = await activities.pauseCurrentAndCreateActivity(title, targetDurationMinutes);
      if (result.pausedActivityId) {
        cancelActivityTargetNotification(result.pausedActivityId);
      }
      await cleanupAutoCompletedActivities(result.autoCompletedActivityIds);
      scheduleActivityTargetNotification(result.activity).catch(() => undefined);
      await syncLiveActivityForActivity(result.activity);
      bumpActivityRevision();
    },
    [bumpActivityRevision, cleanupAutoCompletedActivities, getRepositories, syncLiveActivityForActivity],
  );

  // Pauses the current focus and resumes a selected paused activity after the user confirms a switch.
  const pauseCurrentAndResumeActivity = useCallback(
    async (id: string) => {
      const { activities } = getRepositories();
      const result = await activities.pauseCurrentAndResumeActivity(id);
      if (result.pausedActivityId) {
        cancelActivityTargetNotification(result.pausedActivityId);
      }
      await cleanupAutoCompletedActivities(result.autoCompletedActivityIds);
      cancelActivityPauseReminder(id);
      scheduleActivityTargetNotification(result.activity).catch(() => undefined);
      await syncLiveActivityForActivity(result.activity);
      bumpActivityRevision();
    },
    [bumpActivityRevision, cleanupAutoCompletedActivities, getRepositories, syncLiveActivityForActivity],
  );

  // Loads the reusable daily activity presets.
  const listPresets = useCallback(async () => {
    const { presets } = getRepositories();
    return presets.listPresets();
  }, [getRepositories]);

  // Keeps all optional Daily preset reminders synchronized after preset edits.
  const syncPresetReminders = useCallback(
    async (presetList: ActivityPreset[]) => {
      await Promise.all(presetList.map(preset => schedulePresetReminder(preset)));
    },
    [],
  );

  // Creates a reusable daily activity preset.
  const createPreset = useCallback(
    async (title: string, durationMinutes: number, reminderTimeMinutes?: number | null) => {
      const { presets } = getRepositories();
      await presets.createPreset(title, durationMinutes, reminderTimeMinutes);
      await syncPresetReminders(await presets.listPresets());
    },
    [getRepositories, syncPresetReminders],
  );

  // Updates a reusable daily activity preset.
  const updatePreset = useCallback(
    async (id: string, title: string, durationMinutes: number, reminderTimeMinutes?: number | null) => {
      const { presets } = getRepositories();
      await presets.updatePreset(id, title, durationMinutes, reminderTimeMinutes);
      await syncPresetReminders(await presets.listPresets());
    },
    [getRepositories, syncPresetReminders],
  );

  // Deletes a reusable daily activity preset.
  const deletePreset = useCallback(
    async (id: string) => {
      const { presets } = getRepositories();
      await presets.deletePreset(id);
      cancelPresetReminder(id);
    },
    [getRepositories],
  );

  // Loads progress for one activity in the requested calendar period.
  const getActivityProgressReport = useCallback(
    async (activityId: string, period: ProgressPeriod) => {
      const { activities } = getRepositories();
      return activities.getActivityProgressReport(activityId, period);
    },
    [getRepositories],
  );

  // Pauses an active activity.
  const pauseActivity = useCallback(
    async (id: string) => {
      const { activities } = getRepositories();
      const result = await activities.pauseActivity(id);
      cancelActivityTargetNotification(id);
      await cleanupAutoCompletedActivities(result.autoCompletedActivityIds);
      const pausedActivity = result.pausedActivity;
      if (pausedActivity) {
        scheduleActivityPauseReminder(pausedActivity).catch(() => undefined);
        await syncLiveActivityForActivity(pausedActivity);
      }
      bumpActivityRevision();
    },
    [bumpActivityRevision, cleanupAutoCompletedActivities, getRepositories, syncLiveActivityForActivity],
  );

  // Resumes a paused activity.
  const resumeActivity = useCallback(
    async (id: string) => {
      const { activities } = getRepositories();
      const result = await activities.resumeActivity(id);
      await cleanupAutoCompletedActivities(result.autoCompletedActivityIds);
      cancelActivityPauseReminder(id);
      const activity = await activities.getActivityWithLogs(id);
      if (activity) {
        scheduleActivityTargetNotification(activity).catch(() => undefined);
        await syncLiveActivityForActivity(activity);
      }
      bumpActivityRevision();
    },
    [bumpActivityRevision, cleanupAutoCompletedActivities, getRepositories, syncLiveActivityForActivity],
  );

  // Completes an active or paused activity.
  const completeActivity = useCallback(
    async (id: string) => {
      const { activities } = getRepositories();
      await activities.completeActivity(id);
      cancelActivityTargetNotification(id);
      cancelActivityPauseReminder(id);
      try {
        await endLiveActivity(id);
      } catch (error) {
        console.warn('Could not end Live Activity', error);
      }
      bumpActivityRevision();
    },
    [bumpActivityRevision, getRepositories],
  );

  // Clears any pending delete undo state and timer.
  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setPendingUndo(null);
  }, []);

  // Soft-deletes an activity and opens a 15-second undo window.
  const deleteActivity = useCallback(
    async (activity: ActivityWithLogs) => {
      const { activities } = getRepositories();
      await activities.softDeleteActivity(activity.id);
      cancelActivityTargetNotification(activity.id);
      cancelActivityPauseReminder(activity.id);
      try {
        await endLiveActivity(activity.id);
      } catch (error) {
        console.warn('Could not end Live Activity', error);
      }
      clearUndo();
      setPendingUndo({
        activityId: activity.id,
        title: activity.title,
        expiresAt: Date.now() + 15_000,
      });
      bumpActivityRevision();
      undoTimerRef.current = setTimeout(() => {
        setPendingUndo(null);
        undoTimerRef.current = null;
      }, 15_000);
    },
    [bumpActivityRevision, clearUndo, getRepositories],
  );

  // Restores the currently pending soft-deleted activity.
  const undoDelete = useCallback(async () => {
    if (!pendingUndo) {
      return;
    }

    const { activities } = getRepositories();
    const restoreResult = await activities.restoreActivity(pendingUndo.activityId);
    await cleanupAutoCompletedActivities(restoreResult.autoCompletedActivityIds);
    const restoredActivity = await activities.getActivityWithLogs(pendingUndo.activityId);
    if (restoredActivity && restoredActivity.status !== 'completed') {
      if (restoredActivity.status === 'active') {
        scheduleActivityTargetNotification(restoredActivity).catch(() => undefined);
      }
      await syncLiveActivityForActivity(restoredActivity);
    }
    clearUndo();
    bumpActivityRevision();
  }, [bumpActivityRevision, cleanupAutoCompletedActivities, clearUndo, getRepositories, pendingUndo, syncLiveActivityForActivity]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      isReady,
      sortMode: sortModeState,
      activityRevision,
      pendingUndo,
      setSortMode,
      listActivities,
      getActivityWithLogs,
      createActivity,
      logPastActivity,
      pauseCurrentAndCreateActivity,
      pauseCurrentAndResumeActivity,
      listPresets,
      createPreset,
      updatePreset,
      deletePreset,
      getActivityProgressReport,
      pauseActivity,
      resumeActivity,
      completeActivity,
      deleteActivity,
      undoDelete,
      clearUndo,
    }),
    [
      isReady,
      sortModeState,
      activityRevision,
      pendingUndo,
      setSortMode,
      listActivities,
      getActivityWithLogs,
      createActivity,
      logPastActivity,
      pauseCurrentAndCreateActivity,
      pauseCurrentAndResumeActivity,
      listPresets,
      createPreset,
      updatePreset,
      deletePreset,
      getActivityProgressReport,
      pauseActivity,
      resumeActivity,
      completeActivity,
      deleteActivity,
      undoDelete,
      clearUndo,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// Reads the app data context and provides a clear error outside the provider.
export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider.');
  }

  return context;
}
