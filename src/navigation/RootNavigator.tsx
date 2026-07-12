// Overview: Wires the root navigation stack and its iOS-styled activity pager.

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityDetailScreen } from '../screens/ActivityDetailScreen';
import { colors } from '../ui/theme';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Renders app navigation with a stack detail screen over the main pager.
export function RootNavigator() {
  return (
    <NavigationContainer
      linking={{
        prefixes: ['activitytracker://'],
        config: {
          screens: {
            MainTabs: '',
            ActivityDetail: 'activity/:activityId',
          },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: 'Back',
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: 'Activity Log' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
