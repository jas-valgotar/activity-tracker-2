// Overview: Verifies the Completed screen exposes and opens the historical activity form.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { CompletedScreen } from '../src/screens/CompletedScreen';

const mockLogPastActivity = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/data/AppDataProvider', () => ({
  useAppData: () => ({ logPastActivity: mockLogPastActivity }),
}));

jest.mock('../src/ui/ActivityList', () => ({
  ActivityList: () => null,
}));

jest.mock('../src/ui/ScreenHeader', () => ({
  ScreenHeader: ({ trailingAction }: { trailingAction?: React.ReactNode }) => trailingAction ?? null,
}));

jest.mock('../src/ui/PastActivityComposer', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');

  return {
    PastActivityComposer: ({ visible }: { visible: boolean }) => (visible ? ReactModule.createElement(Text, null, 'Past activity form open') : null),
  };
});

describe('CompletedScreen', () => {
  it('opens the past-activity form from the Completed screen', () => {
    let testRenderer: renderer.ReactTestRenderer | undefined;

    act(() => {
      testRenderer = renderer.create(<CompletedScreen />);
    });
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Log past activity' }).props.onPress());

    expect(testRenderer!.root.findByProps({ children: 'Past activity form open' })).toBeTruthy();
  });
});
