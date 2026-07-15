// Overview: Shows compact weekly, monthly, and quarterly visual progress for one activity detail screen.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ProgressPeriod, ProgressReport } from '../domain/activityTypes';
import type { ActivityPalette } from './activityPalette';
import { formatDuration, formatTargetDuration, getTargetProgressPercent } from '../domain/time';
import { colors, radii, spacing } from './theme';
import { DebugComponentLabel } from './DebugComponentFrame';

type ActivityProgressCardProps = {
  palette: ActivityPalette;
  report: ProgressReport;
  period: ProgressPeriod;
  targetDurationMinutes: number;
  onChangePeriod(period: ProgressPeriod): void;
};

const PERIODS: Array<{ value: ProgressPeriod; label: string }> = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

// Renders progress for the currently opened activity rather than aggregating all activities.
export function ActivityProgressCard({ palette, report, period, targetDurationMinutes, onChangePeriod }: ActivityProgressCardProps) {
  const targetPercent = Math.round(getTargetProgressPercent(report.totalActiveMs, targetDurationMinutes));

  return (
    <View style={[styles.card, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <DebugComponentLabel componentId="ui.activity-progress-card" componentName="ActivityProgressCard" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{formatDuration(report.totalActiveMs)} focused</Text>
        </View>
        <Text style={[styles.target, { color: palette.accent }]}>{targetPercent}% of {formatTargetDuration(targetDurationMinutes)}</Text>
      </View>
      <View style={[styles.targetTrack, { backgroundColor: palette.border }]}>
        <View style={[styles.targetFill, { backgroundColor: palette.accent, width: `${targetPercent}%` }]} />
      </View>
      <View style={styles.periodControl}>
        {PERIODS.map(option => {
          const isSelected = option.value === period;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.value}
              onPress={() => onChangePeriod(option.value)}
              style={[styles.periodButton, isSelected ? styles.selectedPeriodButton : null]}
            >
              <Text style={[styles.periodText, isSelected ? styles.selectedPeriodText : null]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.chart}>
        {report.buckets.map(bucket => {
          const bucketPercent = getTargetProgressPercent(bucket.activeMs, targetDurationMinutes);
          const heightPercent = bucketPercent === 0 ? 0 : Math.max(5, bucketPercent);
          return (
            <View key={bucket.key} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { backgroundColor: palette.accent, height: `${heightPercent}%` }]} />
              </View>
              <Text style={styles.barLabel}>{bucket.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
    position: 'relative',
  },
  header: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  target: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  targetTrack: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 8,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  targetFill: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: '100%',
  },
  periodControl: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  periodButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
  },
  selectedPeriodButton: {
    backgroundColor: colors.primaryDeep,
  },
  periodText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  selectedPeriodText: {
    color: colors.surface,
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    height: 110,
    marginTop: spacing.md,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 14,
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    minHeight: 4,
    width: '100%',
  },
  barLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
});
