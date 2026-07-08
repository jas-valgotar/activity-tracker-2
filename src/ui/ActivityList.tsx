// Overview: Renders scrollable activity lists with shared empty, loading, and row behavior.

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppData } from '../data/AppDataProvider';
import type { ActivityFilter, ActivityWithLogs } from '../domain/activityTypes';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from './theme';
import { ActivityRow } from './ActivityRow';

type ActivityListProps = {
  filter: ActivityFilter;
  emptyText: string;
};

// Shows a reusable list for home, completed, and all activity screens.
export function ActivityList({ filter, emptyText }: ActivityListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    listActivities,
    pauseActivity,
    resumeActivity,
    completeActivity,
    deleteActivity,
  } = useAppData();
  const [activities, setActivities] = useState<ActivityWithLogs[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Reloads activities for the current filter and sort mode.
  const loadActivities = useCallback(async () => {
    const nextActivities = await listActivities(filter);
    setActivities(nextActivities);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [filter, listActivities]);

  // Refreshes the visible timer values without changing database state.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
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
    await resumeActivity(activity.id);
    await loadActivities();
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
      renderItem={({ item }) => (
        <ActivityRow
          activity={item}
          now={now}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onPause={handlePause}
          onPress={handleOpenActivity}
          onResume={handleResume}
        />
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
