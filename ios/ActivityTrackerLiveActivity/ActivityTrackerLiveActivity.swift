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
        .widgetURL(URL(string: "activitytracker://activity/\(context.attributes.activityId)"))
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

// Places the essential actions beside progress rather than allocating a separate Lock Screen row.
private struct ActivityProgressControls: View {
  let context: ActivityViewContext<ActivityLiveActivityAttributes>

  var body: some View {
    HStack(spacing: 8) {
      if context.state.status == .active {
        ActivityControlButton(
          label: "Pause activity",
          symbol: "pause.fill",
          intent: PauseActivityIntent(activityId: context.attributes.activityId),
        )
      } else {
        ActivityControlButton(
          label: "Resume activity",
          symbol: "play.fill",
          intent: ResumeActivityIntent(activityId: context.attributes.activityId),
        )
      }
      ActivityControlButton(
        label: "Complete activity",
        symbol: "stop.fill",
        intent: CompleteActivityIntent(activityId: context.attributes.activityId),
        tint: .red,
      )
    }
  }
}

// Keeps Lock Screen actions visually compact while retaining clear VoiceOver labels.
private struct ActivityControlButton<Intent: AppIntent>: View {
  let label: String
  let symbol: String
  let intent: Intent
  var tint: Color = .primary

  var body: some View {
    Button(intent: intent) {
      Image(systemName: symbol)
        .font(.caption.weight(.bold))
        .frame(width: 44, height: 44)
    }
    .buttonStyle(.plain)
    .tint(tint)
    .contentShape(Rectangle())
    .accessibilityLabel(label)
  }
}

private struct ActivityProgressView: View {
  let context: ActivityViewContext<ActivityLiveActivityAttributes>

  var body: some View {
    HStack(spacing: 10) {
      Group {
        if context.state.status == .active, let progressRange {
          ProgressView(timerInterval: progressRange, countsDown: false)
            .tint(Color(red: 0.07, green: 0.38, blue: 0.55))
        } else {
          ProgressView(value: pausedProgress)
            .tint(Color(red: 0.75, green: 0.48, blue: 0.08))
            .overlay(alignment: .trailing) {
              Text(formatElapsed(context.state.elapsedMilliseconds))
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
                .offset(y: -14)
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

private func formatElapsed(_ milliseconds: Int64) -> String {
  let totalSeconds = max(0, milliseconds / 1_000)
  let hours = totalSeconds / 3_600
  let minutes = (totalSeconds % 3_600) / 60
  let seconds = totalSeconds % 60
  if hours > 0 {
    return "\(hours)h \(minutes)m"
  }
  return "\(minutes)m \(seconds)s"
}
