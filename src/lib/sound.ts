/** Synthesised board sounds — no audio files to download. */
let ctx: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (on: boolean) => {
  enabled = on;
};

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function knock(a: AudioContext, t: number, freq: number, gain: number, len = 0.09) {
  // Filtered noise burst + a short pitched body = a wooden "tock".
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
  const noise = a.createBufferSource();
  noise.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq * 6;
  bp.Q.value = 1.2;
  const ng = a.createGain();
  ng.gain.value = gain * 0.9;
  noise.connect(bp).connect(ng).connect(a.destination);
  noise.start(t);

  const osc = a.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + len);
  const og = a.createGain();
  og.gain.setValueAtTime(gain, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(og).connect(a.destination);
  osc.start(t);
  osc.stop(t + len + 0.02);
}

function tone(a: AudioContext, t: number, freq: number, gain: number, len: number) {
  const osc = a.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + len + 0.05);
}

export type SoundKind = "move" | "capture" | "check" | "castle" | "end" | "select" | "low-time";

export function play(kind: SoundKind) {
  if (!enabled) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + 0.005;
  switch (kind) {
    case "move":
      knock(a, t, 210, 0.35);
      break;
    case "capture":
      knock(a, t, 170, 0.5, 0.12);
      knock(a, t + 0.045, 240, 0.25);
      break;
    case "castle":
      knock(a, t, 210, 0.3);
      knock(a, t + 0.09, 190, 0.3);
      break;
    case "check":
      knock(a, t, 220, 0.35);
      tone(a, t + 0.02, 880, 0.08, 0.25);
      break;
    case "select":
      tone(a, t, 660, 0.025, 0.06);
      break;
    case "low-time":
      tone(a, t, 990, 0.05, 0.12);
      break;
    case "end":
      [523.25, 659.25, 783.99].forEach((f, i) => tone(a, t + i * 0.12, f, 0.09, 0.7));
      break;
  }
}
