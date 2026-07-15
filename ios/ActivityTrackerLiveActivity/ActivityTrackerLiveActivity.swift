// Overview: Renders the Lock Screen and Dynamic Island presentation for the current focus activity.

import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct ActivityTrackerLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    ActivityTrackerLiveActivity()
  }
}

struct ActivityTrackerLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ActivityLiveActivityAttributes.self) { context in
      ActivityLockScreenView(context: context)
        .activityBackgroundTint(LiveActivityPalette.forKey(context.attributes.colorKey).background)
        .activitySystemActionForegroundColor(Color(red: 0.20, green: 0.32, blue: 0.45))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          StatusPill(status: context.state.status)
        }
        DynamicIslandExpandedRegion(.trailing) {
          RemainingTimeLabel(context: context)
            .font(.caption2.weight(.bold))
            .foregroundStyle(.secondary)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.title)
            .font(.headline.weight(.bold))
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          ActivityProgressView(context: context)
        }
      } compactLeading: {
        Image(systemName: context.state.status == .active ? "timer" : "pause.circle")
      } compactTrailing: {
        RemainingTimeLabel(context: context)
          .font(.caption2.weight(.bold))
      } minimal: {
        Image(systemName: context.state.status == .active ? "timer" : "pause.circle")
      }
    }
  }
}

// Keeps SwiftUI's goal colors in sync with the persisted React Native color-key contract.
private struct LiveActivityPalette {
  let background: Color
  let accent: Color

  static func forKey(_ colorKey: Int?) -> LiveActivityPalette {
    switch colorKey {
    case 1:
      return LiveActivityPalette(background: Color(red: 0.957, green: 0.980, blue: 0.961), accent: Color(red: 0.439, green: 0.659, blue: 0.518))
    case 2:
      return LiveActivityPalette(background: Color(red: 1.000, green: 0.984, blue: 0.937), accent: Color(red: 0.765, green: 0.604, blue: 0.271))
    case 3:
      return LiveActivityPalette(background: Color(red: 0.973, green: 0.961, blue: 0.988), accent: Color(red: 0.612, green: 0.529, blue: 0.765))
    case 4:
      return LiveActivityPalette(background: Color(red: 0.992, green: 0.961, blue: 0.969), accent: Color(red: 0.780, green: 0.478, blue: 0.573))
    case 5:
      return LiveActivityPalette(background: Color(red: 0.945, green: 0.980, blue: 0.973), accent: Color(red: 0.392, green: 0.663, blue: 0.627))
    case 6:
      return LiveActivityPalette(background: Color(red: 0.992, green: 0.965, blue: 0.949), accent: Color(red: 0.773, green: 0.525, blue: 0.412))
    case 7:
      return LiveActivityPalette(background: Color(red: 0.957, green: 0.965, blue: 0.988), accent: Color(red: 0.490, green: 0.588, blue: 0.776))
    default:
      return LiveActivityPalette(background: Color(red: 0.953, green: 0.976, blue: 0.992), accent: Color(red: 0.369, green: 0.608, blue: 0.780))
    }
  }
}

private struct ActivityLockScreenView: View {
  let context: ActivityViewContext<ActivityLiveActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .top, spacing: 10) {
        Image(systemName: context.state.status == .active ? "timer" : "pause.circle.fill")
          .font(.title3.weight(.bold))
          .foregroundStyle(LiveActivityPalette.forKey(context.attributes.colorKey).accent)
        VStack(alignment: .leading, spacing: 3) {
          Text(context.attributes.title)
            .font(.headline.weight(.bold))
            .lineLimit(2)
          StatusPill(status: context.state.status)
        }
        Spacer(minLength: 8)
        RemainingTimeLabel(context: context)
          .font(.caption.weight(.bold))
          .foregroundStyle(.secondary)
      }

      ActivityProgressView(context: context)
    }
    .padding(16)
  }
}

// Renders two large, high-contrast control buttons beside the progress indicator.
private struct ActivityProgressControls: View {
  let context: ActivityViewContext<ActivityLiveActivityAttributes>

  var body: some View {
    HStack(spacing: 8) {
      if context.state.status == .active {
        ActivityControlButton(
          label: "Pause",
          symbol: "pause.fill",
          intent: PauseActivityIntent(activityId: context.attributes.activityId),
          tint: Color(red: 0.698, green: 0.545, blue: 0.259),
        )
      } else {
        ActivityControlButton(
          label: "Resume",
          symbol: "play.fill",
          intent: ResumeActivityIntent(activityId: context.attributes.activityId),
          tint: Color(red: 0.373, green: 0.584, blue: 0.745),
        )
      }
      ActivityControlButton(
        label: "Stop",
        symbol: "stop.fill",
        intent: CompleteActivityIntent(activityId: context.attributes.activityId),
        tint: Color(red: 0.780, green: 0.329, blue: 0.302),
      )
    }
  }
}

