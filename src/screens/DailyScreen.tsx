// Overview: Shows editable daily activity presets that start normal timed activities.

import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { useAppData } from '../data/AppDataProvider';
import type { ActivityPreset } from '../domain/activityTypes';
import type { MainTabParamList } from '../navigation/types';
import { DailyPresetCard } from '../ui/DailyPresetCard';
import { DebugComponentLabel } from '../ui/DebugComponentFrame';
import { KeyboardAwareScrollView } from '../ui/KeyboardAwareScrollView';
import { PresetEditor } from '../ui/PresetEditor';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors, radii, spacing } from '../ui/theme';

// Renders daily shortcuts and starts them as regular activities.
export function DailyScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { listPresets, createPreset, updatePreset, deletePreset, createActivity, pauseCurrentAndCreateActivity } = useAppData();
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

  function openEdit(preset: ActivityPreset) {
    setEditorPreset(preset);
    setIsEditorVisible(true);
  }

  async function handleSave(title: string, durationMinutes: number, reminderTimeMinutes: number | null) {
    try {
      if (editorPreset) {
        await updatePreset(editorPreset.id, title, durationMinutes, reminderTimeMinutes);
      } else {
        await createPreset(title, durationMinutes, reminderTimeMinutes);
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
      if (isActiveActivityConflict(error)) {
        Alert.alert('Activity In Progress', 'Pause the current activity and start this one?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pause & Start',
            onPress: async () => {
              try {
                await pauseCurrentAndCreateActivity(preset.title, preset.durationMinutes);
                navigation.navigate('Home');
              } catch (switchError) {
                Alert.alert('Could Not Switch Activity', getErrorMessage(switchError));
              }
            },
          },
        ]);
      } else {
        Alert.alert('Could Not Start Activity', getErrorMessage(error));
      }
    }
  }

  // Identifies the single-active-activity guard so a preset can offer a focus switch.
  function isActiveActivityConflict(error: unknown): boolean {
    return error instanceof Error && error.message.includes('Only one activity can be active');
  }

  // Converts unknown start errors into concise user-facing copy.
  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Please try again.';
  }

  return (
    <View style={styles.container}>
      <DebugComponentLabel componentId="screen.daily" componentName="DailyScreen" />
      <ScreenHeader
        title="Daily"
        showSort={false}
        trailingAction={
          <Pressable
            accessibilityLabel="Add daily activity"
            accessibilityRole="button"
            onPress={() => {
              setEditorPreset(null);
              setIsEditorVisible(true);
            }}
            style={styles.addButton}
          >
            <Plus color={colors.surface} size={22} strokeWidth={2.6} />
          </Pressable>
        }
      />
      <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {presets.length > 0 ? presets.map(preset => (
          <DailyPresetCard key={preset.id} onDelete={confirmDelete} onEdit={openEdit} onStart={handleStart} preset={preset} />
        )) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No daily routines yet</Text>
            <Text style={styles.emptyHint}>Create a preset for anything you want to return to.</Text>
          </View>
        )}
      </KeyboardAwareScrollView>
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
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xxl,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
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
