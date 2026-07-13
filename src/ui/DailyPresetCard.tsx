// Overview: Displays one compact reusable daily preset with direct start and overflow management actions.

import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MoreHorizontal, Play } from 'lucide-react-native';
import type { ActivityPreset } from '../domain/activityTypes';
import { formatTargetDuration } from '../domain/time';
import { formatReminderTime } from '../domain/reminderTime';
import { colors, radii, spacing } from './theme';
import { DebugComponentLabel } from './DebugComponentFrame';

type DailyPresetCardProps = {
  preset: ActivityPreset;
  onStart(preset: ActivityPreset): void;
  onEdit(preset: ActivityPreset): void;
  onDelete(preset: ActivityPreset): void;
};

// Renders a calm, actionable preset card for the Daily screen.
export function DailyPresetCard({ preset, onStart, onEdit, onDelete }: DailyPresetCardProps) {
  // Opens infrequent preset actions without keeping destructive controls visible in every row.
  function openActions() {
    Alert.alert(preset.title, undefined, [
      { text: 'Edit', onPress: () => onEdit(preset) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(preset) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.card}>
      <DebugComponentLabel componentId={`ui.daily-preset-card:${preset.id}`} componentName="DailyPresetCard" />
      <View style={styles.summary}>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>{preset.title}</Text>
          <Text numberOfLines={1} style={styles.meta}>
            {formatTargetDuration(preset.durationMinutes)}
            {preset.reminderTimeMinutes === null ? '' : ` · ${formatReminderTime(preset.reminderTimeMinutes)}`}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Start ${preset.title}`} onPress={() => onStart(preset)} style={styles.startButton}>
          <Play color={colors.surface} fill={colors.surface} size={17} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${preset.title}`} onPress={openActions} style={styles.moreButton}>
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
  summary: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  copy: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  moreButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    marginLeft: spacing.xs,
    width: 38,
  },
});
