// Overview: Verifies quick reminder selection and custom time input behavior.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ReminderTimePicker } from '../src/ui/ReminderTimePicker';

describe('ReminderTimePicker', () => {
  it('selects a quick reminder time', () => {
    let selected: number | null = null;
    let testRenderer: renderer.ReactTestRenderer | undefined;

    act(() => {
      testRenderer = renderer.create(<ReminderTimePicker value={null} onChange={value => { selected = value; }} />);
    });

    act(() => {
      testRenderer!.root.findByProps({ accessibilityLabel: 'Remind at 5:00 PM' }).props.onPress();
    });

    expect(selected).toBe(17 * 60);
    act(() => testRenderer?.unmount());
  });

  it('accepts a custom reminder time', () => {
    let selected: number | null = null;
    let testRenderer: renderer.ReactTestRenderer | undefined;

    act(() => {
      testRenderer = renderer.create(<ReminderTimePicker value={null} onChange={value => { selected = value; }} />);
    });
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Choose custom reminder time' }).props.onPress());
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Reminder time in 24 hour format' }).props.onChangeText('18:15'));
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Use reminder time' }).props.onPress());

    expect(selected).toBe(18 * 60 + 15);
    act(() => testRenderer?.unmount());
  });
});
