// Overview: Renders the bottom screen switcher for focus, daily presets, completed, and all activities.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { CalendarDays, CheckCircle2, CircleDot, List } from 'lucide-react-native';
import type { MainTabParamList } from './types';
import { colors, radii, spacing } from '../ui/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabRouteName = keyof MainTabParamList;

const tabItems: Array<{
  name: TabRouteName;
  label: string;
  Icon: typeof CheckCircle2;
}> = [
  { name: 'Home', label: 'Focus', Icon: CircleDot },
  { name: 'Daily', label: 'Daily', Icon: CalendarDays },
  { name: 'Completed', label: 'Done', Icon: CheckCircle2 },
  { name: 'All', label: 'All', Icon: List },
];

// Provides an explicit bottom control for the same screens that can also be reached by swiping.
export function MainTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
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
    backgroundColor: colors.primaryDeep,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  activeTabLabel: {
    color: colors.surface,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
});
