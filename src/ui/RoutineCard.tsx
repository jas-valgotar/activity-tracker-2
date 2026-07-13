// Overview: Displays one compact reusable Home routine with direct start and overflow management actions.

import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MoreHorizontal, Play } from 'lucide-react-native';
import type { ActivityPreset } from '../domain/activityTypes';
import { formatTargetDuration } from '../domain/time';
import { formatReminderTime } from '../domain/reminderTime';
import { colors, radii, spacing } from './theme';
import { DebugComponentLabel } from './DebugComponentFrame';

type RoutineCardProps = {
  routine: ActivityPreset;
  onStart(routine: ActivityPreset): void;
  onEdit(routine: ActivityPreset): void;
  onDelete(routine: ActivityPreset): void;
};

// Renders a calm, actionable routine card without persistent destructive controls.
export function RoutineCard({ routine, onStart, onEdit, onDelete }: RoutineCardProps) {
  function openActions() {
    Alert.alert(routine.title, undefined, [
      { text: 'Edit', onPress: () => onEdit(routine) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(routine) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.card}>
      <DebugComponentLabel componentId={`ui.routine-card:${routine.id}`} componentName="RoutineCard" />
      <View style={styles.summary}>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>{routine.title}</Text>
          <Text numberOfLines={1} style={styles.meta}>
            {formatTargetDuration(routine.durationMinutes)}
            {routine.reminderTimeMinutes === null ? '' : ` · ${formatReminderTime(routine.reminderTimeMinutes)}`}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Start ${routine.title}`} onPress={() => onStart(routine)} style={styles.startButton}>
          <Play color={colors.surface} fill={colors.surface} size={17} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${routine.title}`} onPress={openActions} style={styles.moreButton}>
          <MoreHorizontal color={colors.muted} size={21} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'relative',
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  summary: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  copy: { flex: 1, gap: 2, paddingRight: spacing.xs },
  title: { color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  startButton: { alignItems: 'center', backgroundColor: colors.primaryDeep, borderRadius: radii.pill, height: 38, justifyContent: 'center', width: 38 },
  moreButton: { alignItems: 'center', borderRadius: radii.pill, height: 38, justifyContent: 'center', marginLeft: spacing.xs, width: 38 },
});
