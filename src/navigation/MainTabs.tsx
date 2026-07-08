// Overview: Creates the hidden swipeable three-screen pager around the default home screen.

import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import type { MainTabParamList } from './types';
import { AllActivitiesScreen } from '../screens/AllActivitiesScreen';
import { CompletedScreen } from '../screens/CompletedScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MainTabBar } from './MainTabBar';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();

// Renders the custom tab bar without creating a new component type on each render.
function renderMainTabBar(props: MaterialTopTabBarProps) {
  return <MainTabBar {...props} />;
}

// Renders Completed, Home, and All in swipe order with Home as the initial route.
export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        lazy: true,
        swipeEnabled: true,
      }}
      tabBarPosition="bottom"
      tabBar={renderMainTabBar}
    >
      <Tab.Screen name="Completed" component={CompletedScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="All" component={AllActivitiesScreen} />
    </Tab.Navigator>
  );
}
