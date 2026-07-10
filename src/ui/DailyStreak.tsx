// Overview: Shows the user's current consecutive-day activity completion streak in a compact iOS-inspired card.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Flame, Trophy } from 'lucide-react-native';
import { colors, radii, spacing } from './theme';

type DailyStreakProps = {
  dailyDays: number;
  allTimeDays: number;
};

// Renders separate current and all-time streak metrics, with the record receiving stronger emphasis.
export function DailyStreak({ dailyDays, allTimeDays }: DailyStreakProps) {
  const dailyLabel = dailyDays === 1 ? 'day' : 'days';
  const allTimeLabel = allTimeDays === 1 ? 'day' : 'days';

  return (
    <View accessibilityLabel={`${dailyDays} day daily streak and ${allTimeDays} day all time streak`} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEyebrow}>CONSISTENCY</Text>
        <Text style={styles.cardHint}>Complete an activity each day</Text>
      </View>
      <View style={styles.metrics}>
        <View style={styles.dailyMetric}>
          <View style={styles.dailyIconContainer}>
            <Flame color={dailyDays > 0 ? colors.warning : colors.muted} fill={dailyDays > 0 ? colors.warningSoft : 'transparent'} size={24} strokeWidth={2.2} />
          </View>
          <View style={styles.metricCopy}>
            <Text style={styles.dailyLabel}>DAILY STREAK</Text>
            <Text style={styles.dailyValue}>{dailyDays} {dailyLabel}</Text>
            <Text style={styles.dailyHint}>in a row</Text>
          </View>
        </View>
        <View style={styles.allTimeMetric}>
          <View style={styles.allTimeIconContainer}>
            <Trophy color={colors.warning} size={22} strokeWidth={2.4} />
          </View>
          <View style={styles.metricCopy}>
            <Text style={styles.allTimeLabel}>ALL-TIME STREAK</Text>
            <Text style={styles.allTimeValue}>{allTimeDays} {allTimeLabel}</Text>
            <Text style={styles.allTimeHint}>longest run</Text>
          </View>
        </View>
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
    marginBottom: spacing.md,
    marginHorizontal: spacing.xl,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  cardHint: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dailyMetric: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    flex: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  allTimeMetric: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.md,
    flex: 1.15,
    flexDirection: 'row',
    padding: spacing.md,
  },
  dailyIconContainer: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 36,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 36,
  },
  allTimeIconContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 36,
  },
  metricCopy: {
    flex: 1,
  },
  dailyLabel: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  allTimeLabel: {
    color: colors.surface,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dailyValue: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  allTimeValue: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  dailyHint: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  allTimeHint: {
    color: colors.primarySoft,
    fontSize: 10,
    fontWeight: '700',
  },
});
