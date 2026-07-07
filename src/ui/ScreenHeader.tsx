// Overview: Renders list-screen titles and the persisted sort menu.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppDataProvider';
import { colors, spacing } from './theme';
import { SortMenu } from './SortMenu';

type ScreenHeaderProps = {
  title: string;
};

// Shows a screen title with the shared activity sort selector on the right.
export function ScreenHeader({ title }: ScreenHeaderProps) {
  const { sortMode, setSortMode } = useAppData();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>{title}</Text>
      <SortMenu value={sortMode} onChange={nextSortMode => setSortMode(nextSortMode)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
});
