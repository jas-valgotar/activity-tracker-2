// Overview: Provides local target notifications, foreground presentation, and native iPhone vibration.

#import <AudioToolbox/AudioToolbox.h>
#import <React/RCTBridgeModule.h>
#import <UserNotifications/UserNotifications.h>

static NSString *const ActivityTargetNotificationType = @"activity-target-reached";
static NSString *const ActivityPauseReminderType = @"activity-pause-reminder";
static NSString *const ActivityFocusNotificationCategory = @"activity-focus-notification";

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
    UNNotificationCategory *category = [UNNotificationCategory categoryWithIdentifier:ActivityFocusNotificationCategory
                                                                                  actions:@[openFocusAction]
                                                                        intentIdentifiers:@[]
                                                                                  options:0];
    [center setNotificationCategories:[NSSet setWithObject:category]];
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
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  UNMutableNotificationContent *content = [UNMutableNotificationContent new];
  content.title = @"Focus target reached";
  content.body = title;
  content.categoryIdentifier = ActivityFocusNotificationCategory;
  content.sound = [UNNotificationSound defaultSound];
  content.userInfo = @{
    @"activityId": activityId,
    @"type": ActivityTargetNotificationType,
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

// Cancels the pending target notification for an activity.
RCT_EXPORT_METHOD(cancelTargetNotification:(NSString *)activityId)
{
  NSString *identifier = [NSString stringWithFormat:@"activity-target-%@", activityId];
  [[UNUserNotificationCenter currentNotificationCenter] removePendingNotificationRequestsWithIdentifiers:@[identifier]];
}

// Cancels the pending reminder for an activity.
RCT_EXPORT_METHOD(cancelPauseReminder:(NSString *)activityId)
{
  NSString *identifier = [NSString stringWithFormat:@"activity-pause-reminder-%@", activityId];
  [[UNUserNotificationCenter currentNotificationCenter] removePendingNotificationRequestsWithIdentifiers:@[identifier]];
}

// Presents target notifications while the app is open and provides direct haptic feedback.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
  if ([notification.request.content.userInfo[@"type"] isEqual:ActivityTargetNotificationType]) {
    AudioServicesPlaySystemSound(kSystemSoundID_Vibrate);
  }
  completionHandler(UNNotificationPresentationOptionBanner | UNNotificationPresentationOptionSound |
                    UNNotificationPresentationOptionBadge);
}

// Keeps the notification available through the normal iOS notification tap flow.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
 didReceiveNotificationResponse:(UNNotificationResponse *)response
          withCompletionHandler:(void (^)(void))completionHandler
{
  completionHandler();
}

@end
