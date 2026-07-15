// Overview: Verifies the configurable completion notice is visible at a target and can stop its alarm immediately.

import React from 'react';
import renderer, { act } from 'react-test-renderer';

const mockDismissCompletionNotice = jest.fn();
const mockUseAppData = jest.fn();

jest.mock('../src/data/AppDataProvider', () => ({ useAppData: mockUseAppData }));

const { CompletionTimerNotice } = require('../src/ui/CompletionTimerNotice') as typeof import('../src/ui/CompletionTimerNotice');

describe('CompletionTimerNotice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppData.mockReturnValue({
      completionNotice: { activityId: 'activity-1', title: 'Write tests', expiresAt: Date.now() + 10_000 },
      dismissCompletionNotice: mockDismissCompletionNotice,
    });
  });

  it('shows the completion countdown and lets the user dismiss it', () => {
    let testRenderer: renderer.ReactTestRenderer | undefined;
    act(() => {
      testRenderer = renderer.create(<CompletionTimerNotice />);
    });

    expect(testRenderer!.root.findByProps({ children: 'Goal reached' })).toBeDefined();
    expect(testRenderer!.root.findByProps({ children: 'Stop alarm' })).toBeDefined();
    act(() => testRenderer!.root.findByProps({ accessibilityLabel: 'Stop goal alarm' }).props.onPress());
    expect(mockDismissCompletionNotice).toHaveBeenCalledTimes(1);
    act(() => testRenderer?.unmount());
  });
});
