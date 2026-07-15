// Overview: Defines the ActivityKit attributes and time-aware content state shared by the app and widget extension.

import ActivityKit
import Foundation

enum ActivityLiveActivityStatus: String, Codable, Hashable {
  case active
  case paused
}

struct ActivityLiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var status: ActivityLiveActivityStatus
    var elapsedMilliseconds: Int64
    var progressStartAt: Date?

    // Calculates elapsed active time from the fixed progress anchor used by the widget.
    func elapsedMillisecondsAt(_ date: Date) -> Int64 {
      guard status == .active, let progressStartAt else {
        return max(0, elapsedMilliseconds)
      }

      return max(0, Int64(date.timeIntervalSince(progressStartAt) * 1_000))
    }
  }

  let activityId: String
  let colorKey: Int?
  let title: String
  let targetDurationMinutes: Int
}
