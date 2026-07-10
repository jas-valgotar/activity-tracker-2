// Overview: Implements the default active-activity screen with list and bottom input bar.

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppData } from '../data/AppDataProvider';
import { ActivityInputBar } from '../ui/ActivityInputBar';
import { ActivityList } from '../ui/ActivityList';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors } from '../ui/theme';

// Shows active and paused activities and lets the user start a new activity.
export function HomeScreen() {
  const { createActivity } = useAppData();

  // Creates a new activity and lets the list reload through focus or manual refresh.
  const handleAddActivity = useCallback(
    async (title: string, durationMinutes: number) => {
      await createActivity(title, durationMinutes);
    },
    [createActivity],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Focus" subtitle="Keep the important things moving." />
      <ActivityList filter="home" emptyText="No Activity Started" />
      <ActivityInputBar onAdd={handleAddActivity} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
