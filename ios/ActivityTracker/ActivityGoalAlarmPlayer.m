// Overview: Plays one idempotent ten-second goal alarm with repeated iPhone vibration pulses.

#import "ActivityGoalAlarmPlayer.h"

#import <AVFAudio/AVFAudio.h>
#import <AudioToolbox/AudioToolbox.h>

static NSString *const ActivityGoalAlarmSoundName = @"goal-alarm";
static NSString *const ActivityGoalAlarmSoundExtension = @"wav";

@interface ActivityGoalAlarmPlayer ()

@property(nonatomic, strong, nullable) AVAudioPlayer *audioPlayer;
@property(nonatomic, copy, nullable) NSString *activityId;
@property(nonatomic, strong, nullable) NSTimer *stopTimer;
@property(nonatomic, strong, nullable) NSTimer *vibrationTimer;

@end


@implementation ActivityGoalAlarmPlayer

+ (instancetype)sharedPlayer
{
  static ActivityGoalAlarmPlayer *player;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    player = [ActivityGoalAlarmPlayer new];
  });
  return player;
}

// Starts once for an activity and leaves silent-mode, Focus, and output routing under system control.
- (void)startAlarmForActivityId:(NSString *)activityId
                durationSeconds:(NSTimeInterval)durationSeconds
       vibrationIntervalSeconds:(NSTimeInterval)vibrationIntervalSeconds
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if ([self.activityId isEqualToString:activityId] && self.audioPlayer.isPlaying) {
      return;
    }

    [self stopAnyAlarmOnMainQueue];
    NSURL *soundURL = [[NSBundle mainBundle] URLForResource:ActivityGoalAlarmSoundName
                                             withExtension:ActivityGoalAlarmSoundExtension];
    if (!soundURL) {
      NSLog(@"Activity goal alarm sound is missing from the app bundle.");
      return;
    }

    NSError *sessionError;
    [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryAmbient
                                           mode:AVAudioSessionModeDefault
                                        options:AVAudioSessionCategoryOptionMixWithOthers
                                          error:&sessionError];
    if (sessionError) {
      NSLog(@"Could not configure the activity goal alarm audio session: %@", sessionError);
    }

    NSError *playerError;
    AVAudioPlayer *player = [[AVAudioPlayer alloc] initWithContentsOfURL:soundURL error:&playerError];
    if (!player || playerError) {
      NSLog(@"Could not load the activity goal alarm: %@", playerError);
      return;
    }

    self.activityId = activityId;
    self.audioPlayer = player;
    self.audioPlayer.volume = 1.0;
    [self.audioPlayer prepareToPlay];
    [self.audioPlayer play];
    [self vibrate];
    NSTimeInterval resolvedDurationSeconds = durationSeconds > 0 ? durationSeconds : self.audioPlayer.duration;
    NSTimeInterval resolvedVibrationIntervalSeconds = vibrationIntervalSeconds > 0 ? vibrationIntervalSeconds : 1.0;
    self.vibrationTimer = [NSTimer scheduledTimerWithTimeInterval:MAX(0.2, resolvedVibrationIntervalSeconds)
                                                           target:self
                                                         selector:@selector(vibrate)
                                                         userInfo:nil
                                                          repeats:YES];
    self.stopTimer = [NSTimer scheduledTimerWithTimeInterval:MAX(0.1, resolvedDurationSeconds)
                                                       target:self
                                                     selector:@selector(stopAnyAlarm)
                                                     userInfo:nil
                                                      repeats:NO];
  });
}

// Stops only the matching activity so stale lifecycle work cannot silence a newer alarm.
- (void)stopAlarmForActivityId:(NSString *)activityId
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if ([self.activityId isEqualToString:activityId]) {
      [self stopAnyAlarmOnMainQueue];
    }
  });
}

// Stops whichever alarm is active, including timers that would otherwise continue vibrating.
- (void)stopAnyAlarm
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self stopAnyAlarmOnMainQueue];
  });
}

- (void)stopAnyAlarmOnMainQueue
{
  [self.stopTimer invalidate];
  [self.vibrationTimer invalidate];
  self.stopTimer = nil;
  self.vibrationTimer = nil;
  [self.audioPlayer stop];
  self.audioPlayer = nil;
  self.activityId = nil;
}

- (void)vibrate
{
  AudioServicesPlaySystemSound(kSystemSoundID_Vibrate);
}

@end
