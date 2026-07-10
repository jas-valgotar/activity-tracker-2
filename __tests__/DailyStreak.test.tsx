// Overview: Verifies the streak card exposes current and best streak values to users.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { DailyStreak } from '../src/ui/DailyStreak';

type RenderedNode = string | { children?: RenderedNode[] | null } | null;

// Flattens host text nodes so assertions remain stable across React Native renderer versions.
function collectText(node: RenderedNode | RenderedNode[]): string {
  if (Array.isArray(node)) {
    return node.map(collectText).join('');
  }
  if (typeof node === 'string') {
    return node;
  }
  return node?.children ? collectText(node.children) : '';
}

describe('DailyStreak', () => {
  it('renders the current streak count and best streak', () => {
    let testRenderer: renderer.ReactTestRenderer | undefined;

    act(() => {
      testRenderer = renderer.create(<DailyStreak bestDays={5} days={2} />);
    });

    const renderedText = collectText(testRenderer!.toJSON() as RenderedNode);

    expect(testRenderer!.root.findByProps({ accessibilityLabel: '2 day activity streak' })).toBeTruthy();
    expect(renderedText).toContain('2 days completed');
    expect(renderedText).toContain('5 days');

    act(() => {
      testRenderer?.unmount();
    });
  });
});
