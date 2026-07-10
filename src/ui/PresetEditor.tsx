// Overview: Edits a daily preset title and target duration in a reusable modal form.

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ActivityPreset } from '../domain/activityTypes';
import { DEFAULT_TARGET_DURATION_MINUTES } from '../domain/time';
import { DurationPicker } from './DurationPicker';
import { ReminderTimePicker } from './ReminderTimePicker';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { colors, radii, spacing } from './theme';

type PresetEditorProps = {
  visible: boolean;
  preset: ActivityPreset | null;
  onClose(): void;
  onSave(title: string, durationMinutes: number, reminderTimeMinutes: number | null): Promise<void>;
};

// Renders the shared create/edit form for daily presets.
export function PresetEditor({ visible, preset, onClose, onSave }: PresetEditorProps) {
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_TARGET_DURATION_MINUTES);
  const [reminderTimeMinutes, setReminderTimeMinutes] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTitle(preset?.title ?? '');
    setDurationMinutes(preset?.durationMinutes ?? DEFAULT_TARGET_DURATION_MINUTES);
    setReminderTimeMinutes(preset?.reminderTimeMinutes ?? null);
  }, [preset, visible]);

  async function handleSave() {
    if (!title.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(title, durationMinutes, reminderTimeMinutes);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAwareScrollView contentContainerStyle={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{preset ? 'EDIT PRESET' : 'NEW PRESET'}</Text>
              <Text style={styles.title}>{preset ? 'Tune your routine' : 'Create a daily focus'}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="Preset name"
            autoFocus={!preset}
            onChangeText={setTitle}
            placeholder="e.g. Meditation"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={title}
          />
          <DurationPicker
            value={durationMinutes}
            onChange={nextValue => {
              if (nextValue !== null) {
                setDurationMinutes(nextValue);
              }
            }}
          />
          <ReminderTimePicker value={reminderTimeMinutes} onChange={setReminderTimeMinutes} />
          <Pressable accessibilityRole="button" disabled={!title.trim() || isSaving} onPress={handleSave} style={[styles.saveButton, !title.trim() ? styles.disabledButton : null]}>
            <Text style={styles.saveText}>{preset ? 'Save changes' : 'Add preset'}</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  cancelButton: {
    padding: spacing.xs,
  },
  cancelText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 52,
  },
  disabledButton: {
    opacity: 0.45,
  },
  saveText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
  },
});
