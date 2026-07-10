// Overview: Implements the default active-activity screen with keyboard-aware list and bottom input bar.

import React, { useCallback } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useAppData } from '../data/AppDataProvider';
import { ActivityInputBar } from '../ui/ActivityInputBar';
import { ActivityList } from '../ui/ActivityList';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors } from '../ui/theme';

// Shows active and paused activities and lets the user start a new activity.
export function HomeScreen() {
  const { createActivity, pauseCurrentAndCreateActivity } = useAppData();

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
