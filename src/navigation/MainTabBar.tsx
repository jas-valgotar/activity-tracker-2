// Overview: Renders the bottom screen switcher for Completed, Home, and All activity tabs.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { CheckCircle2, CircleDot, List } from 'lucide-react-native';
import type { MainTabParamList } from './types';
import { colors, spacing } from '../ui/theme';

type TabRouteName = keyof MainTabParamList;

const tabItems: Array<{
  name: TabRouteName;
  label: string;
  Icon: typeof CheckCircle2;
}> = [
  { name: 'Completed', label: 'Completed', Icon: CheckCircle2 },
  { name: 'Home', label: 'Current', Icon: CircleDot },
  { name: 'All', label: 'All', Icon: List },
];

// Provides an explicit bottom control for the same screens that can also be reached by swiping.
export function MainTabBar({ state, navigation }: MaterialTopTabBarProps) {
  return (
    <View style={styles.container}>
      {tabItems.map(item => {
        const tabIndex = state.routes.findIndex(route => route.name === item.name);
        const isFocused = state.index === tabIndex;
        const tintColor = isFocused ? colors.surface : colors.muted;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Show ${item.label} activities`}
            accessibilityState={isFocused ? { selected: true } : undefined}
            key={item.name}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: state.routes[tabIndex].key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(item.name);
              }
            }}
            style={[styles.tabButton, isFocused ? styles.activeTabButton : null]}
          >
            <item.Icon color={tintColor} size={20} strokeWidth={2.4} />
            <Text style={[styles.tabLabel, isFocused ? styles.activeTabLabel : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeTabButton: {
    backgroundColor: colors.primary,
  },
  activeTabLabel: {
    color: colors.surface,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
});
