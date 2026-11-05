export const durations = Object.freeze({ feedback: 170, panel: 260, exit: 210, window: 460, flight: 540, workspace: 340, wallpaper: 600 });
export const easing = Object.freeze({ flow: 'cubic-bezier(.16, 1, .3, 1)', soft: 'cubic-bezier(.22, .75, .18, 1)', leave: 'cubic-bezier(.4, 0, .65, 1)' });
const preference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
let motionPreference = 'system';
export function shouldReduceMotion(mode, deviceReduced) {
  return mode === 'reduced' || (mode !== 'smooth' && !!deviceReduced);
}
export const reducedMotion = () => shouldReduceMotion(motionPreference, preference?.matches);
export function setMotionPreference(mode = 'system') {
  const next = ['smooth', 'system', 'reduced'].includes(mode) ? mode : 'system';
  const changed = next !== motionPreference;
  motionPreference = next;
  const document = globalThis.document;
  if (document) {
    document.documentElement.dataset.motion = next;
    document.documentElement.dataset.motionReduced = String(reducedMotion());
  }
  if (reducedMotion()) motion.finishAll();
  if (changed) document?.dispatchEvent(new Event('notes:motionchange'));
}

/* Each element has one owner. Replacing a flight keeps its current visual position. */
export function createMotion({ reduced = reducedMotion, readStyle = element => getComputedStyle(element) } = {}) {
  const running = new Map();
  function settle(element, record, completed) {
    if (running.get(element) !== record) return;
    running.delete(element);
    record.animation?.cancel();
    element.style.willChange = record.previousWillChange;
    record.resolve(completed);
    if (completed) record.onFinish?.();
  }
  function stop(element, finish = false) {
    const record = running.get(element);
    if (record) settle(element, record, finish);
  }
  function play(element, keyframes, options = {}, onFinish) {
    if (!element) return Promise.resolve(false);
    const { duration = durations.panel, easing: curve = easing.flow, continuity = ['transform', 'opacity'], ...timing } = options;
    const frames = keyframes.map(frame => ({ ...frame }));
    if (running.has(element) && continuity.length) {
      const style = readStyle(element);
      for (const property of continuity) {
        if (frames[0][property] !== undefined) frames[0][property] = style[property];
      }
    }
    stop(element);
    if (reduced() || duration === 0 || !element.animate) {
      onFinish?.();
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      const record = { animation: null, resolve, onFinish, previousWillChange: element.style.willChange };
      running.set(element, record);
      element.style.willChange = 'transform, opacity';
      try {
        record.animation = element.animate(frames, { duration, easing: curve, fill: 'both', ...timing });
        record.animation.finished.then(() => settle(element, record, true), () => settle(element, record, false));
      } catch {
        settle(element, record, true);
      }
    });
  }
  return { play, stop, isRunning: element => running.has(element), finishAll() { for (const [element, record] of [...running]) settle(element, record, true); }, get activeCount() { return running.size; } };
}
export const motion = createMotion();
preference?.addEventListener('change', () => {
  setMotionPreference(motionPreference);
  globalThis.document?.dispatchEvent(new Event('notes:motionchange'));
});

export const isShown = element => !element.hidden && element.dataset.motionVisibility !== 'closing';
export function reveal(element, { offset = 8, scale = .975, duration = durations.panel, origin = 'center top' } = {}) {
  const alreadyOpen = isShown(element);
  element.hidden = false;
  element.inert = false;
  element.dataset.motionVisibility = 'open';
  element.style.transformOrigin = origin;
  if (alreadyOpen) return Promise.resolve(true);
  return motion.play(element, [{ opacity: 0, transform: `translateY(${offset}px) scale(${scale})` }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration });
}
export function dismiss(element, { offset = -4, scale = .985, duration = durations.exit, remove = false, onHidden } = {}) {
  if (element.hidden || element.dataset.motionVisibility === 'closing') return Promise.resolve(false);
  element.dataset.motionVisibility = 'closing';
  element.inert = true;
  return motion.play(element, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: `translateY(${offset}px) scale(${scale})` }], { duration, easing: easing.soft }, () => {
    element.hidden = true;
    element.inert = false;
    delete element.dataset.motionVisibility;
    if (remove) element.remove();
    onHidden?.();
  });
}

export function dockInfluence(distance, radius = 112) {
  const normalized = Math.min(1, Math.abs(distance) / radius);
  return (Math.cos(normalized * Math.PI) + 1) / 2;
}
export function damp(current, target, elapsed, response = 90) {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, Math.min(elapsed, 64)) / response));
}
