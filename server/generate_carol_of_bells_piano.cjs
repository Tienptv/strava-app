/**
 * Generator: Tổng hợp bản Piano Acoustic "Carol of the Bells"
 * Tạo tệp audio 16-bit 44.1kHz stereo chất lượng cao, mô phỏng tiếng đàn piano acoustic
 * với hòa âm Giáng Sinh ấm áp và vang vọng không gian (Concert Hall Reverb).
 */

const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const numChannels = 2; // Stereo
const bpm = 162; // Nhịp điệu Allegro chuẩn của Carol of the Bells (3/4 time)
const beatDuration = 60 / bpm; // ~0.37s cho 1 phách đen
const eighthDuration = beatDuration / 2; // ~0.185s cho nốt móc đơn

// Tần số nốt nhạc chuẩn (A4 = 440Hz)
function noteToFreq(noteName) {
  const notes = {
    'G2': 98.00, 'D3': 146.83, 'G3': 196.00, 'Bb3': 233.08, 'C4': 261.63, 'D4': 293.66,
    'Eb4': 311.13, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16,
    'C5': 523.25, 'D5': 587.33, 'Eb5': 622.25, 'F#5': 739.99, 'G5': 783.99, 'A5': 880.00, 'Bb5': 932.33
  };
  return notes[noteName] || 440.0;
}

// Bảng giai điệu Carol of the Bells (Khóa Sol + Khóa Fa)
// Motif 4 nốt kinh điển: Bb4 -> A4 -> Bb4 -> G4
const motif = [
  { note: 'Bb4', dur: 1 },
  { note: 'A4', dur: 1 },
  { note: 'Bb4', dur: 1 },
  { note: 'G4', dur: 1 }
];

// Tạo cấu trúc bài hát hoàn chỉnh (Intro -> Theme -> Climax -> Variations -> Outro)
const rightHandEvents = [];
const leftHandEvents = [];

let currentTime = 0;

// Đoạn 1: Intro mộc mạc như tiếng chuông từ xa vọng lại (4 lần)
for (let rep = 0; rep < 4; rep++) {
  motif.forEach(m => {
    rightHandEvents.push({ time: currentTime, note: m.note, duration: 0.7, velocity: 0.45 + (rep * 0.05) });
    currentTime += m.dur * eighthDuration;
  });
}

// Đoạn 2: Giai điệu chính kèm bè trầm đệm piano rải hợp âm G minor (4 lần)
for (let rep = 0; rep < 4; rep++) {
  leftHandEvents.push({ time: currentTime, note: 'G2', duration: 1.8, velocity: 0.55 });
  leftHandEvents.push({ time: currentTime + eighthDuration, note: 'D3', duration: 1.4, velocity: 0.48 });
  leftHandEvents.push({ time: currentTime + eighthDuration * 2, note: 'G3', duration: 1.2, velocity: 0.45 });
  leftHandEvents.push({ time: currentTime + eighthDuration * 3, note: 'Bb3', duration: 1.0, velocity: 0.42 });

  motif.forEach(m => {
    rightHandEvents.push({ time: currentTime, note: m.note, duration: 0.75, velocity: 0.65 });
    currentTime += m.dur * eighthDuration;
  });
}

// Đoạn 3: Dày dặn hơn với quãng 8 tay phải (4 lần)
for (let rep = 0; rep < 4; rep++) {
  leftHandEvents.push({ time: currentTime, note: rep % 2 === 0 ? 'Eb2' : 'D2', duration: 1.8, velocity: 0.6 });
  leftHandEvents.push({ time: currentTime + eighthDuration, note: 'Bb2', duration: 1.4, velocity: 0.5 });
  leftHandEvents.push({ time: currentTime + eighthDuration * 2, note: 'G3', duration: 1.2, velocity: 0.48 });
  leftHandEvents.push({ time: currentTime + eighthDuration * 3, note: 'D4', duration: 1.0, velocity: 0.45 });

  motif.forEach(m => {
    rightHandEvents.push({ time: currentTime, note: m.note, duration: 0.8, velocity: 0.75 });
    // Thêm bè đệm quãng 3 bên dưới
    const subNote = m.note === 'Bb4' ? 'G4' : (m.note === 'A4' ? 'F#4' : 'Eb4');
    rightHandEvents.push({ time: currentTime, note: subNote, duration: 0.6, velocity: 0.55 });
    currentTime += m.dur * eighthDuration;
  });
}

