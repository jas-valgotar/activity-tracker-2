// Overview: Provides low-friction 15-minute duration choices with an optional custom stepper.

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Minus, Plus } from 'lucide-react-native';
import {
  DEFAULT_TARGET_DURATION_MINUTES,
  formatTargetDuration,
  MAX_TARGET_DURATION_MINUTES,
  MIN_TARGET_DURATION_MINUTES,
  TARGET_DURATION_STEP_MINUTES,
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
  const [customValue, setCustomValue] = useState<number>(value ?? DEFAULT_TARGET_DURATION_MINUTES);

  function openCustomPicker() {
    setCustomValue(value ?? DEFAULT_TARGET_DURATION_MINUTES);
    setIsCustomOpen(true);
  }

  function changeCustomValue(delta: number) {
    setCustomValue(current =>
      Math.min(
        MAX_TARGET_DURATION_MINUTES,
        Math.max(MIN_TARGET_DURATION_MINUTES, current + delta),
      ),
    );
  }

  function applyCustomValue() {
    onChange(customValue);
    setIsCustomOpen(false);
  }

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.selectedValue}>
          {value === null ? `Default ${formatTargetDuration(DEFAULT_TARGET_DURATION_MINUTES)}` : formatTargetDuration(value)}
        </Text>
      </View>
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
        <Pressable accessibilityRole="button" onPress={openCustomPicker} style={[styles.option, styles.customOption]}>
          <Text style={styles.customOptionText}>Custom</Text>
        </Pressable>
      </ScrollView>
      <Modal animationType="slide" transparent visible={isCustomOpen} onRequestClose={() => setIsCustomOpen(false)}>
        <View style={styles.modalBackdrop}>
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
            <Text style={styles.customValue}>{formatTargetDuration(customValue)}</Text>
            <Text style={styles.customHint}>Choose in 15-minute increments, up to 8 hours.</Text>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease duration"
                disabled={customValue <= MIN_TARGET_DURATION_MINUTES}
                onPress={() => changeCustomValue(-TARGET_DURATION_STEP_MINUTES)}
                style={[styles.stepButton, customValue <= MIN_TARGET_DURATION_MINUTES ? styles.disabledStepButton : null]}
              >
                <Minus color={colors.primary} size={22} />
              </Pressable>
              <Text style={styles.stepValue}>{customValue} min</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase duration"
                disabled={customValue >= MAX_TARGET_DURATION_MINUTES}
                onPress={() => changeCustomValue(TARGET_DURATION_STEP_MINUTES)}
                style={[styles.stepButton, customValue >= MAX_TARGET_DURATION_MINUTES ? styles.disabledStepButton : null]}
              >
                <Plus color={colors.primary} size={22} />
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={applyCustomValue} style={styles.doneButton}>
              <Text style={styles.doneText}>Use {formatTargetDuration(customValue)}</Text>
            </Pressable>
          </View>
        </View>
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
  customOptionText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
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
  customValue: {
    color: colors.text,
    fontSize: 52,
    fontWeight: '900',
    marginTop: spacing.xxl,
    textAlign: 'center',
  },
  customHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
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
  stepValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 52,
  },
  doneText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
  },
});
