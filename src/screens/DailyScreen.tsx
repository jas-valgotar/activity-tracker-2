// Overview: Shows editable daily activity presets that start normal timed activities.

import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAppData } from '../data/AppDataProvider';
import type { ActivityPreset } from '../domain/activityTypes';
import type { MainTabParamList } from '../navigation/types';
import { DailyPresetCard } from '../ui/DailyPresetCard';
import { PresetEditor } from '../ui/PresetEditor';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors, radii, spacing } from '../ui/theme';

// Renders daily shortcuts and starts them as regular activities.
export function DailyScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { listPresets, createPreset, updatePreset, deletePreset, createActivity } = useAppData();
  const [presets, setPresets] = useState<ActivityPreset[]>([]);
  const [editorPreset, setEditorPreset] = useState<ActivityPreset | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);

  const loadPresets = useCallback(async () => {
    setPresets(await listPresets());
  }, [listPresets]);

  useFocusEffect(
    useCallback(() => {
      loadPresets().catch(error => console.error('Failed to load daily presets', error));
    }, [loadPresets]),
  );

  function openCreate() {
    setEditorPreset(null);
    setIsEditorVisible(true);
  }

  function openEdit(preset: ActivityPreset) {
    setEditorPreset(preset);
    setIsEditorVisible(true);
  }

  async function handleSave(title: string, durationMinutes: number) {
    try {
      if (editorPreset) {
        await updatePreset(editorPreset.id, title, durationMinutes);
      } else {
        await createPreset(title, durationMinutes);
      }
      setIsEditorVisible(false);
      await loadPresets();
    } catch (error) {
      Alert.alert('Could Not Save Preset', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  function confirmDelete(preset: ActivityPreset) {
    Alert.alert('Delete preset', `Remove "${preset.title}" from Daily?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePreset(preset.id);
          await loadPresets();
        },
      },
    ]);
  }

  async function handleStart(preset: ActivityPreset) {
    try {
      await createActivity(preset.title, preset.durationMinutes);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Could Not Start Activity', error instanceof Error ? error.message : 'Pause the current activity first.');
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Daily" subtitle="Start a familiar session in one tap." showSort={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>Your routines</Text>
            <Text style={styles.sectionHint}>Small, repeatable starts add up.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Add daily preset" onPress={openCreate} style={styles.addButton}>
            <Plus color={colors.surface} size={18} strokeWidth={2.8} />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>
        {presets.length > 0 ? presets.map(preset => (
          <DailyPresetCard key={preset.id} onDelete={confirmDelete} onEdit={openEdit} onStart={handleStart} preset={preset} />
        )) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No daily routines yet</Text>
            <Text style={styles.emptyHint}>Create a preset for anything you want to return to.</Text>
          </View>
        )}
      </ScrollView>
      <PresetEditor
        onClose={() => setIsEditorVisible(false)}
        onSave={handleSave}
        preset={editorPreset}
        visible={isEditorVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  addText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
