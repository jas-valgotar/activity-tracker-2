// Overview: Mounts the Activity Tracker app providers, navigation, loading state, and undo toast.

import React from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDataProvider, useAppData } from './src/data/AppDataProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/ui/theme';
import { UndoToast } from './src/ui/UndoToast';

// Creates the top-level app wrapper with native gesture and safe-area providers.
function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppDataProvider>
          <AppContent />
        </AppDataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Shows a database boot screen until repositories are ready, then renders navigation.
function AppContent() {
  const { isReady } = useAppData();

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Starting Activity Tracker</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RootNavigator />
      <UndoToast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default App;
