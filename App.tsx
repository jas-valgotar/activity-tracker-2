// Overview: Mounts the Activity Tracker app providers, recoverable boot state, navigation, and global notices.

import React from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDataProvider, useAppData } from './src/data/AppDataProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/ui/theme';
import { UndoToast } from './src/ui/UndoToast';
import { NotificationStatusNotice } from './src/ui/NotificationStatusNotice';
import { CompletionTimerNotice } from './src/ui/CompletionTimerNotice';

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
  const { initializationError, isReady, retryInitialization } = useAppData();

  if (!isReady) {
    return (
      <View style={styles.loading}>
        {initializationError ? (
          <>
            <Text style={styles.errorTitle}>Could not start Activity Tracker</Text>
            <Text style={styles.errorText}>{initializationError}</Text>
            <Pressable accessibilityLabel="Retry starting Activity Tracker" accessibilityRole="button" onPress={retryInitialization} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Starting Activity Tracker</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RootNavigator />
      <CompletionTimerNotice />
      <NotificationStatusNotice />
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
  errorText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: 999,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 46,
    minWidth: 120,
  },
  retryText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
});

export default App;
