// Overview: Renders a reusable compact routine list for the unified Home screen.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ActivityPreset } from '../domain/activityTypes';
import { RoutineCard } from './RoutineCard';
import { colors, spacing } from './theme';

type RoutineListSectionProps = {
  routines: ActivityPreset[];
  onStart(routine: ActivityPreset): void;
  onEdit(routine: ActivityPreset): void;
  onDelete(routine: ActivityPreset): void;
};

// Keeps Home's routine presentation independent from its activity and editor state.
export function RoutineListSection({ routines, onStart, onEdit, onDelete }: RoutineListSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Routines</Text>
      {routines.map(routine => (
        <RoutineCard key={routine.id} onDelete={onDelete} onEdit={onEdit} onStart={onStart} routine={routine} />
      ))}
      {routines.length === 0 ? <Text style={styles.emptyText}>Use the plus button to add a routine.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
});