// Keeps Lock Screen actions high contrast with a 56-point square tap target and clear VoiceOver labels.
private struct ActivityControlButton<Intent: AppIntent>: View {
  let label: String
  let symbol: String
  let intent: Intent
  var tint: Color = .primary

  var body: some View {
    Button(intent: intent) {
      Image(systemName: symbol)
        .font(.title3.weight(.bold))
        .frame(width: 56, height: 56)
        .foregroundStyle(tint)
        .background(tint.opacity(0.16), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
    .buttonStyle(.plain)
    .contentShape(Rectangle())
    .accessibilityLabel("\(label) activity")
  }
}

private struct ActivityProgressView: View {
  let context: ActivityViewContext<ActivityLiveActivityAttributes>

  var body: some View {
    HStack(spacing: 10) {
      VStack(alignment: .leading, spacing: 6) {
        Group {
          if context.state.status == .active, let progressRange {
            ProgressView(timerInterval: progressRange, countsDown: false)
              .tint(LiveActivityPalette.forKey(context.attributes.colorKey).accent)
          } else {
            ProgressView(value: pausedProgress)
              .tint(LiveActivityPalette.forKey(context.attributes.colorKey).accent)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        HStack(spacing: 0) {
          Spacer(minLength: 0)
          RemainingTimeLabel(context: context)
            .font(.caption2.weight(.bold))
            .foregroundStyle(.secondary)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      ActivityProgressControls(context: context)
    }
  }

  private var progressRange: ClosedRange<Date>? {
    guard let start = context.state.progressStartAt else {
      return nil
    }

    let end = start.addingTimeInterval(Double(context.attributes.targetDurationMinutes) * 60)
    return start...end
  }

  private var pausedProgress: Double {
    let targetMilliseconds = max(1, context.attributes.targetDurationMinutes * 60 * 1_000)
    return min(1, max(0, Double(context.state.elapsedMilliseconds) / Double(targetMilliseconds)))
  }

}

// Uses ActivityKit's system-managed countdown so active Live Activities tick while the app is backgrounded.
private struct RemainingTimeLabel: View {
  let context: ActivityViewContext<ActivityLiveActivityAttributes>

  var body: some View {
    if context.state.status == .active, let countdownRange {
      Text(
        timerInterval: countdownRange,
        countsDown: true,
        showsHours: context.attributes.targetDurationMinutes >= 60
      )
      .monospacedDigit()
    } else {
      Text(formatSignedDuration(remainingMilliseconds(at: Date())))
    }
  }

  private var countdownRange: ClosedRange<Date>? {
    guard let progressStartAt = context.state.progressStartAt else {
      return nil
    }

    let targetEndAt = progressStartAt.addingTimeInterval(Double(context.attributes.targetDurationMinutes) * 60)
    return Date()...targetEndAt
  }

  private func remainingMilliseconds(at date: Date) -> Int64 {
    let elapsedMilliseconds = context.state.elapsedMillisecondsAt(date)
    let targetMilliseconds = Int64(context.attributes.targetDurationMinutes) * 60 * 1_000
    return targetMilliseconds - elapsedMilliseconds
  }
}

private struct StatusPill: View {
  let status: ActivityLiveActivityStatus

  var body: some View {
    Text(status == .active ? "IN FOCUS" : "PAUSED")
      .font(.caption2.weight(.black))
      .foregroundStyle(status == .active ? Color(red: 0.373, green: 0.584, blue: 0.745) : Color(red: 0.698, green: 0.545, blue: 0.259))
  }
}

private func formatSignedDuration(_ milliseconds: Int64) -> String {
  let sign = milliseconds < 0 ? "-" : ""
  let totalSeconds = max(0, abs(milliseconds) / 1_000)
  let hours = totalSeconds / 3_600
  let minutes = (totalSeconds % 3_600) / 60
  let seconds = totalSeconds % 60
  if hours > 0 {
    return minutes > 0 ? "\(sign)\(hours)h\(minutes)m" : "\(sign)\(hours)h"
  }
  if minutes > 0 {
    return seconds > 0 ? "\(sign)\(minutes)m\(seconds)s" : "\(sign)\(minutes)m"
  }
  return "\(sign)\(seconds)s"
}
