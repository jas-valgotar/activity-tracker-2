// Overview: Mirrors the main activity composer for creating a reusable Daily routine with an optional reminder.

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CalendarPlus } from 'lucide-react-native';
import { DEFAULT_TARGET_DURATION_MINUTES } from '../domain/time';
import { DurationPicker } from './DurationPicker';
import { ReminderTimePicker } from './ReminderTimePicker';
import { colors, radii, spacing } from './theme';

type DailyPresetComposerProps = {
  onSave(title: string, durationMinutes: number, reminderTimeMinutes: number | null): Promise<void>;
};

// Renders a familiar inline composer so adding a Daily routine feels like starting an activity.
export function DailyPresetComposer({ onSave }: DailyPresetComposerProps) {
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [reminderTimeMinutes, setReminderTimeMinutes] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedTitle, durationMinutes ?? DEFAULT_TARGET_DURATION_MINUTES, reminderTimeMinutes);
      setTitle('');
      setDurationMinutes(null);
      setReminderTimeMinutes(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <CalendarPlus color={colors.primary} size={17} strokeWidth={2.3} />
        </View>
        <View style={styles.headingCopy}>
          <TextInput
            accessibilityLabel="Daily activity name"
            onChangeText={setTitle}
            onSubmitEditing={handleSave}
            placeholder="What would you like to repeat?"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
            value={title}
          />
          <Text style={styles.helper}>Save a routine for today and the days ahead</Text>
        </View>
      </View>
      <View style={styles.controlGroup}>
        <DurationPicker label="Duration (optional)" value={durationMinutes} onChange={setDurationMinutes} />
      </View>
      <View style={styles.controlGroup}>
        <ReminderTimePicker value={reminderTimeMinutes} onChange={setReminderTimeMinutes} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add daily activity"
        disabled={isSaving || !title.trim()}
        onPress={handleSave}
        style={[styles.addButton, !title.trim() ? styles.disabledButton : null]}
      >
        {isSaving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.addText}>Add to Daily</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headingIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    marginTop: 4,
    width: 32,
  },
  headingCopy: {
    flex: 1,
  },
  input: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    minWidth: 210,
    padding: 0,
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  controlGroup: {
    marginTop: spacing.md,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 46,
  },
  disabledButton: {
    opacity: 0.45,
  },
  addText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
  },
});
