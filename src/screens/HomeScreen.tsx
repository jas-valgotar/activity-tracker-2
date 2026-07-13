// Overview: Combines the Focus queue, reusable routines, and one-off composer into the default Home screen.

import React, { useCallback, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { useAppData } from '../data/AppDataProvider';
import type { ActivityPreset } from '../domain/activityTypes';
import { ActivityInputBar } from '../ui/ActivityInputBar';
import { ActivityList } from '../ui/ActivityList';
import type { ActivityListHandle } from '../ui/ActivityList';
import { DebugComponentLabel } from '../ui/DebugComponentFrame';
import { PresetEditor } from '../ui/PresetEditor';
import type { PresetDraft } from '../ui/PresetEditor';
import { RoutineListSection } from '../ui/RoutineListSection';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors, radii } from '../ui/theme';

// Shows current focus work first, followed by routines and a compact one-off activity composer.
export function HomeScreen() {
  const {
    listPresets,
    createPreset,
    updatePreset,
    deletePreset,
    createActivity,
    pauseCurrentAndCreateActivity,
  } = useAppData();
  const activityListRef = useRef<ActivityListHandle>(null);
  const [routines, setRoutines] = useState<ActivityPreset[]>([]);
  const [editorPreset, setEditorPreset] = useState<ActivityPreset | null>(null);
  const [editorDraft, setEditorDraft] = useState<PresetDraft | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);

  const loadRoutines = useCallback(async () => {
    setRoutines(await listPresets());
  }, [listPresets]);

  useFocusEffect(
    useCallback(() => {
      loadRoutines().catch(error => console.error('Failed to load routines', error));
    }, [loadRoutines]),
  );

  // Opens the shared editor either for an existing routine or a prefilled new one.
  function openEditor(preset: ActivityPreset | null, draft: PresetDraft | null = null) {
    setEditorPreset(preset);
    setEditorDraft(draft);
    setIsEditorVisible(true);
  }

  async function handleSaveRoutine(title: string, durationMinutes: number, reminderTimeMinutes: number | null) {
    try {
      if (editorPreset) {
        await updatePreset(editorPreset.id, title, durationMinutes, reminderTimeMinutes);
      } else {
        await createPreset(title, durationMinutes, reminderTimeMinutes);
      }
      setIsEditorVisible(false);
      await loadRoutines();
    } catch (error) {
      Alert.alert('Could Not Save Routine', getErrorMessage(error));
    }
  }

  function confirmDeleteRoutine(routine: ActivityPreset) {
    Alert.alert('Delete routine', `Remove "${routine.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePreset(routine.id);
          await loadRoutines();
        },
      },
    ]);
  }

  // Starts a routine as a normal Focus activity and reveals the queue after success.
  async function handleStartRoutine(routine: ActivityPreset) {
    try {
      await createActivity(routine.title, routine.durationMinutes);
      activityListRef.current?.scrollToTop();
    } catch (error) {
      if (!isActiveActivityConflict(error)) {
        Alert.alert('Could Not Start Activity', getErrorMessage(error));
        return;
      }

      Alert.alert('Activity In Progress', 'Pause the current activity and start this one?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause & Start',
          onPress: async () => {
            try {
              await pauseCurrentAndCreateActivity(routine.title, routine.durationMinutes);
              activityListRef.current?.scrollToTop();
            } catch (switchError) {
              Alert.alert('Could Not Switch Activity', getErrorMessage(switchError));
            }
          },
        },
      ]);
    }
  }

  // Creates a new activity and lets the list reload through the provider revision.
  const handleAddActivity = useCallback(
    async (title: string, durationMinutes?: number) => {
      await createActivity(title, durationMinutes);
    },
    [createActivity],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={styles.keyboardAvoidingView}
    >
      <View style={styles.container}>
        <DebugComponentLabel componentId="screen.home" componentName="HomeScreen" />
        <ScreenHeader
          showSort={false}
          title="Home"
          trailingAction={
            <Pressable
              accessibilityLabel="Add routine"
              accessibilityRole="button"
              onPress={() => openEditor(null)}
              style={styles.addButton}
            >
              <Plus color={colors.surface} size={22} strokeWidth={2.6} />
            </Pressable>
          }
        />
        <ActivityList
          ref={activityListRef}
          emptyText="Nothing in focus"
          filter="home"
          footer={
            <RoutineListSection
              onDelete={confirmDeleteRoutine}
              onEdit={routine => openEditor(routine)}
              onStart={handleStartRoutine}
              routines={routines}
            />
          }
          minimalEmpty
        />
        <ActivityInputBar onAdd={handleAddActivity} onPauseCurrentAndStart={pauseCurrentAndCreateActivity} />
      </View>
      <PresetEditor
        draft={editorDraft}
        onClose={() => setIsEditorVisible(false)}
        onSave={handleSaveRoutine}
        preset={editorPreset}
        visible={isEditorVisible}
      />
    </KeyboardAvoidingView>
  );
}

// Identifies the single-active-activity guard so routines can offer an explicit focus switch.
function isActiveActivityConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Only one activity can be active');
}

// Converts unknown routine and activity errors into concise user-facing copy.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});
