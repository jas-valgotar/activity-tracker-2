// Overview: Tests shared activity-list loading behavior when app data changes.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ActivityList } from '../src/ui/ActivityList';
import type { ActivityWithLogs } from '../src/domain/activityTypes';

const mockUseNavigation = jest.fn(() => ({ navigate: jest.fn() }));
let mockAppDataContext: ReturnType<typeof createMockAppDataContext>;
let testRenderer: renderer.ReactTestRenderer | null = null;

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');

  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactModule.useEffect(() => callback(), [callback]);
    },
    useNavigation: () => mockUseNavigation(),
  };
});

jest.mock('../src/data/AppDataProvider', () => ({
  useAppData: () => mockAppDataContext,
}));

jest.mock('../src/ui/ActivityRow', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');

  return {
    ActivityRow: ({ activity }: { activity: ActivityWithLogs }) => (
      ReactModule.createElement(Text, null, activity.title)
    ),
  };
});

// Creates the minimum app-data context shape ActivityList needs for one test render.
function createMockAppDataContext() {
  return {
    activityRevision: 0,
    listActivities: jest.fn().mockResolvedValue([]),
    pauseActivity: jest.fn(),
    resumeActivity: jest.fn(),
    completeActivity: jest.fn(),
    deleteActivity: jest.fn(),
  };
}

describe('ActivityList', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAppDataContext = createMockAppDataContext();
  });

  afterEach(() => {
    if (testRenderer) {
      act(() => {
        testRenderer?.unmount();
      });
      testRenderer = null;
    }

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('reloads mounted activity lists when activity data revision changes', async () => {
    await act(async () => {
      testRenderer = renderer.create(<ActivityList filter="home" emptyText="No Activity Started" />);
    });

    expect(mockAppDataContext.listActivities).toHaveBeenCalledTimes(1);
    expect(mockAppDataContext.listActivities).toHaveBeenLastCalledWith('home');

    mockAppDataContext = {
      ...mockAppDataContext,
      activityRevision: 1,
    };

    await act(async () => {
      testRenderer?.update(<ActivityList filter="home" emptyText="No Activity Started" />);
    });

    expect(mockAppDataContext.listActivities).toHaveBeenCalledTimes(2);
    expect(mockAppDataContext.listActivities).toHaveBeenLastCalledWith('home');
  });
});
