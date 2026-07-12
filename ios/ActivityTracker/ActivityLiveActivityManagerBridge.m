// Overview: Registers the Swift ActivityKit manager methods with the React Native bridge.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ActivityLiveActivityManager, NSObject)

RCT_EXTERN_METHOD(startOrUpdate:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(end:(NSString *)activityId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getCurrentActivityId:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(consumeCommands:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(acknowledgeCommands:(NSArray *)commandIds
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
