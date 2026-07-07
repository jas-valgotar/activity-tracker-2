// Overview: Creates the hidden swipeable three-screen pager around the default home screen.

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MainTabParamList } from './types';
import { AllActivitiesScreen } from '../screens/AllActivitiesScreen';
import { CompletedScreen } from '../screens/CompletedScreen';
import { HomeScreen } from '../screens/HomeScreen';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();

// Renders Completed, Home, and All in swipe order with Home as the initial route.
export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        lazy: true,
        swipeEnabled: true,
      }}
      tabBar={() => null}
    >
      <Tab.Screen name="Completed" component={CompletedScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="All" component={AllActivitiesScreen} />
    </Tab.Navigator>
  );
}
