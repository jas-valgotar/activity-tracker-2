// Overview: Reproducibly generates the bundled ten-second PCM goal-alarm sound without external tools.

const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

const sampleRate = 44_100;
const durationSeconds = 10;
const channelCount = 1;
const bitsPerSample = 16;
const sampleCount = sampleRate * durationSeconds;
const bytesPerSample = bitsPerSample / 8;
const dataSize = sampleCount * channelCount * bytesPerSample;
const outputPath = path.join(__dirname, '..', 'ios', 'ActivityTracker', 'goal-alarm.wav');
const output = Buffer.alloc(44 + dataSize);

// Writes the canonical PCM WAV header accepted by both AVAudioPlayer and UNNotificationSound.
output.write('RIFF', 0);
output.writeUInt32LE(36 + dataSize, 4);
output.write('WAVE', 8);
output.write('fmt ', 12);
output.writeUInt32LE(16, 16);
output.writeUInt16LE(1, 20);
output.writeUInt16LE(channelCount, 22);
output.writeUInt32LE(sampleRate, 24);
output.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
output.writeUInt16LE(channelCount * bytesPerSample, 32);
output.writeUInt16LE(bitsPerSample, 34);
output.write('data', 36);
output.writeUInt32LE(dataSize, 40);

// Alternates two urgent tones with short gaps and gentle edges to avoid clicks.
for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
  const time = sampleIndex / sampleRate;
  const pulseTime = time % 0.5;
  const toneIsActive = pulseTime < 0.36;
  const frequency = Math.floor(time / 0.5) % 2 === 0 ? 880 : 1_100;
  const edgeSeconds = 0.015;
  const attack = Math.min(1, pulseTime / edgeSeconds);
  const release = Math.min(1, Math.max(0, (0.36 - pulseTime) / edgeSeconds));
  const envelope = toneIsActive ? Math.min(attack, release) : 0;
  const sample = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.82;
  output.writeInt16LE(Math.round(sample * 32_767), 44 + sampleIndex * bytesPerSample);
}

fs.writeFileSync(outputPath, output);
