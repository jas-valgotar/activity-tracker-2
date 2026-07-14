// Overview: Defines direct Lock Screen controls that update the Live Activity and queue matching SQLite commands.

import ActivityKit
import AppIntents
import Foundation

@available(iOS 17.0, *)
struct PauseActivityIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Pause Activity"
  // Keeps the user on the Lock Screen; the app applies the queued command on its next foreground launch.
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Activity identifier")
  var activityId: String

  init() {
    activityId = ""
  }

  init(activityId: String) {
    self.activityId = activityId
  }

  func perform() async throws -> some IntentResult {
    guard let activity = Activity<ActivityLiveActivityAttributes>.activities.first(where: { $0.attributes.activityId == activityId }) else {
      return .result()
    }

    let now = Date()
    let currentState = activity.content.state
    guard currentState.status == .active else {
      return .result()
    }

    let elapsedMilliseconds = currentState.elapsedMillisecondsAt(now)
    ActivityLiveActivityCommandStore.enqueue(activityId: activityId, action: "pause", occurredAt: now)
    let pausedState = ActivityLiveActivityAttributes.ContentState(
      status: .paused,
      elapsedMilliseconds: elapsedMilliseconds,
      progressStartAt: nil,
    )
    await activity.update(ActivityContent(state: pausedState, staleDate: nil))
    return .result()
  }
}

@available(iOS 17.0, *)
struct ResumeActivityIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Resume Activity"
  // Keeps the user on the Lock Screen; the app applies the queued command on its next foreground launch.
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Activity identifier")
  var activityId: String

  init() {
    activityId = ""
  }

  init(activityId: String) {
    self.activityId = activityId
  }

  func perform() async throws -> some IntentResult {
    guard let activity = Activity<ActivityLiveActivityAttributes>.activities.first(where: { $0.attributes.activityId == activityId }) else {
      return .result()
    }

    let now = Date()
    let currentState = activity.content.state
    guard currentState.status == .paused else {
      return .result()
    }

    ActivityLiveActivityCommandStore.enqueue(activityId: activityId, action: "resume", occurredAt: now)
    let progressStartAt = now.addingTimeInterval(-Double(max(0, currentState.elapsedMilliseconds)) / 1_000)
    let activeState = ActivityLiveActivityAttributes.ContentState(
      status: .active,
      elapsedMilliseconds: currentState.elapsedMilliseconds,
      progressStartAt: progressStartAt,
    )
    await activity.update(ActivityContent(state: activeState, staleDate: nil))
    return .result()
  }
}

@available(iOS 17.0, *)
struct CompleteActivityIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Stop Activity"
  // Keeps the user on the Lock Screen; the app applies the queued command on its next foreground launch.
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Activity identifier")
  var activityId: String

  init() {
    activityId = ""
  }

  init(activityId: String) {
    self.activityId = activityId
  }

  func perform() async throws -> some IntentResult {
    guard let activity = Activity<ActivityLiveActivityAttributes>.activities.first(where: { $0.attributes.activityId == activityId }) else {
      return .result()
    }

    let now = Date()
    ActivityLiveActivityCommandStore.enqueue(activityId: activityId, action: "complete", occurredAt: now)
    await activity.end(nil, dismissalPolicy: .immediate)
    return .result()
  }
}
