// Overview: Tests the compact Focus composer keeps duration choices on demand without removing the control.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Keyboard } from 'react-native';
import { ActivityInputBar } from '../src/ui/ActivityInputBar';

jest.mock('../src/services/speech/SpeechRecognitionService', () => ({
  createSpeechRecognitionService: () => ({ recognizeOnce: jest.fn() }),
}));

jest.mock('../src/ui/DurationPicker', () => ({
  DurationPicker: () => {
    const ReactModule = require('react');
    const { Text } = require('react-native');

    return ReactModule.createElement(Text, null, 'Duration options');
  },
}));

describe('ActivityInputBar', () => {
  it('opens duration choices only after the compact duration control is requested', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ActivityInputBar onAdd={jest.fn()} onPauseCurrentAndStart={jest.fn()} />,
      );
    });

    expect(tree!.root.findAllByProps({ children: 'Duration options' })).toHaveLength(0);

    act(() => {
      tree!.root.findByProps({ accessibilityLabel: 'Choose focus duration' }).props.onPress();
    });

    expect(tree!.root.findAllByProps({ children: 'Duration options' }).length).toBeGreaterThan(0);
    expect(tree!.root.findByProps({ children: 'Focus duration' })).toBeDefined();
    expect(tree!.root.findByProps({ accessibilityLabel: 'Focus duration overlay' })).toBeDefined();
    expect(tree!.root.findByProps({ accessibilityLabel: 'Activity name' }).props.blurOnSubmit).toBe(false);
    act(() => tree!.unmount());
  });

  it('dismisses the keyboard only after successfully adding an activity', async () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(jest.fn());
    const onAdd = jest.fn().mockResolvedValue(undefined);
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ActivityInputBar onAdd={onAdd} onPauseCurrentAndStart={jest.fn()} />);
    });

    act(() => {
      tree!.root.findByProps({ accessibilityLabel: 'Activity name' }).props.onChangeText('Write tests');
    });
    await act(async () => {
      await tree!.root.findByProps({ accessibilityLabel: 'Start activity' }).props.onPress();
    });

    expect(onAdd).toHaveBeenCalledWith('Write tests', undefined);
    expect(dismissSpy).toHaveBeenCalledTimes(1);
    dismissSpy.mockRestore();
    act(() => tree!.unmount());
  });
});
