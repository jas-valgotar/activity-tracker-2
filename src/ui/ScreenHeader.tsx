// Overview: Renders list-screen titles and the persisted sort menu.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppDataProvider';
import { colors, spacing } from './theme';
import { SortMenu } from './SortMenu';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  showSort?: boolean;
};

// Shows a screen title with the shared activity sort selector on the right.
export function ScreenHeader({ title, subtitle, showSort = true }: ScreenHeaderProps) {
  const { sortMode, setSortMode } = useAppData();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>ACTIVITY TRACKER</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showSort ? <SortMenu value={sortMode} onChange={nextSortMode => setSortMode(nextSortMode)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});
