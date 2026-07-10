// Overview: Displays one reusable daily activity preset with start, edit, and delete controls.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock3, Pencil, Play, Trash2 } from 'lucide-react-native';
import type { ActivityPreset } from '../domain/activityTypes';
import { formatTargetDuration } from '../domain/time';
import { colors, radii, spacing } from './theme';

type DailyPresetCardProps = {
  preset: ActivityPreset;
  onStart(preset: ActivityPreset): void;
  onEdit(preset: ActivityPreset): void;
  onDelete(preset: ActivityPreset): void;
};

// Renders a calm, actionable preset card for the Daily screen.
export function DailyPresetCard({ preset, onStart, onEdit, onDelete }: DailyPresetCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.summary}>
        <View style={styles.icon}>
          <Clock3 color={colors.primary} size={22} strokeWidth={2.2} />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>{preset.title}</Text>
          <Text style={styles.duration}>{formatTargetDuration(preset.durationMinutes)} focus session</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Start ${preset.title}`} onPress={() => onStart(preset)} style={styles.startButton}>
          <Play color={colors.surface} fill={colors.surface} size={16} />
          <Text style={styles.startText}>Start</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${preset.title}`} onPress={() => onEdit(preset)} style={styles.iconButton}>
          <Pencil color={colors.primary} size={18} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${preset.title}`} onPress={() => onDelete(preset)} style={[styles.iconButton, styles.deleteButton]}>
          <Trash2 color={colors.danger} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'column',
    marginBottom: spacing.md,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  summary: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 46,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 46,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  duration: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  startText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  deleteButton: {
    backgroundColor: colors.dangerSoft,
  },
});
