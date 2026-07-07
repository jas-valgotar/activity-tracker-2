// Overview: Wraps platform speech recognition behind a small reusable app service.

import { NativeModules, Platform } from 'react-native';

type NativeSpeechModule = {
  recognizeOnce(): Promise<string>;
};

const nativeSpeechRecognizer = NativeModules.ActivitySpeechRecognizer as NativeSpeechModule | undefined;

export type SpeechRecognitionService = {
  recognizeOnce(): Promise<string>;
};

// Creates the speech recognition service used by the microphone input button.
export function createSpeechRecognitionService(): SpeechRecognitionService {
  return {
    // Runs one native dictation session and returns recognized text.
    async recognizeOnce() {
      if (Platform.OS !== 'ios') {
        throw new Error('Native speech recognition is only wired for iOS in this harness.');
      }

      if (!nativeSpeechRecognizer?.recognizeOnce) {
        throw new Error('The iOS speech recognition module is not available.');
      }

      return nativeSpeechRecognizer.recognizeOnce();
    },
  };
}
