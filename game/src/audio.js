// Warung Kilat — all sounds are synthesized with WebAudio: no audio files.
// Sizzle is filtered noise, pop/ding/buzz are short oscillator blips.
let audioCtx = null;
let sizzleNode = null;

export function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  } catch {
    audioCtx = null;
  }
}

function tone(freq, dur, type, vol, when = 0) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playPop() { ensureAudio(); tone(520, 0.09, 'triangle', 0.25); tone(780, 0.07, 'sine', 0.15, 0.03); }
export function playDing() { ensureAudio(); tone(880, 0.18, 'sine', 0.25); tone(1318, 0.3, 'sine', 0.2, 0.09); }
export function playBuzz() { ensureAudio(); tone(140, 0.22, 'sawtooth', 0.18); tone(110, 0.22, 'sawtooth', 0.15, 0.05); }
export function playDay() { ensureAudio(); tone(660, 0.12, 'triangle', 0.2); tone(880, 0.12, 'triangle', 0.2, 0.1); tone(1100, 0.2, 'triangle', 0.2, 0.2); }

export function startSizzle() {
  ensureAudio();
  if (!audioCtx || sizzleNode) return;
  const len = audioCtx.sampleRate * 1;
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3200;
  filter.Q.value = 0.6;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.05;
  src.connect(filter).connect(gain).connect(audioCtx.destination);
  src.start();
  sizzleNode = { src, gain };
}

export function stopSizzle() {
  if (!sizzleNode) return;
  try { sizzleNode.src.stop(); } catch { /* already stopped */ }
  sizzleNode = null;
}
