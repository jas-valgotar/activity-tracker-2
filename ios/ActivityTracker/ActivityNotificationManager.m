// Overview: Schedules activity notifications and coordinates foreground or lock-screen goal-alarm controls.

#import "ActivityGoalAlarmPlayer.h"
#import <React/RCTBridgeModule.h>
#import <UserNotifications/UserNotifications.h>

static NSString *const ActivityTargetNotificationType = @"activity-target-reached";
static NSString *const ActivityPauseReminderType = @"activity-pause-reminder";
static NSString *const ActivityPresetReminderType = @"activity-preset-reminder";
static NSString *const ActivityFocusNotificationCategory = @"activity-focus-notification";
static NSString *const ActivityTargetNotificationCategory = @"activity-target-notification";
static NSString *const ActivityStopGoalAlarmAction = @"activity-stop-goal-alarm";
static NSString *const ActivityGoalAlarmSound = @"goal-alarm.wav";
static NSString *const ActivityGoalAlarmDurationKey = @"alarmDurationSeconds";
static NSString *const ActivityGoalAlarmVibrationIntervalKey = @"vibrationIntervalSeconds";

@interface ActivityNotificationManager : NSObject <RCTBridgeModule, UNUserNotificationCenterDelegate>
@end

@implementation ActivityNotificationManager

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self;
    UNNotificationAction *openFocusAction = [UNNotificationAction actionWithIdentifier:@"activity-open-focus"
                                                                                     title:@"Open Focus"
                                                                                   options:UNNotificationActionOptionForeground];
    UNNotificationAction *stopAlarmAction = [UNNotificationAction actionWithIdentifier:ActivityStopGoalAlarmAction
                                                                                  title:@"Stop alarm"
                                                                                options:UNNotificationActionOptionNone];
    UNNotificationCategory *targetCategory = [UNNotificationCategory categoryWithIdentifier:ActivityTargetNotificationCategory
                                                                                       actions:@[stopAlarmAction, openFocusAction]
                                                                             intentIdentifiers:@[]
                                                                                       options:0];
    UNNotificationCategory *focusCategory = [UNNotificationCategory categoryWithIdentifier:ActivityFocusNotificationCategory
                                                                                      actions:@[openFocusAction]
                                                                            intentIdentifiers:@[]
                                                                                      options:0];
    [center setNotificationCategories:[NSSet setWithObjects:targetCategory, focusCategory, nil]];
  }
  return self;
}

// Requests alert and sound permission only when the user starts a timed activity.
RCT_REMAP_METHOD(requestPermission,
                 requestPermissionWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  UNAuthorizationOptions options = UNAuthorizationOptionAlert | UNAuthorizationOptionSound;
  [[UNUserNotificationCenter currentNotificationCenter] requestAuthorizationWithOptions:options
                                                                       completionHandler:^(BOOL granted, NSError *_Nullable error) {
    if (error) {
      reject(@"activity_notifications_permission", @"Notification permission could not be requested.", error);
      return;
    }
    resolve(@(granted));
  }];
}

// Schedules a one-shot target notification using active-time seconds calculated by JavaScript.
RCT_REMAP_METHOD(scheduleTargetNotification,
                 scheduleTargetNotification:(NSString *)activityId
                 title:(NSString *)title
                 delaySeconds:(nonnull NSNumber *)delaySeconds
                 alarmDurationSeconds:(nonnull NSNumber *)alarmDurationSeconds
                 vibrationIntervalSeconds:(nonnull NSNumber *)vibrationIntervalSeconds
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  UNMutableNotificationContent *content = [UNMutableNotificationContent new];
  content.title = @"Focus target reached";
  content.body = title;
  content.categoryIdentifier = ActivityTargetNotificationCategory;
  content.sound = [UNNotificationSound soundNamed:ActivityGoalAlarmSound];
  content.userInfo = @{
    @"activityId": activityId,
    @"type": ActivityTargetNotificationType,
    ActivityGoalAlarmDurationKey: alarmDurationSeconds,
    ActivityGoalAlarmVibrationIntervalKey: vibrationIntervalSeconds,
  };

  NSTimeInterval delay = MAX(1.0, delaySeconds.doubleValue);
  UNTimeIntervalNotificationTrigger *trigger = [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:delay repeats:NO];
  NSString *identifier = [NSString stringWithFormat:@"activity-target-%@", activityId];
  UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:identifier content:content trigger:trigger];

  [[UNUserNotificationCenter currentNotificationCenter] addNotificationRequest:request
                                                           withCompletionHandler:^(NSError *_Nullable error) {
    if (error) {
      reject(@"activity_notifications_schedule", @"Target notification could not be scheduled.", error);
      return;
    }
    resolve(nil);
  }];
}

