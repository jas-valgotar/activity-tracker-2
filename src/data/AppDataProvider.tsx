// Overview: Initializes repositories and exposes activity actions, settings, and undo state to the UI.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { ActivityFilter, ActivitySortMode, ActivityWithLogs } from '../domain/activityTypes';
import { DEFAULT_SORT_MODE } from '../domain/sort';
import { createActivityRepository, type ActivityRepository } from './activityRepository';
import { getActivityDatabase } from './database';
import { runMigrations } from './migrations';
import { createSettingsRepository, type SettingsRepository } from './settingsRepository';

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
  createActivity(title: string): Promise<void>;
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
    settings: SettingsRepository;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [sortModeState, setSortModeState] = useState<ActivitySortMode>(DEFAULT_SORT_MODE);
  const [activityRevision, setActivityRevision] = useState(0);
  const [pendingUndo, setPendingUndo] = useState<UndoState | null>(null);

  // Boots SQLite, runs migrations, creates repositories, and restores settings.
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      const db = getActivityDatabase();
      await runMigrations(db);
      const activities = createActivityRepository(db);
      const settings = createSettingsRepository(db);
      const savedSortMode = await settings.getSortMode();

      if (!isMounted) {
        return;
      }

      repositoriesRef.current = { activities, settings };
      setSortModeState(savedSortMode);
      setIsReady(true);
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
  }, []);

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
    async (title: string) => {
      const { activities } = getRepositories();
      await activities.createActivity(title);
      bumpActivityRevision();
    },
    [bumpActivityRevision, getRepositories],
  );

  // Pauses an active activity.
  const pauseActivity = useCallback(
    async (id: string) => {
      const { activities } = getRepositories();
      await activities.pauseActivity(id);
      bumpActivityRevision();
    },
    [bumpActivityRevision, getRepositories],
  );

  // Resumes a paused activity.
  const resumeActivity = useCallback(
    async (id: string) => {
      const { activities } = getRepositories();
      await activities.resumeActivity(id);
      bumpActivityRevision();
    },
    [bumpActivityRevision, getRepositories],
  );

  // Completes an active or paused activity.
  const completeActivity = useCallback(
    async (id: string) => {
      const { activities } = getRepositories();
      await activities.completeActivity(id);
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
    await activities.restoreActivity(pendingUndo.activityId);
    clearUndo();
    bumpActivityRevision();
  }, [bumpActivityRevision, clearUndo, getRepositories, pendingUndo]);

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
