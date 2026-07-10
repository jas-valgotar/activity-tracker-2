// Overview: Verifies that the custom duration editor opens, accepts arbitrary minutes, and submits them.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { DurationPicker } from '../src/ui/DurationPicker';

describe('DurationPicker', () => {
  let testRenderer: renderer.ReactTestRenderer | null = null;

  afterEach(() => {
    if (testRenderer) {
      act(() => {
        testRenderer?.unmount();
      });
      testRenderer = null;
    }
  });

  it('opens Custom and submits an arbitrary whole-minute duration', () => {
    let selectedDuration: number | null = null;

    act(() => {
      testRenderer = renderer.create(<DurationPicker value={null} onChange={value => { selectedDuration = value; }} />);
    });

    act(() => {
      testRenderer?.root.findByProps({ accessibilityLabel: 'Choose custom duration' }).props.onPress();
    });

    act(() => {
      testRenderer?.root.findByProps({ accessibilityLabel: 'Custom duration in minutes' }).props.onChangeText('37');
    });

    act(() => {
      testRenderer?.root.findByProps({ accessibilityLabel: 'Use custom duration' }).props.onPress();
    });

    expect(selectedDuration).toBe(37);
  });
});
