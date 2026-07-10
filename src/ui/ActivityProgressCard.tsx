// Overview: Shows weekly, monthly, and quarterly visual progress for one activity detail screen.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ProgressPeriod, ProgressReport } from '../domain/activityTypes';
import { formatDuration, formatTargetDuration } from '../domain/time';
import { colors, radii, spacing } from './theme';

type ActivityProgressCardProps = {
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
export function ActivityProgressCard({ report, period, targetDurationMinutes, onChangePeriod }: ActivityProgressCardProps) {
  const maxActiveMs = Math.max(...report.buckets.map(bucket => bucket.activeMs), 1);
  const targetMs = targetDurationMinutes * 60 * 1000;
  const targetPercent = Math.min(100, Math.round((report.totalActiveMs / targetMs) * 100));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ACTIVITY PROGRESS</Text>
          <Text style={styles.title}>{formatDuration(report.totalActiveMs)} focused</Text>
        </View>
        <Text style={styles.target}>{targetPercent}% of {formatTargetDuration(targetDurationMinutes)}</Text>
      </View>
      <View style={styles.targetTrack}>
        <View style={[styles.targetFill, { width: `${targetPercent}%` }]} />
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
          const heightPercent = bucket.activeMs === 0 ? 0 : Math.max(5, (bucket.activeMs / maxActiveMs) * 100);
          return (
            <View key={bucket.key} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${heightPercent}%` }]} />
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
    marginTop: spacing.xxl,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.xs,
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
    marginTop: spacing.lg,
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
    marginTop: spacing.lg,
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
    height: 130,
    marginTop: spacing.lg,
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
