// Overview: Shows a recoverable in-app notice when activity sounds and reminders cannot be delivered.

import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { BellOff } from 'lucide-react-native';
import { useAppData } from '../data/AppDataProvider';
import { colors, radii, spacing } from './theme';

// Makes notification permission problems actionable without interrupting activity creation.
export function NotificationStatusNotice() {
  const { notificationAvailability } = useAppData();

  if (notificationAvailability === 'unknown' || notificationAvailability === 'granted') {
    return null;
  }

  const isDenied = notificationAvailability === 'denied';
  const message = isDenied
    ? 'Timer sounds and reminders are off. Enable notifications in Settings to receive them.'
    : 'Timer sounds and reminders are unavailable on this device.';

  return (
    <View accessibilityRole="alert" style={styles.notice}>
      <BellOff color={colors.warning} size={18} />
      <Text style={styles.message}>{message}</Text>
      {isDenied ? (
        <Pressable accessibilityLabel="Open notification settings" accessibilityRole="button" onPress={() => Linking.openSettings()} style={styles.action}>
          <Text style={styles.actionText}>Settings</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionText: {
    color: colors.primaryDeep,
    fontSize: 13,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  notice: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderRadius: radii.md,
    borderWidth: 1,
    bottom: 84,
    flexDirection: 'row',
    gap: spacing.sm,
    left: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
  },
});
