// Overview: Verifies the Daily composer submits a title, optional target, and optional reminder together.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { DailyPresetComposer } from '../src/ui/DailyPresetComposer';

describe('DailyPresetComposer', () => {
  it('submits the selected duration and reminder time', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    let testRenderer: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      testRenderer = renderer.create(<DailyPresetComposer onSave={save} />);
    });
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Daily activity name' }).props.onChangeText('Meditation'));
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Remind at 5:00 PM' }).props.onPress());
    await act(async () => {
      await testRenderer!.root.findByProps({ accessibilityLabel: 'Add daily activity' }).props.onPress();
    });

    expect(save).toHaveBeenCalledWith('Meditation', 60, 17 * 60);
    act(() => testRenderer?.unmount());
  });
});
