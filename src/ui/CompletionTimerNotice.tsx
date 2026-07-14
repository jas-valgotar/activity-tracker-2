// Overview: Shows a short, dismissible foreground notice after an active focus goal reaches its target.

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useAppData } from '../data/AppDataProvider';
import { colors, radii, spacing } from './theme';

// Keeps the completion confirmation visible for its configured lifetime while allowing immediate dismissal.
export function CompletionTimerNotice() {
  const { completionNotice, dismissCompletionNotice } = useAppData();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!completionNotice) {
      return;
    }
    const activeNotice = completionNotice;

    function refresh() {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow >= activeNotice.expiresAt) {
        dismissCompletionNotice();
      }
    }

    refresh();
    const timer = setInterval(refresh, 1_000);
    return () => clearInterval(timer);
  }, [completionNotice, dismissCompletionNotice]);

  if (!completionNotice) {
    return null;
  }

  const secondsRemaining = Math.max(0, Math.ceil((completionNotice.expiresAt - now) / 1_000));
  return (
    <View accessibilityRole="alert" style={styles.notice}>
      <CheckCircle2 color={colors.complete} size={22} />
      <View style={styles.copy}>
        <Text style={styles.title}>Goal reached</Text>
        <Text numberOfLines={2} style={styles.message}>{completionNotice.title} reached its target. {secondsRemaining}s</Text>
      </View>
      <Pressable accessibilityLabel="Dismiss completion notice" accessibilityRole="button" onPress={dismissCompletionNotice} style={styles.dismissButton}>
        <Text style={styles.dismissText}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
  },
  dismissButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dismissText: {
    color: colors.primaryDeep,
    fontSize: 13,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  notice: {
    alignItems: 'center',
    backgroundColor: colors.completeSoft,
    borderColor: colors.complete,
    borderRadius: radii.md,
    borderWidth: 1,
    bottom: 84,
    flexDirection: 'row',
    gap: spacing.sm,
    left: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
    zIndex: 11,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
});