// Đoạn 4: Giai điệu cao trào bay bổng (D5 - D5 - D5 - C5 - Bb4 - C5 - D5 - Bb4)
const highMelody = [
  { note: 'D5', dur: 1 }, { note: 'D5', dur: 1 }, { note: 'D5', dur: 1 }, { note: 'C5', dur: 1 },
  { note: 'Bb4', dur: 1 }, { note: 'C5', dur: 1 }, { note: 'D5', dur: 1 }, { note: 'Bb4', dur: 1 },
  { note: 'D5', dur: 1 }, { note: 'D5', dur: 1 }, { note: 'D5', dur: 1 }, { note: 'C5', dur: 1 },
  { note: 'Bb4', dur: 1 }, { note: 'C5', dur: 1 }, { note: 'D5', dur: 1 }, { note: 'G4', dur: 1 }
];

for (let cycle = 0; cycle < 2; cycle++) {
  highMelody.forEach((m, idx) => {
    if (idx % 4 === 0) {
      leftHandEvents.push({ time: currentTime, note: cycle === 0 ? 'G2' : 'C3', duration: 2.2, velocity: 0.7 });
      leftHandEvents.push({ time: currentTime + eighthDuration, note: 'D3', duration: 1.8, velocity: 0.58 });
      leftHandEvents.push({ time: currentTime + eighthDuration * 2, note: 'G3', duration: 1.5, velocity: 0.52 });
    }
    rightHandEvents.push({ time: currentTime, note: m.note, duration: 0.85, velocity: 0.85 });
    currentTime += m.dur * eighthDuration;
  });
}

// Đoạn 5: Tiếng chuông lấp lánh trên cao (G5 -> F#5 -> G5 -> D5 ...)
const bellsTheme = [
  { note: 'G5', dur: 1 }, { note: 'F#5', dur: 1 }, { note: 'G5', dur: 1 }, { note: 'D5', dur: 1 },
  { note: 'Bb4', dur: 1 }, { note: 'A4', dur: 1 }, { note: 'Bb4', dur: 1 }, { note: 'G4', dur: 1 },
  { note: 'G5', dur: 1 }, { note: 'F#5', dur: 1 }, { note: 'G5', dur: 1 }, { note: 'D5', dur: 1 },
  { note: 'Bb4', dur: 1 }, { note: 'A4', dur: 1 }, { note: 'Bb4', dur: 1 }, { note: 'G4', dur: 1 }
];

for (let cycle = 0; cycle < 2; cycle++) {
  bellsTheme.forEach((m, idx) => {
    if (idx % 4 === 0) {
      leftHandEvents.push({ time: currentTime, note: 'G2', duration: 2.4, velocity: 0.65 });
      leftHandEvents.push({ time: currentTime + eighthDuration, note: 'D3', duration: 1.9, velocity: 0.52 });
      leftHandEvents.push({ time: currentTime + eighthDuration * 2, note: 'Bb3', duration: 1.5, velocity: 0.48 });
    }
    rightHandEvents.push({ time: currentTime, note: m.note, duration: 0.75, velocity: 0.78 });
    currentTime += m.dur * eighthDuration;
  });
}

