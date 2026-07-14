# Live Activity controls

## Overview

The iOS Live Activity lets a person pause, resume, or stop the current focus activity from the Lock Screen or Dynamic Island. Controls update the Live Activity immediately and queue the matching database action until the app is opened normally.

## Why the controls initially did nothing

App Intents reconstruct their values when a button is tapped. The original intent stored `activityId` as a normal Swift property, so iOS could run the default initializer with an empty ID. The intent then could not find the matching Live Activity and safely returned without changing it.

Each control intent now declares `activityId` with `@Parameter`. This makes the ID part of the App Intent payload and lets the pause, resume, and stop actions locate the correct Live Activity.

## Control flow

1. The Live Activity button runs an App Intent in the widget extension.
2. The intent updates the displayed Live Activity and appends a command to the shared app-group defaults store.
3. The app processes queued commands when it next enters the foreground, then persists the pause, resume, or completion in SQLite.

`openAppWhenRun` is deliberately `false`: using a control should keep the person on the Lock Screen. Tapping the Live Activity itself remains the explicit way to open the app.

## Layout

The progress bar, trailing remaining-time label, Pause/Resume, and Stop buttons share one row. The buttons are 56 by 56 points, use high-contrast backgrounds, and retain VoiceOver labels.

## Key files

- `ios/ActivityTracker/ActivityLiveActivityIntents.swift` — App Intent parameters and lifecycle actions.
- `ios/ActivityTracker/ActivityLiveActivityCommandStore.swift` — shared command queue.
- `ios/ActivityTrackerLiveActivity/ActivityTrackerLiveActivity.swift` — Lock Screen layout and controls.
- `src/data/AppDataProvider.tsx` — applies queued commands to SQLite after the app opens.
- `__tests__/activityLiveActivityIntents.test.ts` — regression checks for intent serialization and control layout.
