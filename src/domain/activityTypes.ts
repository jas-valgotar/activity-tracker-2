// Overview: Defines the reusable activity domain types shared by data, UI, and navigation.

export type ActivityStatus = 'active' | 'paused' | 'completed';

export type ActivityEventType =
  | 'started'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'deleted'
  | 'restored';

export type ActivitySortMode = 'newest' | 'oldest' | 'lastAccessed';

export type ActivityFilter = 'home' | 'completed' | 'all';

export type Activity = {
  id: string;
  title: string;
  status: ActivityStatus;
  startedAt: number;
  completedAt: number | null;
  lastAccessedAt: number;
  deletedAt: number | null;
};

export type ActivityEvent = {
  id: string;
  activityId: string;
  type: ActivityEventType;
  occurredAt: number;
};

export type ActivityWithLogs = Activity & {
  events: ActivityEvent[];
};

export type ActivityListItemViewModel = ActivityWithLogs & {
  elapsedMs: number;
};
