// Overview: Verifies historical completed-session form validation, timestamp selection, and reset behavior.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { PastActivityComposer } from '../src/ui/PastActivityComposer';

jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable } = require('react-native');

  return ({ mode, onChange }: { mode: 'date' | 'time'; onChange: (event: { type: string }, value: Date) => void }) => (
    <Pressable
      accessibilityLabel={`Mock ${mode} picker`}
      onPress={() => onChange({ type: 'set' }, mode === 'date' ? new Date(2026, 6, 10) : new Date(2026, 0, 1, 13, 45))}
    />
  );
});

describe('PastActivityComposer', () => {
  let testRenderer: renderer.ReactTestRenderer | null = null;
  let nowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 6, 13, 12, 0, 0).getTime());
  });

  afterEach(() => {
    nowSpy.mockRestore();
    if (testRenderer) {
      act(() => {
        testRenderer?.unmount();
      });
      testRenderer = null;
    }
  });

  it('requires a title before allowing a historical session to save', () => {
    act(() => {
      testRenderer = renderer.create(<PastActivityComposer visible onClose={jest.fn()} onSave={jest.fn()} />);
    });

    expect(testRenderer!.root.findByProps({ accessibilityLabel: 'Save past activity' }).props.disabled).toBe(true);
  });

  it('submits the selected duration and completion date/time, then resets the form', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    await act(async () => {
      testRenderer = renderer.create(<PastActivityComposer visible onClose={onClose} onSave={onSave} />);
    });
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Past activity name' }).props.onChangeText('Reading'));
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Choose 30m duration' }).props.onPress());
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Choose completion date' }).props.onPress());
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Mock date picker' }).props.onPress());
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Done choosing completion time' }).props.onPress());
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Choose completion time' }).props.onPress());
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Mock time picker' }).props.onPress());
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Done choosing completion time' }).props.onPress());

    await act(async () => {
      await testRenderer!.root.findByProps({ accessibilityLabel: 'Save past activity' }).props.onPress();
    });

    expect(onSave).toHaveBeenCalledWith('Reading', 30, new Date(2026, 6, 10, 13, 45, 0, 0).getTime());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(testRenderer!.root.findByProps({ accessibilityLabel: 'Past activity name' }).props.value).toBe('');
  });
});
