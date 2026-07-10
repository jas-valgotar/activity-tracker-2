// Overview: Shows one activity's lifecycle log and detail-level actions.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle2, Pause, Play, Trash2 } from 'lucide-react-native';
import { useAppData } from '../data/AppDataProvider';
import type { ActivityWithLogs, ProgressPeriod, ProgressReport } from '../domain/activityTypes';
import { calculateActiveElapsedMs, formatDurationWithSeconds, formatEventTimestamp, formatTargetDuration } from '../domain/time';
import type { RootStackParamList } from '../navigation/types';
import { TimerRing } from '../ui/TimerRing';
import { ActivityProgressCard } from '../ui/ActivityProgressCard';
import { colors, radii, spacing } from '../ui/theme';

type DetailRoute = RouteProp<RootStackParamList, 'ActivityDetail'>;
type DetailNavigation = NativeStackNavigationProp<RootStackParamList, 'ActivityDetail'>;

// Renders detail actions and lifecycle logs for the selected activity.
export function ActivityDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<DetailNavigation>();
  const {
    getActivityWithLogs,
    pauseActivity,
    resumeActivity,
    pauseCurrentAndResumeActivity,
    completeActivity,
    deleteActivity,
    getActivityProgressReport,
  } = useAppData();
  const [activity, setActivity] = useState<ActivityWithLogs | null>(null);
  const [progressPeriod, setProgressPeriod] = useState<ProgressPeriod>('week');
  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null);
  const [now, setNow] = useState(Date.now());

  // Loads the latest activity state and navigates back if it no longer exists.
  const loadActivity = useCallback(async () => {
    const nextActivity = await getActivityWithLogs(route.params.activityId);
    if (!nextActivity) {
      navigation.goBack();
      return;
    }

    setActivity(nextActivity);
  }, [getActivityWithLogs, navigation, route.params.activityId]);

  // Loads progress for the currently opened activity and selected period.
  const loadProgress = useCallback(async () => {
    const nextReport = await getActivityProgressReport(route.params.activityId, progressPeriod);
    setProgressReport(nextReport);
  }, [getActivityProgressReport, progressPeriod, route.params.activityId]);

  // Loads activity details when the screen mounts or the route changes.
  useEffect(() => {
    loadActivity().catch(error => {
      console.error('Failed to load activity detail', error);
    });
  }, [loadActivity]);

  useEffect(() => {
    loadProgress().catch(error => {
      console.error('Failed to load activity progress', error);
    });
  }, [loadProgress]);

  // Refreshes elapsed-time display at second precision while the detail screen is visible.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  // Pauses or resumes the activity from the detail screen.
  async function handlePauseResume() {
    if (!activity) {
      return;
    }

    try {
      if (activity.status === 'paused') {
        await resumeActivity(activity.id);
      } else {
        await pauseActivity(activity.id);
      }

      await loadActivity();
      await loadProgress();
    } catch (error) {
      if (activity.status === 'paused' && isActiveActivityConflict(error)) {
        Alert.alert('Activity In Progress', 'Pause the current activity and resume this one?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pause & Resume',
            onPress: async () => {
              try {
                await pauseCurrentAndResumeActivity(activity.id);
                await loadActivity();
                await loadProgress();
              } catch (switchError) {
                Alert.alert('Could Not Switch Activity', getErrorMessage(switchError));
              }
            },
          },
        ]);
        return;
      }

      Alert.alert('Could Not Resume Activity', error instanceof Error ? error.message : 'Pause the current activity first.');
    }
  }

  // Completes the activity and refreshes the detail state.
  async function handleComplete() {
    if (!activity) {
      return;
    }

    await completeActivity(activity.id);
    await loadActivity();
    await loadProgress();
  }

  // Confirms deletion, soft-deletes the activity, and returns to the list.
  function confirmDelete() {
    if (!activity) {
      return;
    }

    Alert.alert('Delete Activity', `Delete "${activity.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteActivity(activity);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!activity) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading activity...</Text>
      </View>
    );
  }

  const elapsedMs = calculateActiveElapsedMs({
    events: activity.events,
    status: activity.status,
    now,
  });
  const isCompleted = activity.status === 'completed';
  const isPaused = activity.status === 'paused';

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Text style={styles.eyebrow}>SESSION DETAILS</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Delete activity" onPress={confirmDelete} style={styles.deleteIcon}>
          <Trash2 color={colors.danger} size={24} />
        </Pressable>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryCopy}>
          <Text style={styles.title}>{activity.title}</Text>
          <View style={[styles.statusBadge, isCompleted ? styles.completedBadge : isPaused ? styles.pausedBadge : null]}>
            <View style={[styles.statusDot, isCompleted ? styles.completedDot : isPaused ? styles.pausedDot : null]} />
            <Text style={[styles.status, isCompleted ? styles.completedText : isPaused ? styles.pausedText : null]}>
              {activity.status === 'active' ? 'IN FOCUS' : activity.status.toUpperCase()}
            </Text>
          </View>
          <Text allowFontScaling={false} ellipsizeMode="tail" numberOfLines={1} style={styles.elapsed}>
            {formatDurationWithSeconds(elapsedMs)}
          </Text>
          <Text style={styles.target}>Target {formatTargetDuration(activity.targetDurationMinutes)}</Text>
        </View>
        <TimerRing
          elapsedMs={elapsedMs}
          targetDurationMinutes={activity.targetDurationMinutes}
          blinkNextSpike={activity.status === 'active'}
          frozen={isCompleted}
        />
      </View>
      {progressReport ? (
        <ActivityProgressCard
          onChangePeriod={setProgressPeriod}
          period={progressPeriod}
          report={progressReport}
          targetDurationMinutes={activity.targetDurationMinutes}
        />
      ) : null}
      <View style={styles.actions}>
        {!isCompleted ? (
          <Pressable accessibilityLabel={`${isPaused ? 'Resume' : 'Pause'} ${activity.title}`} accessibilityRole="button" onPress={handlePauseResume} style={[styles.actionButton, styles.secondaryButton]}>
            {isPaused ? <Play color={colors.text} size={18} /> : <Pause color={colors.text} size={18} />}
            <Text style={styles.secondaryText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </Pressable>
        ) : null}
        {!isCompleted ? (
          <Pressable accessibilityLabel={`Complete ${activity.title}`} accessibilityRole="button" onPress={handleComplete} style={[styles.actionButton, styles.primaryButton]}>
            <CheckCircle2 color={colors.surface} size={18} />
            <Text style={styles.primaryText}>Complete</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Session log</Text>
        <Text style={styles.eventCount}>{activity.events.length} events</Text>
      </View>
      <View style={styles.logList}>
        {activity.events.map(event => (
          <View key={event.id} style={styles.logItem}>
            <View style={styles.logMarker} />
            <View style={styles.logCopy}>
              <Text style={styles.logType}>{event.type.toUpperCase()}</Text>
              <Text style={styles.logTime}>{formatEventTimestamp(event.occurredAt)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// Identifies the single-active-activity guard so detail actions can offer a focus switch.
function isActiveActivityConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Only one activity can be active');
}

// Converts unknown lifecycle errors into concise user-facing copy.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  deleteIcon: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 44,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  logItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  logList: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  logMarker: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  logCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  logTime: {
    color: colors.muted,
    fontSize: 14,
  },
  logType: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: colors.primaryDeep,
  },
  primaryText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: colors.primarySoft,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  sectionHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xxl,
  },
  eventCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  status: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statusBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusDot: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  pausedBadge: {
    backgroundColor: colors.warningSoft,
  },
  pausedDot: {
    backgroundColor: colors.warning,
  },
  pausedText: {
    color: colors.warning,
  },
  completedBadge: {
    backgroundColor: colors.completeSoft,
  },
  completedDot: {
    backgroundColor: colors.complete,
  },
  completedText: {
    color: colors.complete,
  },
  elapsed: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  target: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  summary: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
});
