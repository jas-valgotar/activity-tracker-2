// Overview: Provides the home-screen text input, native dictation button, and add action.

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Mic, Plus, Sparkles } from 'lucide-react-native';
import { createSpeechRecognitionService } from '../services/speech/SpeechRecognitionService';
import { DEFAULT_TARGET_DURATION_MINUTES } from '../domain/time';
import { DurationPicker } from './DurationPicker';
import { colors, radii, spacing } from './theme';

type ActivityInputBarProps = {
  onAdd(title: string, durationMinutes: number): Promise<void>;
};

// Renders the bottom activity entry bar on the default home screen.
export function ActivityInputBar({ onAdd }: ActivityInputBarProps) {
  const speechService = useMemo(() => createSpeechRecognitionService(), []);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_TARGET_DURATION_MINUTES);
  const [isAdding, setIsAdding] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Adds the typed or dictated activity title to the active list.
  async function handleAdd() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isAdding) {
      return;
    }

    setIsAdding(true);
    try {
      await onAdd(trimmedTitle, durationMinutes);
      setTitle('');
      setDurationMinutes(DEFAULT_TARGET_DURATION_MINUTES);
    } catch (error) {
      Alert.alert('Could Not Start Activity', error instanceof Error ? error.message : 'Please try again.');
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
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Sparkles color={colors.primary} size={16} strokeWidth={2.4} />
        </View>
        <View style={styles.headingCopy}>
          <TextInput
            accessibilityLabel="Activity name"
            onChangeText={setTitle}
            onSubmitEditing={handleAdd}
            placeholder="What are you working on?"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
            value={title}
          />
          <Text style={styles.helper}>Start a timer with a clear intention</Text>
        </View>
      </View>
      <View style={styles.durationPicker}>
        <DurationPicker value={durationMinutes} onChange={setDurationMinutes} />
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
    </View>
  );
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
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headingCopy: {
    flex: 1,
  },
  durationPicker: {
    marginTop: spacing.md,
  },
  headingIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    marginTop: 4,
    width: 32,
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
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
    marginTop: spacing.sm,
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
    fontSize: 17,
    fontWeight: '800',
    minWidth: 210,
    padding: 0,
  },
});