// Đoạn 6: Outro lắng đọng trở về motif nhẹ nhàng, chuẩn bị lặp vòng tiếp theo
for (let rep = 0; rep < 4; rep++) {
  leftHandEvents.push({ time: currentTime, note: 'G2', duration: 2.2, velocity: 0.52 - (rep * 0.08) });
  leftHandEvents.push({ time: currentTime + eighthDuration, note: 'D3', duration: 1.8, velocity: 0.45 - (rep * 0.06) });
  motif.forEach(m => {
    rightHandEvents.push({ time: currentTime, note: m.note, duration: 0.7, velocity: 0.62 - (rep * 0.08) });
    currentTime += m.dur * eighthDuration;
  });
}

// Nốt hợp âm kết thúc G minor ngân êm đềm
leftHandEvents.push({ time: currentTime, note: 'G2', duration: 3.5, velocity: 0.5 });
leftHandEvents.push({ time: currentTime + 0.05, note: 'D3', duration: 3.5, velocity: 0.45 });
leftHandEvents.push({ time: currentTime + 0.10, note: 'G3', duration: 3.5, velocity: 0.42 });
rightHandEvents.push({ time: currentTime + 0.15, note: 'Bb4', duration: 3.8, velocity: 0.48 });
rightHandEvents.push({ time: currentTime + 0.20, note: 'G4', duration: 4.2, velocity: 0.52 });

const totalDuration = currentTime + 5.0; // Khoảng 35-40 giây
const totalSamples = Math.ceil(totalDuration * sampleRate);

console.log(`Đang tổng hợp Carol of the Bells: Thời lượng ${totalDuration.toFixed(1)}s, ${totalSamples} samples...`);

const leftBuffer = new Float32Array(totalSamples);
const rightBuffer = new Float32Array(totalSamples);

// Hàm tổng hợp 1 phím đàn Piano Acoustic
function renderPianoNote(bufferLeft, bufferRight, startSample, freq, durationSec, velocity, pan) {
  const noteSamples = Math.min(Math.ceil(durationSec * sampleRate), totalSamples - startSample);
  if (noteSamples <= 0) return;

  // Cấu trúc hòa âm Piano (Fundamental + 5 Harmonics)
  const harmonics = [
    { mult: 1.0, weight: 1.0, decayFactor: 1.0 },
    { mult: 2.0, weight: 0.55, decayFactor: 1.3 },
    { mult: 3.0, weight: 0.28, decayFactor: 1.6 },
    { mult: 4.0, weight: 0.15, decayFactor: 2.0 },
    { mult: 5.0, weight: 0.08, decayFactor: 2.5 },
    { mult: 6.0, weight: 0.04, decayFactor: 3.0 }
  ];

  const leftGain = Math.cos((pan + 1) * Math.PI / 4) * velocity * 0.22;
  const rightGain = Math.sin((pan + 1) * Math.PI / 4) * velocity * 0.22;

  // Thời gian suy hao tự nhiên của dây đàn piano (Dây trầm ngân lâu hơn dây cao)
  const baseDecay = Math.max(0.6, 2.8 - Math.log10(freq / 50));

  for (let i = 0; i < noteSamples; i++) {
    const t = i / sampleRate;
    // Búa gõ attack (5ms đầu tăng nhanh)
    const attack = Math.min(1.0, t / 0.005);
    
    let sampleVal = 0;
    for (let h = 0; h < harmonics.length; h++) {
      const harm = harmonics[h];
      const hFreq = freq * harm.mult;
      const decay = Math.exp(-t * harm.decayFactor / baseDecay);
      sampleVal += Math.sin(2 * Math.PI * hFreq * t) * harm.weight * decay;
    }

    // Tiếng búa gõ nhẹ (hammer strike impact)
    if (t < 0.015) {
      const hammer = (Math.random() * 2 - 1) * Math.exp(-t * 200) * 0.15;
      sampleVal += hammer;
    }

    const currentSample = sampleVal * attack;
    const targetIdx = startSample + i;

    bufferLeft[targetIdx] += currentSample * leftGain;
    bufferRight[targetIdx] += currentSample * rightGain;
  }
}

