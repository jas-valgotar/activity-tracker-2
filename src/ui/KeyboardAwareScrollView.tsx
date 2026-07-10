// Overview: Provides shared keyboard-aware scrolling so form details remain reachable above the software keyboard.

import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import type { PropsWithChildren } from 'react';
import type { ScrollViewProps } from 'react-native';

type KeyboardAwareScrollViewProps = PropsWithChildren<ScrollViewProps>;

// Keeps every future form's supporting controls visible while typing on iOS and Android.
export function KeyboardAwareScrollView({ children, contentContainerStyle, style, ...scrollViewProps }: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, style]}>
      <ScrollView
        {...scrollViewProps}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={contentContainerStyle}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
