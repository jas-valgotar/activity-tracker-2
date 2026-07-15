// Overview: Owns ActivityKit lifecycle calls and exposes queued Lock Screen commands to React Native.

import ActivityKit
import Foundation

@objc(ActivityLiveActivityManager)
final class ActivityLiveActivityManager: NSObject {
  // Starts or updates the single Live Activity represented by the supplied activity payload.
  @objc(startOrUpdate:resolver:rejecter:)
  func startOrUpdate(
    _ payload: NSDictionary,
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    guard
      let activityId = payload["activityId"] as? String,
      let colorKey = payload["colorKey"] as? NSNumber,
      (0...7).contains(colorKey.intValue),
      let title = payload["title"] as? String,
      let targetDurationMinutes = payload["targetDurationMinutes"] as? NSNumber,
      let statusValue = payload["status"] as? String,
      let elapsedMilliseconds = payload["elapsedMilliseconds"] as? NSNumber,
      let status = ActivityLiveActivityStatus(rawValue: statusValue)
    else {
      reject("activity_live_payload", "Live Activity payload is invalid.", nil)
      return
    }

    Task {
      do {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
          resolve(false)
          return
        }

        let now = Date()
        let elapsed = max(0, elapsedMilliseconds.int64Value)
        let progressStartAt = status == .active
          ? now.addingTimeInterval(-Double(elapsed) / 1_000)
          : nil
        let state = ActivityLiveActivityAttributes.ContentState(
          status: status,
          elapsedMilliseconds: elapsed,
          progressStartAt: progressStartAt,
        )
        let content = ActivityContent(state: state, staleDate: nil)
        let activities = Activity<ActivityLiveActivityAttributes>.activities

        for activity in activities where activity.attributes.activityId != activityId {
          await activity.end(nil, dismissalPolicy: .immediate)
        }

        if let existing = activities.first(where: { $0.attributes.activityId == activityId }),
           existing.attributes.colorKey == colorKey.intValue {
          await existing.update(content)
        } else {
          if let existing = activities.first(where: { $0.attributes.activityId == activityId }) {
            await existing.end(nil, dismissalPolicy: .immediate)
          }
          let attributes = ActivityLiveActivityAttributes(
            activityId: activityId,
            colorKey: colorKey.intValue,
            title: title,
            targetDurationMinutes: targetDurationMinutes.intValue,
          )
          _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
        }

        resolve(true)
      } catch {
        reject("activity_live_start", "Live Activity could not be started or updated.", error)
      }
    }
  }

  // Ends the Live Activity for one completed, deleted, or replaced activity.
  @objc(end:resolver:rejecter:)
  func end(
    _ activityId: NSString,
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    Task {
      for activity in Activity<ActivityLiveActivityAttributes>.activities where activity.attributes.activityId == activityId as String {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      resolve(nil)
    }
  }

  // Returns the activity identifier currently displayed by ActivityKit, if one exists.
  @objc(getCurrentActivityId:rejecter:)
  func getCurrentActivityId(
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    let activityId = Activity<ActivityLiveActivityAttributes>.activities.first?.attributes.activityId
    resolve(activityId)
  }

  // Reads queued Lock Screen commands without removing them.
  @objc(consumeCommands:rejecter:)
  func consumeCommands(
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    resolve(ActivityLiveActivityCommandStore.consume().map(commandDictionary))
  }

  // Acknowledges only commands that JavaScript applied successfully.
  @objc(acknowledgeCommands:resolver:rejecter:)
  func acknowledgeCommands(
    _ commandIds: NSArray,
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    let ids = commandIds.compactMap { $0 as? String }
    ActivityLiveActivityCommandStore.acknowledge(commandIds: ids)
    resolve(nil)
  }

  // Converts the Swift command value to the JSON-compatible shape expected by React Native.
  private func commandDictionary(_ command: ActivityLiveActivityCommand) -> [String: Any] {
    [
      "commandId": command.commandId,
      "activityId": command.activityId,
      "action": command.action,
      "occurredAt": command.occurredAt,
    ]
  }
}
