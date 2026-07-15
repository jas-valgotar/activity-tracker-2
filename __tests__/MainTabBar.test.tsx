// Overview: Verifies the compact bottom navigation exposes only Home and All.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { MainTabBar } from '../src/navigation/MainTabBar';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

describe('MainTabBar', () => {
  it('does not render removed destinations', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    const state = {
      index: 0,
      routes: [{ key: 'home', name: 'Home' }, { key: 'all', name: 'All' }],
    };
    const navigation = { emit: jest.fn(), navigate: jest.fn() };

    act(() => {
      tree = renderer.create(
        <MainTabBar
          descriptors={{} as never}
          jumpTo={jest.fn()}
          layout={{ height: 0, width: 0 }}
          navigation={navigation as never}
          position={{} as never}
          state={state as never}
        />,
      );
    });

    expect(tree!.root.findAllByProps({ accessibilityLabel: 'Show Daily activities' })).toHaveLength(0);
    expect(tree!.root.findAllByProps({ accessibilityLabel: 'Show Done activities' })).toHaveLength(0);
    expect(tree!.root.findByProps({ accessibilityLabel: 'Show Home activities' })).toBeTruthy();
    expect(tree!.root.findByProps({ accessibilityLabel: 'Show All activities' })).toBeTruthy();
  });
});
