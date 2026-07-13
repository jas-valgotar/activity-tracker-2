// Overview: Tests that debug component labels are hidden by default and expose stable component references when enabled.

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { featureFlags } from '../src/config/featureFlags';
import { DebugComponentLabel } from '../src/ui/DebugComponentFrame';

describe('DebugComponentLabel', () => {
  it('does not render a label while the debug flag is disabled', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DebugComponentLabel componentId="ui.example" componentName="Example" />);
    });

    expect(tree!.toJSON()).toBeNull();
    act(() => tree!.unmount());
  });

  it('renders the component ID and name while the debug flag is enabled', () => {
    const originalValue = featureFlags.debugComponentLabels;
    featureFlags.debugComponentLabels = true;

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DebugComponentLabel componentId="ui.example" componentName="Example" />);
    });

    const renderedLabel = JSON.stringify(tree!.toJSON());
    expect(renderedLabel).toContain('ui.example');
    expect(renderedLabel).toContain('Example');
    act(() => tree!.unmount());
    featureFlags.debugComponentLabels = originalValue;
  });
});