// Schedules one gentle reminder after an activity is paused.
RCT_REMAP_METHOD(schedulePauseReminder,
                 schedulePauseReminder:(NSString *)activityId
                 title:(NSString *)title
                 delaySeconds:(nonnull NSNumber *)delaySeconds
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  UNMutableNotificationContent *content = [UNMutableNotificationContent new];
  content.title = @"Keep your momentum";
  content.body = title;
  content.categoryIdentifier = ActivityFocusNotificationCategory;
  content.sound = [UNNotificationSound defaultSound];
  content.userInfo = @{
    @"activityId": activityId,
    @"type": ActivityPauseReminderType,
  };

  NSTimeInterval delay = MAX(1.0, delaySeconds.doubleValue);
  UNTimeIntervalNotificationTrigger *trigger = [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:delay repeats:NO];
  NSString *identifier = [NSString stringWithFormat:@"activity-pause-reminder-%@", activityId];
  UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:identifier content:content trigger:trigger];

  [[UNUserNotificationCenter currentNotificationCenter] addNotificationRequest:request
                                                           withCompletionHandler:^(NSError *_Nullable error) {
    if (error) {
      reject(@"activity_notifications_pause_reminder", @"Pause reminder could not be scheduled.", error);
      return;
    }
    resolve(nil);
  }];
}

// Schedules a repeating daily reminder for a Daily preset at the user's local time.
RCT_REMAP_METHOD(schedulePresetReminder,
                 schedulePresetReminder:(NSString *)presetId
                 title:(NSString *)title
                 reminderTimeMinutes:(nonnull NSNumber *)reminderTimeMinutes
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSInteger totalMinutes = reminderTimeMinutes.integerValue;
  NSInteger hour = totalMinutes / 60;
  NSInteger minute = totalMinutes % 60;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    reject(@"activity_notifications_preset_time", @"Preset reminder time is invalid.", nil);
    return;
  }

  UNMutableNotificationContent *content = [UNMutableNotificationContent new];
  content.title = @"Your daily focus is waiting";
  content.body = title;
  content.categoryIdentifier = ActivityFocusNotificationCategory;
  content.sound = [UNNotificationSound defaultSound];
  content.userInfo = @{
    @"presetId": presetId,
    @"type": ActivityPresetReminderType,
  };

  NSDateComponents *components = [NSDateComponents new];
  components.hour = hour;
  components.minute = minute;
  UNCalendarNotificationTrigger *trigger = [UNCalendarNotificationTrigger triggerWithDateMatchingComponents:components repeats:YES];
  NSString *identifier = [NSString stringWithFormat:@"activity-preset-reminder-%@", presetId];
  UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:identifier content:content trigger:trigger];

  [[UNUserNotificationCenter currentNotificationCenter] addNotificationRequest:request
                                                           withCompletionHandler:^(NSError *_Nullable error) {
    if (error) {
      reject(@"activity_notifications_preset", @"Daily preset reminder could not be scheduled.", error);
      return;
    }
    resolve(nil);
  }];
}

// Cancels the pending target notification for an activity.
RCT_EXPORT_METHOD(cancelTargetNotification:(NSString *)activityId)
{
  NSString *identifier = [NSString stringWithFormat:@"activity-target-%@", activityId];
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  [center removePendingNotificationRequestsWithIdentifiers:@[identifier]];
  [center removeDeliveredNotificationsWithIdentifiers:@[identifier]];
  [[ActivityGoalAlarmPlayer sharedPlayer] stopAlarmForActivityId:activityId];
}

