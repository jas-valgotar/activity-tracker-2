// Overview: Collects a title, elapsed duration, and current completed date/time for one historical completed activity.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays, Clock3, History } from 'lucide-react-native';
import { DEFAULT_TARGET_DURATION_MINUTES, formatTargetDuration } from '../domain/time';
import { DurationPicker } from './DurationPicker';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { colors, radii, spacing } from './theme';

type PickerMode = 'date' | 'time';

type PastActivityComposerProps = {
  visible: boolean;
  onClose(): void;
  onSave(title: string, durationMinutes: number, completedAt: number): Promise<void>;
};

// Renders a modal form that saves a completed activity whose start is derived from its duration.
export function PastActivityComposer({ visible, onClose, onSave }: PastActivityComposerProps) {
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_TARGET_DURATION_MINUTES);
  const [completedAt, setCompletedAt] = useState(() => new Date());
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Refreshes the form timestamp on open and re-evaluates future-time validation while it remains visible.
  useEffect(() => {
    if (!visible) {
      return;
    }

    const now = Date.now();
    setCompletedAt(new Date(now));
    setCurrentTime(now);
    const timer = setInterval(() => setCurrentTime(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [visible]);

  // Resets the form whenever the user cancels or finishes saving so later entries start clean.
  function closeAndReset() {
    setTitle('');
    setDurationMinutes(DEFAULT_TARGET_DURATION_MINUTES);
    setCompletedAt(new Date());
    setPickerMode(null);
    onClose();
  }

  // Preserves the untouched portion of the timestamp when the native date or time picker changes.
  function handlePickerChange(event: DateTimePickerEvent, selectedValue?: Date) {
    if (Platform.OS === 'android') {
      setPickerMode(null);
    }
    if (event.type !== 'set' || !selectedValue || !pickerMode) {
      return;
    }

    setCompletedAt(currentValue => mergeDateTime(currentValue, selectedValue, pickerMode));
  }

  // Saves the entry only when its title and selected timestamp are valid.
  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedTitle, durationMinutes, completedAt.getTime());
      closeAndReset();
    } catch (error) {
      Alert.alert('Could Not Log Activity', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const isFutureCompletion = completedAt.getTime() > currentTime;
  const isSaveDisabled = !title.trim() || isSaving || isFutureCompletion;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={closeAndReset}>
      <KeyboardAwareScrollView contentContainerStyle={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={styles.iconCircle}>
                <History color={colors.primary} size={20} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.eyebrow}>COMPLETED SESSION</Text>
                <Text style={styles.title}>Log past activity</Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Cancel logging past activity" accessibilityRole="button" onPress={closeAndReset} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          <TextInput
            accessibilityLabel="Past activity name"
            autoFocus
            onChangeText={setTitle}
            placeholder="What did you finish?"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
            value={title}
          />
          <DurationPicker label="Time spent" presentation="inline" value={durationMinutes} onChange={value => setDurationMinutes(value ?? DEFAULT_TARGET_DURATION_MINUTES)} />

          <View style={styles.completedSection}>
            <Text style={styles.label}>Completed at</Text>
            <View style={styles.timestampActions}>
              <Pressable accessibilityLabel="Choose completion date" accessibilityRole="button" onPress={() => setPickerMode('date')} style={styles.timestampButton}>
                <CalendarDays color={colors.primary} size={18} />
                <Text style={styles.timestampText}>{completedAt.toLocaleDateString()}</Text>
              </Pressable>
              <Pressable accessibilityLabel="Choose completion time" accessibilityRole="button" onPress={() => setPickerMode('time')} style={styles.timestampButton}>
                <Clock3 color={colors.primary} size={18} />
                <Text style={styles.timestampText}>{completedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
              </Pressable>
            </View>
            {isFutureCompletion ? <Text style={styles.validation}>Choose a date and time no later than now.</Text> : null}
          </View>

          <Pressable
            accessibilityLabel="Save past activity"
            accessibilityRole="button"
            disabled={isSaveDisabled}
            onPress={handleSave}
            style={[styles.saveButton, isSaveDisabled ? styles.disabledSaveButton : null]}
          >
            {isSaving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.saveText}>Log {formatTargetDuration(durationMinutes)} activity</Text>}
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
      {pickerMode ? <NativeDateTimePicker mode={pickerMode} value={completedAt} onChange={handlePickerChange} onDone={() => setPickerMode(null)} /> : null}
    </Modal>
  );
}

type NativeDateTimePickerProps = {
  mode: PickerMode;
  value: Date;
  onChange(event: DateTimePickerEvent, selectedValue?: Date): void;
  onDone(): void;
};

// Uses Android's system dialog and an inline iOS picker so the form keyboard stays open.
function NativeDateTimePicker({ mode, value, onChange, onDone }: NativeDateTimePickerProps) {
  if (Platform.OS === 'android') {
    return <DateTimePicker mode={mode} value={value} onChange={onChange} />;
  }

  return (
    <View style={styles.inlinePicker}>
      <DateTimePicker display="inline" mode={mode} value={value} onChange={onChange} />
      <Pressable accessibilityLabel="Done choosing completion time" accessibilityRole="button" onPress={onDone} style={styles.pickerDoneButton}>
        <Text style={styles.pickerDoneText}>Done</Text>
      </Pressable>
    </View>
  );
}

// Merges a date-picker selection into the existing timestamp without unexpectedly resetting the other field.
function mergeDateTime(currentValue: Date, selectedValue: Date, mode: PickerMode): Date {
  const nextValue = new Date(currentValue);
  if (mode === 'date') {
    nextValue.setFullYear(selectedValue.getFullYear(), selectedValue.getMonth(), selectedValue.getDate());
  } else {
    nextValue.setHours(selectedValue.getHours(), selectedValue.getMinutes(), 0, 0);
  }
  return nextValue;
}

// Converts unknown save errors into clear form feedback.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(23, 31, 39, 0.36)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: spacing.sm,
  },
  cancelText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    gap: spacing.lg,
    padding: spacing.xl,
    width: '100%',
  },
  completedSection: {
    gap: spacing.sm,
  },
  disabledSaveButton: {
    opacity: 0.45,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    padding: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inlinePicker: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  pickerDoneButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 46,
  },
  pickerDoneText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 50,
  },
  saveText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
  },
  timestampActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timestampButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  timestampText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  validation: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
});
