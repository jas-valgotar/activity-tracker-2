// Overview: Implements a small iOS Speech framework bridge for one-shot activity dictation.

import AVFoundation
import Foundation
import React
import Speech

@objc(ActivitySpeechRecognizer)
class ActivitySpeechRecognizer: NSObject {
  private let audioEngine = AVAudioEngine()
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en_US"))
  private var resolve: RCTPromiseResolveBlock?
  private var reject: RCTPromiseRejectBlock?
  private var bestTranscript = ""
  private var silenceTimer: Timer?
  private var hardTimeoutTimer: Timer?

  // Allows React Native to initialize this module off the main queue.
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // Starts one dictation session and resolves with recognized text.
  @objc(recognizeOnce:rejecter:)
  func recognizeOnce(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if self.recognitionTask != nil {
        reject("speech_busy", "Speech recognition is already running.", nil)
        return
      }

      self.resolve = resolve
      self.reject = reject
      self.bestTranscript = ""
      self.requestPermissions()
    }
  }

  // Requests speech and microphone permissions before starting audio capture.
  private func requestPermissions() {
    SFSpeechRecognizer.requestAuthorization { speechStatus in
      DispatchQueue.main.async {
        guard speechStatus == .authorized else {
          self.rejectAndCleanup(code: "speech_permission", message: "Speech recognition permission was not granted.")
          return
        }

        self.requestMicrophonePermission()
      }
    }
  }

  // Requests microphone permission with the API available on the current iOS version.
  private func requestMicrophonePermission() {
    let permissionHandler: (Bool) -> Void = { granted in
      DispatchQueue.main.async {
        guard granted else {
          self.rejectAndCleanup(code: "microphone_permission", message: "Microphone permission was not granted.")
          return
        }

        self.startRecognition()
      }
    }

    if #available(iOS 17.0, *) {
      AVAudioApplication.requestRecordPermission(completionHandler: permissionHandler)
    } else {
      AVAudioSession.sharedInstance().requestRecordPermission(permissionHandler)
    }
  }

  // Configures the audio session, installs the microphone tap, and starts Speech recognition.
  private func startRecognition() {
    guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
      rejectAndCleanup(code: "speech_unavailable", message: "Speech recognition is not available on this device.")
      return
    }

    do {
      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

      let request = SFSpeechAudioBufferRecognitionRequest()
      request.shouldReportPartialResults = true
      recognitionRequest = request

      let inputNode = audioEngine.inputNode
      let recordingFormat = inputNode.outputFormat(forBus: 0)
      inputNode.removeTap(onBus: 0)
      inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
        request.append(buffer)
      }

      audioEngine.prepare()
      try audioEngine.start()

      recognitionTask = speechRecognizer.recognitionTask(with: request) { result, error in
        DispatchQueue.main.async {
          self.handleRecognition(result: result, error: error)
        }
      }

      scheduleHardTimeout()
    } catch {
      rejectAndCleanup(code: "speech_start_failed", message: error.localizedDescription)
    }
  }

  // Handles partial and final recognition callbacks from the Speech framework.
  private func handleRecognition(result: SFSpeechRecognitionResult?, error: Error?) {
    if let error = error {
      rejectAndCleanup(code: "speech_failed", message: error.localizedDescription)
      return
    }

    if let result = result {
      bestTranscript = result.bestTranscription.formattedString
      resetSilenceTimer()

      if result.isFinal {
        resolveAndCleanup()
      }
    }
  }

  // Schedules a short silence timeout after the latest partial transcript.
  private func resetSilenceTimer() {
    silenceTimer?.invalidate()
    silenceTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: false) { [weak self] _ in
      self?.resolveAndCleanup()
    }
  }

  // Schedules a hard timeout so dictation cannot run forever.
  private func scheduleHardTimeout() {
    hardTimeoutTimer?.invalidate()
    hardTimeoutTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: false) { [weak self] _ in
      self?.resolveAndCleanup()
    }
  }

  // Resolves the pending promise with the best transcript or an empty-speech error.
  private func resolveAndCleanup() {
    let transcript = bestTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !transcript.isEmpty else {
      rejectAndCleanup(code: "speech_empty", message: "No speech was recognized.")
      return
    }

    resolve?(transcript)
    cleanup()
  }

  // Rejects the pending promise with a stable code and releases audio resources.
  private func rejectAndCleanup(code: String, message: String) {
    reject?(code, message, nil)
    cleanup()
  }

  // Stops recognition, removes timers, and returns the audio session to normal.
  private func cleanup() {
    silenceTimer?.invalidate()
    hardTimeoutTimer?.invalidate()
    silenceTimer = nil
    hardTimeoutTimer = nil

    if audioEngine.isRunning {
      audioEngine.stop()
    }

    audioEngine.inputNode.removeTap(onBus: 0)
    recognitionRequest?.endAudio()
    recognitionTask?.cancel()
    recognitionRequest = nil
    recognitionTask = nil
    resolve = nil
    reject = nil

    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}