// Starts the app-controlled foreground alarm; duplicate requests for the same activity are ignored.
RCT_EXPORT_METHOD(startGoalAlert:(NSString *)activityId
                  alarmDurationSeconds:(nonnull NSNumber *)alarmDurationSeconds
                  vibrationIntervalSeconds:(nonnull NSNumber *)vibrationIntervalSeconds)
{
  [[ActivityGoalAlarmPlayer sharedPlayer] startAlarmForActivityId:activityId
                                                  durationSeconds:alarmDurationSeconds.doubleValue
                                         vibrationIntervalSeconds:vibrationIntervalSeconds.doubleValue];
}

// Stops current sound and vibration and clears the matching delivered notification.
RCT_EXPORT_METHOD(stopGoalAlert:(NSString *)activityId)
{
  NSString *identifier = [NSString stringWithFormat:@"activity-target-%@", activityId];
  [[UNUserNotificationCenter currentNotificationCenter] removeDeliveredNotificationsWithIdentifiers:@[identifier]];
  [[ActivityGoalAlarmPlayer sharedPlayer] stopAlarmForActivityId:activityId];
}

// Cancels the pending reminder for an activity.
RCT_EXPORT_METHOD(cancelPauseReminder:(NSString *)activityId)
{
  NSString *identifier = [NSString stringWithFormat:@"activity-pause-reminder-%@", activityId];
  [[UNUserNotificationCenter currentNotificationCenter] removePendingNotificationRequestsWithIdentifiers:@[identifier]];
}

// Cancels the repeating reminder for a Daily preset.
RCT_EXPORT_METHOD(cancelPresetReminder:(NSString *)presetId)
{
  NSString *identifier = [NSString stringWithFormat:@"activity-preset-reminder-%@", presetId];
  [[UNUserNotificationCenter currentNotificationCenter] removePendingNotificationRequestsWithIdentifiers:@[identifier]];
}

// Starts app-controlled playback in the foreground and suppresses duplicate system-controlled sound.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
  NSString *notificationType = notification.request.content.userInfo[@"type"];
  if ([notificationType isEqual:ActivityTargetNotificationType]) {
    NSString *activityId = notification.request.content.userInfo[@"activityId"];
    if (activityId) {
      NSNumber *durationSeconds = notification.request.content.userInfo[ActivityGoalAlarmDurationKey];
      NSNumber *vibrationIntervalSeconds = notification.request.content.userInfo[ActivityGoalAlarmVibrationIntervalKey];
      [[ActivityGoalAlarmPlayer sharedPlayer] startAlarmForActivityId:activityId
                                                      durationSeconds:durationSeconds.doubleValue
                                             vibrationIntervalSeconds:vibrationIntervalSeconds.doubleValue];
    }
    completionHandler(UNNotificationPresentationOptionBanner | UNNotificationPresentationOptionBadge);
    return;
  }
  completionHandler(UNNotificationPresentationOptionBanner | UNNotificationPresentationOptionSound |
                    UNNotificationPresentationOptionBadge);
}

// Keeps the notification available through the normal iOS notification tap flow.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
 didReceiveNotificationResponse:(UNNotificationResponse *)response
          withCompletionHandler:(void (^)(void))completionHandler
{
  NSString *notificationType = response.notification.request.content.userInfo[@"type"];
  if ([response.actionIdentifier isEqual:ActivityStopGoalAlarmAction] &&
      [notificationType isEqual:ActivityTargetNotificationType]) {
    NSString *activityId = response.notification.request.content.userInfo[@"activityId"];
    if (activityId) {
      NSString *identifier = [NSString stringWithFormat:@"activity-target-%@", activityId];
      UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
      [center removePendingNotificationRequestsWithIdentifiers:@[identifier]];
      [center removeDeliveredNotificationsWithIdentifiers:@[identifier]];
      [[ActivityGoalAlarmPlayer sharedPlayer] stopAlarmForActivityId:activityId];
    }
  }
  completionHandler();
}

@end
