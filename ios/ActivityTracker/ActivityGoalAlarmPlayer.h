// Overview: Declares the reusable native player that owns goal-alarm audio, vibration, and stopping.

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ActivityGoalAlarmPlayer : NSObject

+ (instancetype)sharedPlayer;
- (void)startAlarmForActivityId:(NSString *)activityId
                durationSeconds:(NSTimeInterval)durationSeconds
       vibrationIntervalSeconds:(NSTimeInterval)vibrationIntervalSeconds;
- (void)stopAlarmForActivityId:(NSString *)activityId;
- (void)stopAnyAlarm;

@end

NS_ASSUME_NONNULL_END
