// Overview: Shows completed activities with frozen elapsed timers.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { History } from 'lucide-react-native';
import { useAppData } from '../data/AppDataProvider';
import { ActivityList } from '../ui/ActivityList';
import { PastActivityComposer } from '../ui/PastActivityComposer';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors, radii, spacing } from '../ui/theme';

// Lists all completed activities using the shared activity row style.
export function CompletedScreen() {
  const { logPastActivity } = useAppData();
  const [isPastComposerOpen, setIsPastComposerOpen] = useState(false);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Completed" subtitle="A quiet record of what you finished." />
      <Pressable
        accessibilityLabel="Log past activity"
        accessibilityRole="button"
        onPress={() => setIsPastComposerOpen(true)}
        style={styles.logPastButton}
      >
        <History color={colors.primaryDeep} size={19} strokeWidth={2.5} />
        <View style={styles.logPastCopy}>
          <Text style={styles.logPastTitle}>Log past activity</Text>
          <Text style={styles.logPastHint}>Add something you already finished.</Text>
        </View>
      </Pressable>
      <ActivityList filter="completed" emptyText="No Completed Activity" />
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
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.xl,
    padding: spacing.md,
  },
  logPastCopy: {
    flex: 1,
    gap: 2,
  },
  logPastHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  logPastTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
});
