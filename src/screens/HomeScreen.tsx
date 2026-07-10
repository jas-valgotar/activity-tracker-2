// Overview: Implements the default active-activity screen with keyboard-aware list and bottom input bar.

import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAppData } from '../data/AppDataProvider';
import { calculateBestDailyStreak, calculateDailyStreak } from '../domain/streak';
import { ActivityInputBar } from '../ui/ActivityInputBar';
import { ActivityList } from '../ui/ActivityList';
import { DailyStreak } from '../ui/DailyStreak';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors } from '../ui/theme';

// Shows active and paused activities and lets the user start a new activity.
export function HomeScreen() {
  const { activityRevision, createActivity, listActivities, pauseCurrentAndCreateActivity } = useAppData();
  const [streaks, setStreaks] = useState({ current: 0, best: 0 });
  const isFocused = useIsFocused();

  // Loads the streak from all non-deleted activity history whenever Focus becomes visible or changes.
  const loadDailyStreak = useCallback(async () => {
    const activities = await listActivities('all');
    setStreaks({
      current: calculateDailyStreak(activities),
      best: calculateBestDailyStreak(activities),
    });
  }, [listActivities]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    loadDailyStreak().catch(error => {
      console.error('Failed to load daily streak', error);
    });
  }, [activityRevision, isFocused, loadDailyStreak]);

  // Creates a new activity and lets the list reload through focus or manual refresh.
  const handleAddActivity = useCallback(
    async (title: string, durationMinutes?: number) => {
      await createActivity(title, durationMinutes);
    },
    [createActivity],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={styles.keyboardAvoidingView}
    >
      <View style={styles.container}>
        <ScreenHeader title="Focus" subtitle="Keep the important things moving." />
        <DailyStreak bestDays={streaks.best} days={streaks.current} />
        <ActivityList filter="home" emptyText="No Activity Started" />
        <ActivityInputBar onAdd={handleAddActivity} onPauseCurrentAndStart={pauseCurrentAndCreateActivity} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});