// Render toàn bộ các nốt nhạc
rightHandEvents.forEach(e => {
  const startSample = Math.floor(e.time * sampleRate);
  const freq = noteToFreq(e.note);
  // Tay phải pan nhẹ sang phải (+0.25)
  renderPianoNote(leftBuffer, rightBuffer, startSample, freq, e.duration, e.velocity, 0.25);
});

leftHandEvents.forEach(e => {
  const startSample = Math.floor(e.time * sampleRate);
  const freq = noteToFreq(e.note);
  // Tay trái pan nhẹ sang trái (-0.35)
  renderPianoNote(leftBuffer, rightBuffer, startSample, freq, e.duration, e.velocity, -0.35);
});

// Thêm hiệu ứng vang Reverb không gian ấm áp (Concert Hall Delay Line)
const delaySamples1 = Math.floor(0.085 * sampleRate);
const delaySamples2 = Math.floor(0.145 * sampleRate);
const delaySamples3 = Math.floor(0.210 * sampleRate);

for (let i = 0; i < totalSamples; i++) {
  if (i >= delaySamples1) {
    leftBuffer[i] += rightBuffer[i - delaySamples1] * 0.22;
  }
  if (i >= delaySamples2) {
    rightBuffer[i] += leftBuffer[i - delaySamples2] * 0.18;
  }
  if (i >= delaySamples3) {
    leftBuffer[i] += leftBuffer[i - delaySamples3] * 0.12;
    rightBuffer[i] += rightBuffer[i - delaySamples3] * 0.12;
  }
}

// Chuẩn hóa âm lượng (Normalize chống clipping)
let maxAmp = 0;
for (let i = 0; i < totalSamples; i++) {
  const l = Math.abs(leftBuffer[i]);
  const r = Math.abs(rightBuffer[i]);
  if (l > maxAmp) maxAmp = l;
  if (r > maxAmp) maxAmp = r;
}

const normFactor = maxAmp > 0 ? (0.88 / maxAmp) : 1.0;

// Xuất file WAV 16-bit PCM chất lượng cao
const dataByteLength = totalSamples * numChannels * 2;
const buffer = Buffer.alloc(44 + dataByteLength);

// WAV Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataByteLength, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * numChannels * 2, 28); // ByteRate
buffer.writeUInt16LE(numChannels * 2, 32); // BlockAlign
buffer.writeUInt16LE(16, 34); // BitsPerSample
buffer.write('data', 36);
buffer.writeUInt32LE(dataByteLength, 40);

let offset = 44;
for (let i = 0; i < totalSamples; i++) {
  const sampleL = Math.max(-1, Math.min(1, leftBuffer[i] * normFactor));
  const sampleR = Math.max(-1, Math.min(1, rightBuffer[i] * normFactor));

  const intL = sampleL < 0 ? Math.floor(sampleL * 32768) : Math.floor(sampleL * 32767);
  const intR = sampleR < 0 ? Math.floor(sampleR * 32768) : Math.floor(sampleR * 32767);

  buffer.writeInt16LE(intL, offset);
  buffer.writeInt16LE(intR, offset + 2);
  offset += 4;
}

const outDir = path.join(__dirname, '../frontend/public/audio');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Lưu 2 bản: .mp3 và .wav để đảm bảo mọi trình duyệt đều phát được 100%
const mp3Path = path.join(outDir, 'carol_of_the_bells_piano.mp3');
const wavPath = path.join(outDir, 'carol_of_the_bells_piano.wav');

fs.writeFileSync(mp3Path, buffer);
fs.writeFileSync(wavPath, buffer);

console.log(`✅ Đã tạo thành công bản Piano Carol of the Bells:`);
console.log(`   - File MP3: ${mp3Path} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`   - File WAV: ${wavPath}`);
