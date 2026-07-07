// Overview: Provides the home-screen text input, native dictation button, and add action.

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Mic, Plus } from 'lucide-react-native';
import { createSpeechRecognitionService } from '../services/speech/SpeechRecognitionService';
import { colors, spacing } from './theme';

type ActivityInputBarProps = {
  onAdd(title: string): Promise<void>;
};

// Renders the bottom activity entry bar on the default home screen.
export function ActivityInputBar({ onAdd }: ActivityInputBarProps) {
  const speechService = useMemo(() => createSpeechRecognitionService(), []);
  const [title, setTitle] = useState('');
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
      await onAdd(trimmedTitle);
      setTitle('');
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
      <TextInput
        accessibilityLabel="Activity name"
        onChangeText={setTitle}
        onSubmitEditing={handleAdd}
        placeholder="Activity you want to start"
        placeholderTextColor={colors.muted}
        returnKeyType="done"
        style={styles.input}
        value={title}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dictate activity"
        disabled={isListening}
        onPress={handleDictation}
        style={[styles.iconButton, isListening ? styles.activeButton : null]}
      >
        {isListening ? <ActivityIndicator color={colors.surface} /> : <Mic color={colors.surface} size={22} />}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start activity"
        disabled={isAdding || !title.trim()}
        onPress={handleAdd}
        style={[styles.iconButton, !title.trim() ? styles.disabledButton : null]}
      >
        {isAdding ? <ActivityIndicator color={colors.surface} /> : <Plus color={colors.surface} size={24} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  activeButton: {
    backgroundColor: colors.complete,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    left: 0,
    padding: spacing.lg,
    position: 'absolute',
    right: 0,
  },
  disabledButton: {
    opacity: 0.45,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
});
