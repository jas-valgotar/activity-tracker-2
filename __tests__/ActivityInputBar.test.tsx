// Overview: Tests the compact Focus composer keeps duration choices on demand without removing the control.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
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
    act(() => tree!.unmount());
  });
});
