// Overview: Provides a compact persisted sort selector for activity list screens.

import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDownUp, Check } from 'lucide-react-native';
import type { ActivitySortMode } from '../domain/activityTypes';
import { SORT_LABELS, SORT_MODES } from '../domain/sort';
import { colors, radii, spacing } from './theme';

type SortMenuProps = {
  value: ActivitySortMode;
  onChange(value: ActivitySortMode): void;
};

// Opens a small modal menu for choosing the activity list sort mode.
export function SortMenu({ value, onChange }: SortMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Selects and persists a sort mode through the parent screen.
  function handleSelect(nextValue: ActivitySortMode) {
    setIsOpen(false);
    onChange(nextValue);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sort activities"
        hitSlop={8}
        onPress={() => setIsOpen(true)}
        style={styles.iconButton}
      >
        <ArrowDownUp color={colors.primaryDeep} size={20} strokeWidth={2.5} />
      </Pressable>
      <Modal animationType="fade" transparent visible={isOpen} onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.menu}>
            {SORT_MODES.map(sortMode => (
              <Pressable key={sortMode} onPress={() => handleSelect(sortMode)} style={styles.option}>
                <Text style={styles.optionText}>{SORT_LABELS[sortMode]}</Text>
                {value === sortMode ? <Check color={colors.primary} size={18} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    flex: 1,
    paddingRight: spacing.lg,
    paddingTop: 112,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    width: 40,
  },
  menu: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    minWidth: 180,
    overflow: 'hidden',
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
