// Overview: Provides an optional, non-interactive label that identifies a visible UI component for debugging.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isFeatureEnabled } from '../config/featureFlags';

type DebugComponentLabelProps = {
  componentId: string;
  componentName: string;
};

/**
 * Renders a label inside a visible component only when debugComponentLabels is enabled.
 * Component IDs are stable, short references intended for bug reports and LLM prompts.
 */
export function DebugComponentLabel({ componentId, componentName }: DebugComponentLabelProps) {
  if (!isFeatureEnabled('debugComponentLabels')) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.label}>
      <Text allowFontScaling={false} style={styles.labelText}>
        {componentId} · {componentName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    backgroundColor: 'rgba(28, 28, 30, 0.78)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
    right: 3,
    top: 3,
    zIndex: 1000,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
