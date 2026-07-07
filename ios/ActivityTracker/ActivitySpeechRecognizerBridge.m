// Overview: Exposes the Swift ActivitySpeechRecognizer class to React Native's bridge.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ActivitySpeechRecognizer, NSObject)

RCT_EXTERN_METHOD(recognizeOnce:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
