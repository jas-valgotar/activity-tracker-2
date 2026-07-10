// Overview: Visualizes focused minutes and session counts across week, month, and quarter periods.

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppData } from '../data/AppDataProvider';
import type { ProgressPeriod, ProgressReport } from '../domain/activityTypes';
import { formatDuration } from '../domain/time';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors, radii, spacing } from '../ui/theme';

const PERIODS: Array<{ value: ProgressPeriod; label: string }> = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

// Renders a native bar chart without introducing a charting dependency.
function ProgressChart({ report }: { report: ProgressReport }) {
  const maxActiveMs = Math.max(...report.buckets.map(bucket => bucket.activeMs), 1);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.cardEyebrow}>FOCUSED TIME</Text>
          <Text style={styles.chartTitle}>Activity rhythm</Text>
        </View>
        <Text style={styles.chartTotal}>{formatDuration(report.totalActiveMs)}</Text>
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
      {report.totalActiveMs === 0 ? <Text style={styles.emptyChartHint}>Complete a session to see your rhythm here.</Text> : null}
    </View>
  );
}

// Renders period controls and progress summaries for the selected calendar range.
export function ProgressScreen() {
  const { getProgressReport } = useAppData();
  const [period, setPeriod] = useState<ProgressPeriod>('week');
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      setReport(await getProgressReport(period));
    } catch (error) {
      console.error('Failed to load progress report', error);
    } finally {
      setIsLoading(false);
    }
  }, [getProgressReport, period]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport]),
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Progress" subtitle="Notice the time you are making for what matters." showSort={false} />
      <View style={styles.content}>
        <View style={styles.periodControl}>
          {PERIODS.map(option => {
            const isSelected = option.value === period;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={option.value}
                onPress={() => setPeriod(option.value)}
                style={[styles.periodButton, isSelected ? styles.selectedPeriodButton : null]}
              >
                <Text style={[styles.periodText, isSelected ? styles.selectedPeriodText : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {isLoading || !report ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.cardEyebrow}>FOCUSED</Text>
                <Text style={styles.summaryValue}>{formatDuration(report.totalActiveMs)}</Text>
                <Text style={styles.summaryLabel}>active time</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardEyebrow}>SESSIONS</Text>
                <Text style={styles.summaryValue}>{report.sessionsStarted}</Text>
                <Text style={styles.summaryLabel}>{report.sessionsCompleted} completed</Text>
              </View>
            </View>
            <ProgressChart report={report} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  periodControl: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    padding: spacing.xs,
  },
  periodButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  selectedPeriodButton: {
    backgroundColor: colors.primaryDeep,
  },
  periodText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedPeriodText: {
    color: colors.surface,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.lg,
  },
  cardEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  chartHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  chartTotal: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    height: 190,
    marginTop: spacing.xl,
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
    width: 18,
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    minHeight: 4,
    width: '100%',
  },
  barLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  emptyChartHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
