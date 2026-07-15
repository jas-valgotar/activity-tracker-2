// Overview: Verifies the All screen exposes and opens the historical activity form.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AllActivitiesScreen } from '../src/screens/AllActivitiesScreen';

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

describe('AllActivitiesScreen', () => {
  it('opens the past-activity form from the All screen', () => {
    let testRenderer: renderer.ReactTestRenderer | undefined;

    act(() => {
      testRenderer = renderer.create(<AllActivitiesScreen />);
    });
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Log past activity' }).props.onPress());

    expect(testRenderer!.root.findByProps({ children: 'Past activity form open' })).toBeTruthy();
  });
});
