// Overview: Shows every non-deleted activity and provides historical completed-activity logging.

import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { History } from 'lucide-react-native';
import { useAppData } from '../data/AppDataProvider';
import { ActivityList } from '../ui/ActivityList';
import { DebugComponentLabel } from '../ui/DebugComponentFrame';
import { PastActivityComposer } from '../ui/PastActivityComposer';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors, radii } from '../ui/theme';

// Lists all active, paused, and completed activities.
export function AllActivitiesScreen() {
  const { logPastActivity } = useAppData();
  const [isPastComposerOpen, setIsPastComposerOpen] = useState(false);

  return (
    <View style={styles.container}>
      <DebugComponentLabel componentId="screen.all-activities" componentName="AllActivitiesScreen" />
      <ScreenHeader
        title="Everything"
        trailingAction={
          <Pressable
            accessibilityLabel="Log past activity"
            accessibilityRole="button"
            onPress={() => setIsPastComposerOpen(true)}
            style={styles.logPastButton}
          >
            <History color={colors.surface} size={19} strokeWidth={2.5} />
          </Pressable>
        }
      />
      <ActivityList filter="all" emptyText="No Activity Started" />
      <PastActivityComposer
        visible={isPastComposerOpen}
        onClose={() => setIsPastComposerOpen(false)}
        onSave={logPastActivity}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  logPastButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
