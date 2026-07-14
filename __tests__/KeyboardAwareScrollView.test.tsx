// Overview: Verifies form selection taps and scrolling do not dismiss an active keyboard.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ScrollView, Text } from 'react-native';
import { KeyboardAwareScrollView } from '../src/ui/KeyboardAwareScrollView';

describe('KeyboardAwareScrollView', () => {
  it('keeps the keyboard visible while form controls are selected or scrolled', () => {
    let testRenderer: renderer.ReactTestRenderer | undefined;

    act(() => {
      testRenderer = renderer.create(
        <KeyboardAwareScrollView>
          <Text>Form content</Text>
        </KeyboardAwareScrollView>,
      );
    });

    const scrollView = testRenderer!.root.findByType(ScrollView);
    expect(scrollView.props.keyboardDismissMode).toBe('none');
    expect(scrollView.props.keyboardShouldPersistTaps).toBe('always');
    act(() => testRenderer?.unmount());
  });
});
