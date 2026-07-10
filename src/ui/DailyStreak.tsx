// Overview: Shows the user's current consecutive-day activity completion streak in a compact iOS-inspired card.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { colors, radii, spacing } from './theme';

type DailyStreakProps = {
  days: number;
};

// Renders a calm visual cue for consistency without competing with the active timer.
export function DailyStreak({ days }: DailyStreakProps) {
  const label = days === 1 ? 'day' : 'days';

  return (
    <View accessibilityLabel={`${days} day activity streak`} style={styles.card}>
      <View style={styles.iconContainer}>
        <Flame color={days > 0 ? colors.warning : colors.muted} fill={days > 0 ? colors.warningSoft : 'transparent'} size={24} strokeWidth={2.2} />
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{days}</Text>
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>DAILY STREAK</Text>
        <Text style={styles.title}>{days} {label} completed</Text>
      </View>
      <Text style={styles.prompt}>{days > 0 ? 'Keep it going' : 'Complete one today'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    marginHorizontal: spacing.xl,
    padding: spacing.md,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.md,
    position: 'relative',
    width: 48,
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 2,
    bottom: -5,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -5,
  },
  countText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  prompt: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
});
