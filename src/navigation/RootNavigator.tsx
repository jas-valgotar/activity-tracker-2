// Overview: Wires the root navigation stack and its hidden activity pager.

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
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: 'Activity Log' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
