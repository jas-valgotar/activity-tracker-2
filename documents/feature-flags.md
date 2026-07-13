# Feature flags

Feature flags are small development switches that allow optional behavior to be enabled without changing the normal app experience. They are defined in `src/config/featureFlags.ts` and are disabled by default.

## Enable component labels

To display a small label on supported visible components, change this value and refresh the app:

```ts
export const featureFlags = {
  debugComponentLabels: true,
};
```

Set it back to `false` to remove every label.

Labels use this format:

```text
component-id · ComponentName
```

For example, the home screen is labeled `screen.home · HomeScreen`. Repeated items include their record ID, such as `ui.activity-row:<activity-id> · ActivityRow`. Include the full label in a bug report or LLM prompt to identify the exact UI component to change.

## How it works

`DebugComponentLabel` in `src/ui/DebugComponentFrame.tsx` checks `debugComponentLabels` before rendering. When disabled, it returns `null`, so the normal UI has no added visual element or interaction target. Labels ignore touches and are placed above their owning component.

## Add a label to a new component

1. Import `DebugComponentLabel` from `src/ui/DebugComponentFrame`.
2. Render it as a child of the component's outer visible `View`.
3. Give it a stable, descriptive ID and the exported component name.
4. Ensure the outer view has `position: 'relative'` in its style so the label is positioned within that component.

```tsx
<View style={styles.card}>
  <DebugComponentLabel componentId="ui.example-card" componentName="ExampleCard" />
  {/* Component content */}
</View>
```

For repeated data, append the record ID to the component ID:

```tsx
<DebugComponentLabel componentId={`ui.example-card:${item.id}`} componentName="ExampleCard" />
```

## Add a future flag

Add a boolean to the `featureFlags` object. Read it with `isFeatureEnabled` instead of importing the object directly in UI code, so the flag source can evolve later without changing each caller.

```ts
export const featureFlags = {
  debugComponentLabels: false,
  showExperimentalTimer: false,
};

if (isFeatureEnabled('showExperimentalTimer')) {
  // Render the experimental behavior.
}
```
