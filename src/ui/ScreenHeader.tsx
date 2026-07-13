// Overview: Renders compact list-screen titles and the persisted sort menu.

import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../data/AppDataProvider';
import { DebugComponentLabel } from './DebugComponentFrame';
import { colors, spacing } from './theme';
import { SortMenu } from './SortMenu';

type ScreenHeaderProps = {
  title: string;
  showSort?: boolean;
  trailingAction?: ReactNode;
};

// Shows a screen title with the shared activity sort selector on the right.
export function ScreenHeader({ title, showSort = true, trailingAction }: ScreenHeaderProps) {
  const { sortMode, setSortMode } = useAppData();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <DebugComponentLabel componentId="ui.screen-header" componentName="ScreenHeader" />
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      </View>
      {trailingAction ?? (showSort ? <SortMenu value={sortMode} onChange={nextSortMode => setSortMode(nextSortMode)} /> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    position: 'relative',
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
});
