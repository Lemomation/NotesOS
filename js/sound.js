import { vfs } from './vfs.js';

let audio, master, analyser, noiseBuffer, playing = false;
const gains = {}, sources = [], listeners = new Set();
const levels = { drone: .18, rain: .3, keys: .16, vinyl: .08 };
let keysTimer = null;
const notify = () => listeners.forEach(fn => fn({ playing, levels: { ...levels } }));

function init() {
  if (audio) { if (audio.state === 'suspended') audio.resume(); return audio; }
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) return null;
  audio = new AudioContext();
  master = audio.createGain(); master.gain.value = 0;
  analyser = audio.createAnalyser(); analyser.fftSize = 256;
  master.connect(analyser); analyser.connect(audio.destination);
  noiseBuffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < data.length; i++) { previous = (previous + Math.random() * .04 - .02) / 1.02; data[i] = previous * 4; }
  for (const stem of Object.keys(levels)) { gains[stem] = audio.createGain(); gains[stem].gain.value = levels[stem]; gains[stem].connect(master); }
  [110, 164.81, 220.25].forEach((hz, i) => {
    const oscillator = audio.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = hz;
    const gain = audio.createGain(); gain.gain.value = .09 / (i + 1);
    oscillator.connect(gain); gain.connect(gains.drone); oscillator.start(); sources.push(oscillator);
  });
  ['rain', 'vinyl'].forEach(stem => {
    const source = audio.createBufferSource(); source.buffer = noiseBuffer; source.loop = true;
    const filter = audio.createBiquadFilter(); filter.type = stem === 'rain' ? 'lowpass' : 'highpass'; filter.frequency.value = stem === 'rain' ? 1700 : 170;
    const volume = audio.createGain(); volume.gain.value = stem === 'rain' ? 1 : .32;
    source.connect(filter); filter.connect(volume); volume.connect(gains[stem]); source.start(); sources.push(source);
  });
  return audio;
}
function piano() {
  if (!playing || !audio || levels.keys === 0) return;
  const base = [130.81, 164.81, 196, 261.63][Math.floor(Math.random() * 4)];
  [base, base * 1.5].forEach(hz => {
    const oscillator = audio.createOscillator(), envelope = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = hz;
    envelope.gain.setValueAtTime(0, audio.currentTime);
    envelope.gain.linearRampToValueAtTime(.23, audio.currentTime + .035);
    envelope.gain.exponentialRampToValueAtTime(.001, audio.currentTime + 4);
    oscillator.connect(envelope); envelope.connect(gains.keys); oscillator.start(); oscillator.stop(audio.currentTime + 4.1);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  });
}
export const sound = {
  isPlaying: () => playing,
  getLevels: () => ({ ...levels }),
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  click(kind = 'click') {
    if (!vfs.getPrefs().soundEnabled) return;
    if (!init()) return;
    const oscillator = audio.createOscillator(), envelope = audio.createGain();
    oscillator.frequency.value = kind === 'notify' ? 660 : 360;
    oscillator.type = 'sine'; envelope.gain.setValueAtTime(.035, audio.currentTime); envelope.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .055);
    oscillator.connect(envelope); envelope.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .06);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  },
  toggleMaster() {
    if (!init()) return false;
    playing = !playing;
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setTargetAtTime(playing ? .45 : 0, audio.currentTime, .2);
    if (playing) { piano(); keysTimer = setInterval(piano, 4900); }
    else { clearInterval(keysTimer); keysTimer = null; }
    notify(); return playing;
  },
  setStemLevel(stem, value) {
    if (!(stem in levels)) return;
    levels[stem] = Math.max(0, Math.min(1, Number(value) || 0));
    if (gains[stem]) gains[stem].gain.setTargetAtTime(levels[stem], audio.currentTime, .08);
    notify();
  },
  getAnalyserData() {
    const data = new Uint8Array(128); data.fill(128);
    if (analyser && playing) analyser.getByteTimeDomainData(data);
    return data;
  },
  stop() { if (playing) sound.toggleMaster(); },
  destroy() { clearInterval(keysTimer); sources.forEach(s => { try { s.stop(); } catch {} }); audio?.close(); listeners.clear(); }
};

let duration = 25 * 60, remaining = duration, deadline = 0, running = false, sessions = 0, preset = 'Focus';
const timerListeners = new Set();
const timerNotify = () => timerListeners.forEach(fn => fn(focusTimer.getState()));
const tick = () => {
  if (!running) return;
  remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  if (!remaining) { running = false; sessions++; sound.click('notify'); }
  timerNotify();
};
const interval = typeof window !== 'undefined' ? setInterval(tick, 1000) : null;
export const focusTimer = {
  getState: () => ({ duration, remaining, running, sessions, preset }),
  subscribe(fn) { timerListeners.add(fn); return () => timerListeners.delete(fn); },
  toggle() {
    if (running) { remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); running = false; }
    else { if (!remaining) remaining = duration; deadline = Date.now() + remaining * 1000; running = true; }
    timerNotify();
  },
  reset() { remaining = duration; running = false; timerNotify(); },
  setPreset(name, seconds) { preset = name; duration = seconds; remaining = duration; running = false; timerNotify(); },
  destroy() { if (interval) clearInterval(interval); timerListeners.clear(); }
};
export const formatTime = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
