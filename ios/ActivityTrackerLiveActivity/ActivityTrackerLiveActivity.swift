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
        .activityBackgroundTint(Color(red: 0.97, green: 0.95, blue: 0.91))
        .activitySystemActionForegroundColor(Color(red: 0.07, green: 0.12, blue: 0.16))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          StatusPill(status: context.state.status)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(formatTarget(context.attributes.targetDurationMinutes))
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
        Text(formatTarget(context.attributes.targetDurationMinutes))
          .font(.caption2.weight(.bold))
      } minimal: {
        Image(systemName: context.state.status == .active ? "timer" : "pause.circle")
      }
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
          .foregroundStyle(Color(red: 0.07, green: 0.38, blue: 0.55))
        VStack(alignment: .leading, spacing: 3) {
          Text(context.attributes.title)
            .font(.headline.weight(.bold))
            .lineLimit(2)
          StatusPill(status: context.state.status)
        }
        Spacer(minLength: 8)
        Text(formatTarget(context.attributes.targetDurationMinutes))
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
          tint: Color(red: 0.07, green: 0.38, blue: 0.55),
        )
      } else {
        ActivityControlButton(
          label: "Resume",
          symbol: "play.fill",
          intent: ResumeActivityIntent(activityId: context.attributes.activityId),
          tint: Color(red: 0.07, green: 0.38, blue: 0.55),
        )
      }
      ActivityControlButton(
        label: "Stop",
        symbol: "stop.fill",
        intent: CompleteActivityIntent(activityId: context.attributes.activityId),
        tint: .red,
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
              .tint(Color(red: 0.07, green: 0.38, blue: 0.55))
          } else {
            ProgressView(value: pausedProgress)
              .tint(Color(red: 0.75, green: 0.48, blue: 0.08))
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        HStack(spacing: 0) {
          Spacer(minLength: 0)
          TimelineView(.periodic(from: .now, by: 1)) { timeline in
            Text(formatRemainingTime(at: timeline.date))
              .font(.caption2.weight(.bold))
              .foregroundStyle(.secondary)
          }
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

  // Displays time left until the goal, or a minus-prefixed overdue duration after the goal passes.
  private func formatRemainingTime(at date: Date) -> String {
    let elapsedMilliseconds = context.state.elapsedMillisecondsAt(date)
    let targetMilliseconds = Int64(context.attributes.targetDurationMinutes) * 60 * 1_000
    let remainingMilliseconds = targetMilliseconds - elapsedMilliseconds
    return formatSignedDuration(remainingMilliseconds)
  }
}

private struct StatusPill: View {
  let status: ActivityLiveActivityStatus

  var body: some View {
    Text(status == .active ? "IN FOCUS" : "PAUSED")
      .font(.caption2.weight(.black))
      .foregroundStyle(status == .active ? Color(red: 0.07, green: 0.38, blue: 0.55) : Color(red: 0.65, green: 0.40, blue: 0.05))
  }
}

private func formatTarget(_ minutes: Int) -> String {
  let hours = minutes / 60
  let remainingMinutes = minutes % 60
  if hours == 0 {
    return "\(minutes)m"
  }
  return remainingMinutes == 0 ? "\(hours)h" : "\(hours)h \(remainingMinutes)m"
}

private func formatSignedDuration(_ milliseconds: Int64) -> String {
  let sign = milliseconds < 0 ? "-" : ""
  let totalSeconds = max(0, abs(milliseconds) / 1_000)
  let hours = totalSeconds / 3_600
  let minutes = (totalSeconds % 3_600) / 60
  let seconds = totalSeconds % 60
  if hours > 0 {
    return "\(sign)\(hours)h \(minutes)m"
  }
  return "\(sign)\(minutes)m \(seconds)s"
}
