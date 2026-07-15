// Overview: Displays one concise activity row with its timer ring and swipe lifecycle actions.

import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Pause, Play, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { ActivityWithLogs } from '../domain/activityTypes';
import { calculateActiveElapsedMs, formatDuration, formatTargetDuration } from '../domain/time';
import { colors, radii, spacing } from './theme';
import { TimerRing } from './TimerRing';
import { DebugComponentLabel } from './DebugComponentFrame';
import { getActivityPalette } from './activityPalette';

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
  const palette = getActivityPalette(activity.colorKey);
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
            accessibilityLabel={`${isPaused ? 'Resume' : 'Pause'} ${activity.title}`}
            accessibilityRole="button"
            onPress={() => (isPaused ? onResume(activity) : onPause(activity))}
            style={[styles.actionButton, isPaused ? styles.resumeAction : styles.pauseAction]}
          >
            {isPaused ? <Play color={colors.text} size={18} /> : <Pause color={colors.text} size={18} />}
          </Pressable>
        ) : null}
        {canComplete ? (
          <Pressable
            accessibilityLabel={`Complete ${activity.title}`}
            accessibilityRole="button"
            onPress={() => onComplete(activity)}
            style={[styles.actionButton, styles.completeAction]}
          >
            <CheckCircle2 color={colors.surface} size={18} />
          </Pressable>
        ) : null}
        <Pressable accessibilityLabel={`Delete ${activity.title}`} accessibilityRole="button" onPress={confirmDelete} style={[styles.actionButton, styles.deleteAction]}>
          <Trash2 color={colors.surface} size={18} />
        </Pressable>
      </View>
    );
  }

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        accessibilityLabel={`Open ${activity.title}, ${activity.status === 'active' ? 'in focus' : activity.status}`}
        accessibilityRole="button"
        onPress={() => onPress(activity)}
        style={[styles.row, { backgroundColor: palette.background, borderColor: palette.border }]}
      >
        <DebugComponentLabel componentId={`ui.activity-row:${activity.id}`} componentName="ActivityRow" />
        <View
          style={[
            styles.statusDot,
            { backgroundColor: palette.accent },
            activity.status === 'completed' ? styles.completedDot : null,
            activity.status === 'paused' ? styles.pausedDot : null,
          ]}
        />
        <View style={styles.copy}>
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
    gap: 2,
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
  pauseAction: {
    backgroundColor: colors.warningSoft,
  },
  resumeAction: {
    backgroundColor: colors.primarySoft,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    minHeight: 88,
    padding: spacing.md,
    position: 'relative',
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
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
});
