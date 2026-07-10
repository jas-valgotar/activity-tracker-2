// Overview: Shows the temporary delete undo action shared by all screens.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RotateCcw, X } from 'lucide-react-native';
import { useAppData } from '../data/AppDataProvider';
import { colors, radii, spacing } from './theme';

// Renders a bottom toast while a soft-deleted activity can still be restored.
export function UndoToast() {
  const { pendingUndo, undoDelete, clearUndo } = useAppData();

  if (!pendingUndo) {
    return null;
  }

  return (
    <View style={styles.toast}>
      <Text numberOfLines={1} style={styles.message}>
        Deleted {pendingUndo.title}
      </Text>
      <Pressable accessibilityLabel={`Undo delete ${pendingUndo.title}`} accessibilityRole="button" onPress={undoDelete} style={styles.action}>
        <RotateCcw color={colors.surface} size={18} />
        <Text style={styles.actionText}>Undo</Text>
      </Pressable>
      <Pressable accessibilityLabel="Dismiss delete notification" accessibilityRole="button" hitSlop={8} onPress={clearUndo} style={styles.closeButton}>
        <X color={colors.surface} size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
  },
  actionText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  message: {
    color: colors.surface,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  toast: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.lg,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
});
