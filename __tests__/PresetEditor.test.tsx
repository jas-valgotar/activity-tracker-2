// Overview: Verifies a new routine editor can receive a prefilled activity draft without editing an existing routine.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { PresetEditor } from '../src/ui/PresetEditor';

jest.mock('../src/ui/DurationPicker', () => ({
  DurationPicker: () => null,
}));

jest.mock('../src/ui/ReminderTimePicker', () => ({
  ReminderTimePicker: () => null,
}));

describe('PresetEditor', () => {
  it('prefills a new routine from an activity draft', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(
        <PresetEditor
          draft={{ title: 'Walk outside', durationMinutes: 15, reminderTimeMinutes: null }}
          onClose={jest.fn()}
          onSave={save}
          preset={null}
          visible
        />,
      );
    });

    const input = tree!.root.findByProps({ accessibilityLabel: 'Preset name' });
    expect(input.props.value).toBe('Walk outside');
    const saveButton = tree!.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function').at(-1);
    await act(async () => {
      await saveButton?.props.onPress();
    });

    expect(save).toHaveBeenCalledWith('Walk outside', 15, null);
    act(() => tree?.unmount());
  });
});
