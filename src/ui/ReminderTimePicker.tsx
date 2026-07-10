// Overview: Provides optional low-friction daily reminder time selection for reusable activity presets.

import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { formatReminderTime, parseReminderTime } from '../domain/reminderTime';
import { colors, radii, spacing } from './theme';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

type ReminderTimePickerProps = {
  value: number | null;
  onChange(value: number | null): void;
};

const QUICK_TIMES: Array<number | null> = [null, 8 * 60, 12 * 60, 17 * 60, 20 * 60];

// Renders familiar reminder choices and an editable 24-hour custom time.
export function ReminderTimePicker({ value, onChange }: ReminderTimePickerProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customText, setCustomText] = useState(value === null ? '09:00' : formatTwentyFourHourTime(value));
  const isCustomSelected = value !== null && !QUICK_TIMES.includes(value);

  function openCustomPicker() {
    setCustomText(value === null ? '09:00' : formatTwentyFourHourTime(value));
    setIsCustomOpen(true);
  }

  function applyCustomTime() {
    const parsed = parseReminderTime(customText);
    if (parsed === null) {
      return;
    }
    onChange(parsed);
    setIsCustomOpen(false);
  }

  return (
    <View>
      <Text style={styles.label}>REMINDER (OPTIONAL)</Text>
      <View style={styles.optionsViewport}>
        <View style={styles.options}>
          {QUICK_TIMES.map(time => {
            const isSelected = time === value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={time === null ? 'No daily reminder' : `Remind at ${formatReminderTime(time)}`}
                accessibilityState={{ selected: isSelected }}
                key={time === null ? 'none' : time}
                onPress={() => onChange(time)}
                style={[styles.option, isSelected ? styles.selectedOption : null]}
              >
                {isSelected ? <Check color={colors.surface} size={13} strokeWidth={3} /> : null}
                <Text style={[styles.optionText, isSelected ? styles.selectedOptionText : null]}>
                  {time === null ? 'None' : formatReminderTime(time)}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose custom reminder time"
            accessibilityState={{ selected: isCustomSelected }}
            onPress={openCustomPicker}
            style={[styles.option, styles.customOption, isCustomSelected ? styles.selectedOption : null]}
          >
            {isCustomSelected ? <Check color={colors.surface} size={13} strokeWidth={3} /> : null}
            <Text style={[styles.optionText, isCustomSelected ? styles.selectedOptionText : styles.customOptionText]}>
              {isCustomSelected ? formatReminderTime(value) : 'Custom'}
            </Text>
          </Pressable>
        </View>
      </View>
      <Modal animationType="slide" transparent visible={isCustomOpen} onRequestClose={() => setIsCustomOpen(false)}>
        <KeyboardAwareScrollView contentContainerStyle={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>DAILY REMINDER</Text>
                <Text style={styles.modalTitle}>When should we remind you?</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel reminder time" onPress={() => setIsCustomOpen(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>Use 24-hour time, for example 09:30 or 17:00.</Text>
            <TextInput
              accessibilityLabel="Reminder time in 24 hour format"
              autoFocus
              keyboardType="numbers-and-punctuation"
              onChangeText={setCustomText}
              placeholder="09:00"
              placeholderTextColor={colors.muted}
              style={styles.timeInput}
              value={customText}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use reminder time"
              disabled={parseReminderTime(customText) === null}
              onPress={applyCustomTime}
              style={[styles.doneButton, parseReminderTime(customText) === null ? styles.disabledButton : null]}
            >
              <Text style={styles.doneText}>{parseReminderTime(customText) === null ? 'Enter a valid time' : `Remind at ${formatReminderTime(parseReminderTime(customText) as number)}`}</Text>
            </Pressable>
          </View>
        </KeyboardAwareScrollView>
      </Modal>
    </View>
  );
}

// Formats a minute-of-day for the editable 24-hour field.
function formatTwentyFourHourTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: spacing.sm,
  },
  optionsViewport: {
    overflow: 'hidden',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  customOption: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  selectedOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  customOptionText: {
    color: colors.primaryDeep,
  },
  selectedOptionText: {
    color: colors.surface,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.xl,
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 21,
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
  hint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  timeInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.md,
    padding: spacing.md,
    textAlign: 'center',
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 50,
  },
  disabledButton: {
    opacity: 0.45,
  },
  doneText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
  },
});
