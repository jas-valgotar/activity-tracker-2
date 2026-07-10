// Overview: Displays one activity row with its timer ring and swipe lifecycle actions.

import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, ChevronRight, Pause, Play, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { ActivityWithLogs } from '../domain/activityTypes';
import { calculateActiveElapsedMs, formatDuration, formatTargetDuration } from '../domain/time';
import { colors, radii, spacing } from './theme';
import { TimerRing } from './TimerRing';
import { getActivityPalette } from './activityPalette';

type ActivityRowProps = {
  activity: ActivityWithLogs;
  colorIndex: number;
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
  colorIndex,
  now,
  onPress,
  onPause,
  onResume,
  onComplete,
  onDelete,
}: ActivityRowProps) {
  const palette = getActivityPalette(colorIndex);
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
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress(activity)}
        style={[styles.row, { backgroundColor: palette.background, borderColor: palette.border }]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: palette.accent },
            activity.status === 'completed' ? styles.completedDot : null,
            activity.status === 'paused' ? styles.pausedDot : null,
          ]}
        />
        <View style={styles.copy}>
          <View style={styles.titleLine}>
            <Text
              style={[
                styles.statusLabel,
                { color: palette.accent },
                activity.status === 'completed' ? styles.completedLabel : null,
                activity.status === 'paused' ? styles.pausedLabel : null,
              ]}
            >
              {activity.status === 'active' ? 'IN FOCUS' : activity.status.toUpperCase()}
            </Text>
            <ChevronRight color={colors.border} size={18} />
          </View>
          <Text numberOfLines={2} style={styles.title}>
            {activity.title}
          </Text>
          <Text allowFontScaling={false} ellipsizeMode="tail" numberOfLines={1} style={styles.meta}>
            {formatDuration(elapsedMs)} elapsed · {formatTargetDuration(activity.targetDurationMinutes)} goal
          </Text>
        </View>
        <TimerRing
          elapsedMs={elapsedMs}
          accentColor={palette.accent}
          labelBackgroundColor={palette.background}
          targetDurationMinutes={activity.targetDurationMinutes}
          blinkNextSpike={activity.status === 'active'}
          frozen={isFrozen}
        />
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    height: 88,
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
    fontSize: 13,
    fontWeight: '700',
  },
  neutralAction: {
    backgroundColor: colors.primarySoft,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    minHeight: 104,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  statusDot: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    marginRight: spacing.md,
    width: 4,
  },
  pausedDot: {
    backgroundColor: colors.warning,
  },
  completedDot: {
    backgroundColor: colors.complete,
  },
  statusLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pausedLabel: {
    color: colors.warning,
  },
  completedLabel: {
    color: colors.complete,
  },
  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
});
