// Overview: Shows one activity's lifecycle log and detail-level actions.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle2, Pause, Play, Trash2 } from 'lucide-react-native';
import { useAppData } from '../data/AppDataProvider';
import type { ActivityWithLogs } from '../domain/activityTypes';
import { calculateActiveElapsedMs, formatDuration, formatEventTimestamp } from '../domain/time';
import type { RootStackParamList } from '../navigation/types';
import { TimerRing } from '../ui/TimerRing';
import { colors, spacing } from '../ui/theme';

type DetailRoute = RouteProp<RootStackParamList, 'ActivityDetail'>;
type DetailNavigation = NativeStackNavigationProp<RootStackParamList, 'ActivityDetail'>;

// Renders detail actions and lifecycle logs for the selected activity.
export function ActivityDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<DetailNavigation>();
  const {
    getActivityWithLogs,
    pauseActivity,
    resumeActivity,
    completeActivity,
    deleteActivity,
  } = useAppData();
  const [activity, setActivity] = useState<ActivityWithLogs | null>(null);
  const [now, setNow] = useState(Date.now());

  // Loads the latest activity state and navigates back if it no longer exists.
  const loadActivity = useCallback(async () => {
    const nextActivity = await getActivityWithLogs(route.params.activityId);
    if (!nextActivity) {
      navigation.goBack();
      return;
    }

    setActivity(nextActivity);
  }, [getActivityWithLogs, navigation, route.params.activityId]);

  // Loads activity details when the screen mounts or the route changes.
  useEffect(() => {
    loadActivity().catch(error => {
      console.error('Failed to load activity detail', error);
    });
  }, [loadActivity]);

  // Refreshes elapsed-time display while the detail screen is visible.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // Pauses or resumes the activity from the detail screen.
  async function handlePauseResume() {
    if (!activity) {
      return;
    }

    if (activity.status === 'paused') {
      await resumeActivity(activity.id);
    } else {
      await pauseActivity(activity.id);
    }

    await loadActivity();
  }

  // Completes the activity and refreshes the detail state.
  async function handleComplete() {
    if (!activity) {
      return;
    }

    await completeActivity(activity.id);
    await loadActivity();
  }

  // Confirms deletion, soft-deletes the activity, and returns to the list.
  function confirmDelete() {
    if (!activity) {
      return;
    }

    Alert.alert('Delete Activity', `Delete "${activity.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteActivity(activity);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!activity) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading activity...</Text>
      </View>
    );
  }

  const elapsedMs = calculateActiveElapsedMs({
    events: activity.events,
    status: activity.status,
    now,
  });
  const isCompleted = activity.status === 'completed';
  const isPaused = activity.status === 'paused';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Delete activity" onPress={confirmDelete} style={styles.deleteIcon}>
          <Trash2 color={colors.danger} size={24} />
        </Pressable>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryCopy}>
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.status}>
            {activity.status.toUpperCase()} • {formatDuration(elapsedMs)}
          </Text>
        </View>
        <TimerRing elapsedMs={elapsedMs} blinkNextSpike={activity.status === 'active'} frozen={isCompleted} />
      </View>
      <View style={styles.actions}>
        {!isCompleted ? (
          <Pressable accessibilityRole="button" onPress={handlePauseResume} style={[styles.actionButton, styles.secondaryButton]}>
            {isPaused ? <Play color={colors.text} size={18} /> : <Pause color={colors.text} size={18} />}
            <Text style={styles.secondaryText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </Pressable>
        ) : null}
        {!isCompleted ? (
          <Pressable accessibilityRole="button" onPress={handleComplete} style={[styles.actionButton, styles.primaryButton]}>
            <CheckCircle2 color={colors.surface} size={18} />
            <Text style={styles.primaryText}>Complete</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.sectionTitle}>Log</Text>
      <View style={styles.logList}>
        {activity.events.map(event => (
          <View key={event.id} style={styles.logItem}>
            <Text style={styles.logType}>{event.type.toUpperCase()}</Text>
            <Text style={styles.logTime}>{formatEventTimestamp(event.occurredAt)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  content: {
    padding: spacing.lg,
  },
  deleteIcon: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  logItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  logList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  logTime: {
    color: colors.muted,
    fontSize: 14,
  },
  logType: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: colors.primarySoft,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  status: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  summary: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.lg,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  topBar: {
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
});
