// Overview: Defines Lock Screen controls that update the Live Activity, synchronize local alerts, and queue SQLite commands.

import ActivityKit
import AppIntents
import Foundation
import UserNotifications

private let notificationCategory = "activity-focus-notification"
private let targetNotificationPrefix = "activity-target-"
private let pauseNotificationPrefix = "activity-pause-reminder-"

// Keeps background Lock Screen actions and the app's local alerts synchronized before JavaScript next runs.
private enum ActivityIntentNotifications {
  static func pause(activityId: String, title: String) {
    cancelTarget(activityId: activityId)
    schedule(
      identifier: pauseNotificationPrefix + activityId,
      title: "Keep your momentum",
      body: "Ready to resume \(title)? A short focus session can keep your momentum going.",
      delay: 30 * 60,
      userInfo: ["activityId": activityId, "type": "activity-pause-reminder"]
    )
  }

  static func resume(activityId: String, title: String, targetDurationMinutes: Int, elapsedMilliseconds: Int64) {
    cancelPause(activityId: activityId)
    let remainingMilliseconds = Int64(targetDurationMinutes) * 60 * 1_000 - elapsedMilliseconds
    guard remainingMilliseconds > 0 else { return }
    schedule(
      identifier: targetNotificationPrefix + activityId,
      title: "Focus target reached",
      body: "Nice work — \(title) reached its \(formatTarget(targetDurationMinutes)) target. Take a breath, then start another focus session when ready.",
      delay: max(1, Double(remainingMilliseconds) / 1_000),
      userInfo: ["activityId": activityId, "type": "activity-target-reached"]
    )
  }

  static func complete(activityId: String) {
    cancelTarget(activityId: activityId)
    cancelPause(activityId: activityId)
  }

  private static func cancelTarget(activityId: String) {
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [targetNotificationPrefix + activityId])
  }

  private static func cancelPause(activityId: String) {
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [pauseNotificationPrefix + activityId])
  }

  private static func schedule(identifier: String, title: String, body: String, delay: TimeInterval, userInfo: [AnyHashable: Any]) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.categoryIdentifier = notificationCategory
    content.sound = .default
    content.userInfo = userInfo
    let request = UNNotificationRequest(
      identifier: identifier,
      content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
    )
    UNUserNotificationCenter.current().add(request)
  }
}

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
    ActivityIntentNotifications.pause(activityId: activityId, title: activity.attributes.title)
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

    let elapsedMilliseconds = max(0, currentState.elapsedMilliseconds)
    ActivityIntentNotifications.resume(
      activityId: activityId,
      title: activity.attributes.title,
      targetDurationMinutes: activity.attributes.targetDurationMinutes,
      elapsedMilliseconds: elapsedMilliseconds
    )
    ActivityLiveActivityCommandStore.enqueue(activityId: activityId, action: "resume", occurredAt: now)
    let progressStartAt = now.addingTimeInterval(-Double(elapsedMilliseconds) / 1_000)
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
    ActivityIntentNotifications.complete(activityId: activityId)
    ActivityLiveActivityCommandStore.enqueue(activityId: activityId, action: "complete", occurredAt: now)
    await activity.end(nil, dismissalPolicy: .immediate)
    return .result()
  }
}

// Matches the JavaScript notification copy while remaining available to the App Intent extension.
private func formatTarget(_ minutes: Int) -> String {
  let hours = minutes / 60
  let remainingMinutes = minutes % 60
  if hours == 0 {
    return "\(minutes) minutes"
  }
  return remainingMinutes == 0 ? "\(hours) hour\(hours == 1 ? "" : "s")" : "\(hours)h \(remainingMinutes)m"
}
