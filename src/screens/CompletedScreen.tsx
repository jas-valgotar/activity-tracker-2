// Overview: Shows completed activities with frozen elapsed timers.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityList } from '../ui/ActivityList';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors } from '../ui/theme';

// Lists all completed activities using the shared activity row style.
export function CompletedScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Completed" subtitle="A quiet record of what you finished." />
      <ActivityList filter="completed" emptyText="No Completed Activity" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
