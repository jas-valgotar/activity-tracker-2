// Overview: Displays one activity row with its timer ring and swipe lifecycle actions.

import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Pause, Play, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { ActivityWithLogs } from '../domain/activityTypes';
import { calculateActiveElapsedMs, formatDuration } from '../domain/time';
import { colors, spacing } from './theme';
import { TimerRing } from './TimerRing';

type ActivityRowProps = {
  activity: ActivityWithLogs;
  now: number;
  onPress(activity: ActivityWithLogs): void;
  onPause(activity: ActivityWithLogs): void;
  onResume(activity: ActivityWithLogs): void;
  onComplete(activity: ActivityWithLogs): void;
  onDelete(activity: ActivityWithLogs): void;
};

// Renders an activity row with tap navigation and right-side swipe actions.
export function ActivityRow({
  activity,
  now,
  onPress,
  onPause,
  onResume,
  onComplete,
  onDelete,
}: ActivityRowProps) {
  const elapsedMs = calculateActiveElapsedMs({
    events: activity.events,
    status: activity.status,
    now,
  });
  const isFrozen = activity.status === 'completed';

  // Confirms deletion before invoking the shared delete workflow.
  function confirmDelete() {
    Alert.alert('Delete Activity', `Delete "${activity.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(activity) },
    ]);
  }

  // Renders swipe action buttons for pause/resume, complete, and delete.
  function renderRightActions() {
    const isPaused = activity.status === 'paused';
    const canComplete = activity.status !== 'completed';

    return (
      <View style={styles.actions}>
        {activity.status !== 'completed' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => (isPaused ? onResume(activity) : onPause(activity))}
            style={[styles.actionButton, styles.neutralAction]}
          >
            {isPaused ? <Play color={colors.text} size={18} /> : <Pause color={colors.text} size={18} />}
          </Pressable>
        ) : null}
        {canComplete ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onComplete(activity)}
            style={[styles.actionButton, styles.completeAction]}
          >
            <CheckCircle2 color={colors.surface} size={18} />
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={confirmDelete} style={[styles.actionButton, styles.deleteAction]}>
          <Trash2 color={colors.surface} size={18} />
        </Pressable>
      </View>
    );
  }

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable accessibilityRole="button" onPress={() => onPress(activity)} style={styles.row}>
        <View style={styles.copy}>
          <Text numberOfLines={2} style={styles.title}>
            {activity.title}
          </Text>
          <Text style={styles.meta}>
            {activity.status.toUpperCase()} • {formatDuration(elapsedMs)}
          </Text>
        </View>
        <TimerRing elapsedMs={elapsedMs} blinkNextSpike={activity.status === 'active'} frozen={isFrozen} />
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    height: 74,
    justifyContent: 'center',
    width: 56,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  completeAction: {
    backgroundColor: colors.complete,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  deleteAction: {
    backgroundColor: colors.danger,
    borderBottomRightRadius: 8,
    borderTopRightRadius: 8,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  neutralAction: {
    backgroundColor: colors.primarySoft,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    minHeight: 92,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
});
