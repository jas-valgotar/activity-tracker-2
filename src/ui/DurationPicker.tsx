// Overview: Provides low-friction quick duration choices with an arbitrary whole-minute custom input.

import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronRight, Minus, Plus } from 'lucide-react-native';
import {
  DEFAULT_TARGET_DURATION_MINUTES,
  formatTargetDuration,
  MAX_TARGET_DURATION_MINUTES,
  MIN_TARGET_DURATION_MINUTES,
} from '../domain/time';
import { colors, radii, spacing } from './theme';

type DurationPickerProps = {
  value: number | null;
  onChange(value: number | null): void;
  label?: string;
};

const QUICK_DURATIONS = [15, 30, 45, 60, 90, 120];

// Renders quick duration chips and a modal stepper for less common targets.
export function DurationPicker({ value, onChange, label = 'Duration' }: DurationPickerProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customText, setCustomText] = useState(String(value ?? DEFAULT_TARGET_DURATION_MINUTES));

  const isCustomSelected = value !== null && !QUICK_DURATIONS.includes(value);

  function getCustomValue(): number | null {
    if (!/^\d+$/.test(customText)) {
      return null;
    }

    const parsed = Number(customText);
    return Number.isInteger(parsed) && parsed >= MIN_TARGET_DURATION_MINUTES && parsed <= MAX_TARGET_DURATION_MINUTES
      ? parsed
      : null;
  }

  function openCustomPicker() {
    setCustomText(String(value ?? DEFAULT_TARGET_DURATION_MINUTES));
    setIsCustomOpen(true);
  }

  function changeCustomValue(delta: number) {
    const current = getCustomValue() ?? DEFAULT_TARGET_DURATION_MINUTES;
    const next = Math.min(MAX_TARGET_DURATION_MINUTES, Math.max(MIN_TARGET_DURATION_MINUTES, current + delta));
    setCustomText(String(next));
  }

  function applyCustomValue() {
    const nextValue = getCustomValue();
    if (nextValue === null) {
      return;
    }

    onChange(nextValue);
    setIsCustomOpen(false);
  }

  const customValue = getCustomValue();

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.selectedValue}>
          {value === null ? `Default ${formatTargetDuration(DEFAULT_TARGET_DURATION_MINUTES)}` : formatTargetDuration(value)}
        </Text>
      </View>
      <View style={styles.optionsViewport}>
        <ScrollView contentContainerStyle={styles.options} horizontal showsHorizontalScrollIndicator={false}>
          {QUICK_DURATIONS.map(duration => {
            const isSelected = duration === value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={duration}
                onPress={() => onChange(duration)}
                style={[styles.option, isSelected ? styles.selectedOption : null]}
              >
                {isSelected ? <Check color={colors.surface} size={14} strokeWidth={3} /> : null}
                <Text style={[styles.optionText, isSelected ? styles.selectedOptionText : null]}>
                  {formatTargetDuration(duration)}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose custom duration"
            accessibilityState={{ selected: isCustomSelected }}
            onPress={openCustomPicker}
            style={[styles.option, styles.customOption, isCustomSelected ? styles.selectedCustomOption : null]}
          >
            {isCustomSelected ? <Check color={colors.surface} size={14} strokeWidth={3} /> : null}
            <Text style={[styles.customOptionText, isCustomSelected ? styles.selectedCustomOptionText : null]}>
              {isCustomSelected ? formatTargetDuration(value) : 'Custom'}
            </Text>
          </Pressable>
        </ScrollView>
        <View pointerEvents="none" style={styles.scrollCue}>
          <ChevronRight color={colors.muted} size={16} strokeWidth={2.6} />
        </View>
      </View>
      <Modal animationType="slide" transparent visible={isCustomOpen} onRequestClose={() => setIsCustomOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>CUSTOM TARGET</Text>
                <Text style={styles.modalTitle}>How long should you focus?</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setIsCustomOpen(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
            <Text style={styles.customHint}>Enter any whole number of minutes, from 15 minutes to 8 hours.</Text>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease duration"
                disabled={customValue !== null && customValue <= MIN_TARGET_DURATION_MINUTES}
                onPress={() => changeCustomValue(-1)}
                style={[styles.stepButton, customValue !== null && customValue <= MIN_TARGET_DURATION_MINUTES ? styles.disabledStepButton : null]}
              >
                <Minus color={colors.primary} size={22} />
              </Pressable>
              <View style={styles.inputGroup}>
                <TextInput
                  accessibilityLabel="Custom duration in minutes"
                  keyboardType="number-pad"
                  maxLength={3}
                  onChangeText={text => setCustomText(text.replace(/[^0-9]/g, ''))}
                  selectTextOnFocus
                  style={styles.stepInput}
                  value={customText}
                />
                <Text style={styles.stepUnit}>min</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase duration"
                disabled={customValue !== null && customValue >= MAX_TARGET_DURATION_MINUTES}
                onPress={() => changeCustomValue(1)}
                style={[styles.stepButton, customValue !== null && customValue >= MAX_TARGET_DURATION_MINUTES ? styles.disabledStepButton : null]}
              >
                <Plus color={colors.primary} size={22} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use custom duration"
              disabled={customValue === null}
              onPress={applyCustomValue}
              style={[styles.doneButton, customValue === null ? styles.disabledDoneButton : null]}
            >
              <Text style={styles.doneText}>{customValue === null ? 'Enter a valid duration' : `Use ${formatTargetDuration(customValue)}`}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  selectedValue: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  options: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  optionsViewport: {
    position: 'relative',
  },
  scrollCue: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    bottom: 0,
    justifyContent: 'center',
    opacity: 0.9,
    paddingLeft: spacing.xs,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 24,
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
  selectedOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedOptionText: {
    color: colors.surface,
  },
  customOption: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  selectedCustomOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  customOptionText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedCustomOptionText: {
    color: colors.surface,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    flex: 1,
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
  customHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xxl,
    textAlign: 'center',
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  disabledStepButton: {
    opacity: 0.35,
  },
  inputGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepInput: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    minWidth: 104,
    padding: 0,
    textAlign: 'right',
  },
  stepUnit: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 52,
  },
  disabledDoneButton: {
    opacity: 0.45,
  },
  doneText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
  },
});
