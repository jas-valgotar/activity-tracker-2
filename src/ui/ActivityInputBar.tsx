// Overview: Provides a compact home-screen activity composer with on-demand duration settings.

import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Clock3, Mic, Plus } from 'lucide-react-native';
import { createSpeechRecognitionService } from '../services/speech/SpeechRecognitionService';
import { DEFAULT_TARGET_DURATION_MINUTES, formatTargetDuration } from '../domain/time';
import { DurationPicker } from './DurationPicker';
import { DebugComponentLabel } from './DebugComponentFrame';
import { colors, radii, spacing } from './theme';

type ActivityInputBarProps = {
  onAdd(title: string, durationMinutes?: number): Promise<void>;
  onPauseCurrentAndStart(title: string, durationMinutes?: number): Promise<void>;
};

// Renders the bottom activity entry bar on the default home screen.
export function ActivityInputBar({ onAdd, onPauseCurrentAndStart }: ActivityInputBarProps) {
  const speechService = useMemo(() => createSpeechRecognitionService(), []);
  const titleInputRef = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDurationPickerVisible, setIsDurationPickerVisible] = useState(false);

  // Adds the typed or dictated activity title to the active list.
  async function handleAdd() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isAdding) {
      return;
    }

    setIsAdding(true);
    try {
      await onAdd(trimmedTitle, durationMinutes ?? undefined);
      setTitle('');
      setDurationMinutes(null);
      Keyboard.dismiss();
    } catch (error) {
      if (isActiveActivityConflict(error)) {
        Alert.alert('Activity In Progress', 'Pause the current activity and start this one?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pause & Start',
            onPress: async () => {
              try {
                await onPauseCurrentAndStart(trimmedTitle, durationMinutes ?? undefined);
                setTitle('');
                setDurationMinutes(null);
                Keyboard.dismiss();
              } catch (switchError) {
                Alert.alert('Could Not Switch Activity', getErrorMessage(switchError));
              }
            },
          },
        ]);
      } else {
        Alert.alert('Could Not Start Activity', getErrorMessage(error));
      }
    } finally {
      setIsAdding(false);
    }
  }

  // Starts one native dictation session and appends recognized text to the field.
  async function handleDictation() {
    if (isListening) {
      return;
    }

    setIsListening(true);
    try {
      const recognizedText = await speechService.recognizeOnce();
      if (recognizedText.trim()) {
        setTitle(current => [current.trim(), recognizedText.trim()].filter(Boolean).join(' '));
      }
    } catch (error) {
      Alert.alert('Dictation Unavailable', error instanceof Error ? error.message : 'Please try typing instead.');
    } finally {
      setIsListening(false);
    }
  }

  return (
    <View style={styles.container}>
      <DebugComponentLabel componentId="ui.activity-input-bar" componentName="ActivityInputBar" />
      <View style={styles.entryRow}>
        <TextInput
          accessibilityLabel="Activity name"
          blurOnSubmit={false}
          ref={titleInputRef}
          onChangeText={setTitle}
          onSubmitEditing={handleAdd}
          placeholder="What are you working on?"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          style={styles.input}
          value={title}
        />
        <Pressable
          accessibilityLabel="Choose focus duration"
          accessibilityRole="button"
          onPress={() => {
            setIsDurationPickerVisible(true);
            titleInputRef.current?.focus();
          }}
          style={styles.durationButton}
        >
          <Clock3 color={colors.primary} size={16} strokeWidth={2.4} />
          <Text style={styles.durationText}>{formatTargetDuration(durationMinutes ?? DEFAULT_TARGET_DURATION_MINUTES)}</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dictate activity"
          disabled={isListening}
          onPress={handleDictation}
          style={[styles.iconButton, styles.micButton, isListening ? styles.activeButton : null]}
        >
          {isListening ? <ActivityIndicator color={colors.primaryDeep} /> : <Mic color={colors.primaryDeep} size={20} />}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start activity"
          disabled={isAdding || !title.trim()}
          onPress={handleAdd}
          style={[styles.iconButton, styles.addButton, !title.trim() ? styles.disabledButton : null]}
        >
          {isAdding ? <ActivityIndicator color={colors.surface} /> : <Plus color={colors.surface} size={24} strokeWidth={2.6} />}
        </Pressable>
      </View>
      {isDurationPickerVisible ? (
        <View accessibilityLabel="Focus duration overlay" style={styles.durationOverlay}>
          <View style={styles.modalHeader}>
            <Text accessibilityRole="header" style={styles.modalTitle}>Focus duration</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsDurationPickerVisible(false);
                titleInputRef.current?.focus();
              }}
              style={styles.doneButton}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <DurationPicker label="Target" presentation="inline" value={durationMinutes} onChange={setDurationMinutes} />
        </View>
      ) : null}
    </View>
  );
}

// Identifies the single-active-activity guard so the user can explicitly switch focus.
function isActiveActivityConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Only one activity can be active');
}

// Converts unknown action errors into concise user-facing copy.
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

const styles = StyleSheet.create({
  activeButton: {
    backgroundColor: colors.primarySoft,
  },
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.sm,
    position: 'relative',
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  entryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  disabledButton: {
    opacity: 0.45,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  addButton: {
    backgroundColor: colors.primaryDeep,
  },
  micButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    padding: 0,
  },
  durationButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  durationOverlay: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    bottom: '100%',
    elevation: 5,
    left: 0,
    marginBottom: spacing.sm,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 14,
    zIndex: 10,
  },
  durationText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  doneButton: {
    padding: spacing.xs,
  },
  doneText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
});
