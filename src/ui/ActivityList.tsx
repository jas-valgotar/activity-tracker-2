// Overview: Renders uncluttered scrollable activity lists with shared empty, loading, and row behavior.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ListTodo } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppData } from '../data/AppDataProvider';
import type { ActivityFilter, ActivityWithLogs } from '../domain/activityTypes';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing } from './theme';
import { ActivityRow } from './ActivityRow';

type ActivityListProps = {
  filter: ActivityFilter;
  emptyText: string;
};

// Shows a reusable list for home, completed, and all activity screens.
export function ActivityList({ filter, emptyText }: ActivityListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    activityRevision,
    listActivities,
    pauseActivity,
    resumeActivity,
    pauseCurrentAndResumeActivity,
    completeActivity,
    deleteActivity,
  } = useAppData();
  const [activities, setActivities] = useState<ActivityWithLogs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lastLoadedRevisionRef = useRef(activityRevision);

  // Reloads activities for the current filter and sort mode.
  const loadActivities = useCallback(async () => {
    const nextActivities = await listActivities(filter);
    setActivities(nextActivities);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [filter, listActivities]);

  // Refreshes the visible timer values every second without changing database state.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  // Reloads the screen whenever it is focused.
  useFocusEffect(
    useCallback(() => {
      loadActivities().catch(error => {
        console.error('Failed to load activities', error);
        setIsLoading(false);
        setIsRefreshing(false);
      });
    }, [loadActivities]),
  );

  // Reloads mounted lists when another part of the app mutates activity data.
  useEffect(() => {
    if (lastLoadedRevisionRef.current === activityRevision) {
      return;
    }

    lastLoadedRevisionRef.current = activityRevision;
    loadActivities().catch(error => {
      console.error('Failed to reload activities after update', error);
      setIsLoading(false);
      setIsRefreshing(false);
    });
  }, [activityRevision, loadActivities]);

  // Handles pull-to-refresh.
  function handleRefresh() {
    setIsRefreshing(true);
    loadActivities().catch(error => {
      console.error('Failed to refresh activities', error);
      setIsRefreshing(false);
    });
  }

  // Opens the activity detail screen.
  function handleOpenActivity(activity: ActivityWithLogs) {
    navigation.navigate('ActivityDetail', { activityId: activity.id });
  }

  // Pauses an activity and refreshes the list.
  async function handlePause(activity: ActivityWithLogs) {
    await pauseActivity(activity.id);
    await loadActivities();
  }

  // Resumes an activity and refreshes the list.
  async function handleResume(activity: ActivityWithLogs) {
    try {
      await resumeActivity(activity.id);
      await loadActivities();
    } catch (error) {
      if (!isActiveActivityConflict(error)) {
        Alert.alert('Could Not Resume Activity', getErrorMessage(error));
        return;
      }

      Alert.alert('Activity In Progress', 'Pause the current activity and resume this one?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause & Resume',
          onPress: async () => {
            try {
              await pauseCurrentAndResumeActivity(activity.id);
              await loadActivities();
            } catch (switchError) {
              Alert.alert('Could Not Switch Activity', getErrorMessage(switchError));
            }
          },
        },
      ]);
    }
  }

  // Completes an activity and refreshes the list.
  async function handleComplete(activity: ActivityWithLogs) {
    await completeActivity(activity.id);
    await loadActivities();
  }

  // Deletes an activity and refreshes the list.
  async function handleDelete(activity: ActivityWithLogs) {
    await deleteActivity(activity);
    await loadActivities();
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={[styles.content, activities.length === 0 ? styles.emptyContent : null]}
      data={activities}
      keyExtractor={activity => activity.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      renderItem={({ item, index }) => (
        <ActivityRow
          activity={item}
          colorIndex={index}
          now={now}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onPause={handlePause}
          onPress={handleOpenActivity}
          onResume={handleResume}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <ListTodo color={colors.primary} size={24} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>{emptyText}</Text>
        </View>
      }
    />
  );
}

// Identifies the single-active-activity guard so a paused row can offer a focus switch.
function isActiveActivityConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Only one activity can be active');
}

// Converts unknown lifecycle errors into concise user-facing copy.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 48,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
