// Overview: Shows every non-deleted activity regardless of active or completed status.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityList } from '../ui/ActivityList';
import { DebugComponentLabel } from '../ui/DebugComponentFrame';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors } from '../ui/theme';

// Lists all active, paused, and completed activities.
export function AllActivitiesScreen() {
  return (
    <View style={styles.container}>
      <DebugComponentLabel componentId="screen.all-activities" componentName="AllActivitiesScreen" />
      <ScreenHeader title="Everything" />
      <ActivityList filter="all" emptyText="No Activity Started" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
