import { motion, reducedMotion, dockInfluence, damp, easing } from './motion.js';

export function createDock(dock) {
  const abort = new AbortController(), options = { signal: abort.signal };
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const items = [...dock.querySelectorAll('.dock-item')].map(button => {
    const art = button.querySelector(':scope > svg');
    const lift = document.createElement('span'), launch = document.createElement('span');
    lift.className = 'dock-lift'; launch.className = 'dock-art';
    button.prepend(lift); lift.append(launch); launch.append(art);
    return { button, lift, launch, center: 0, amount: 0, shift: 0 };
  });
  let pointer = null, focused = null, frame = 0, previousTime = 0, pressed = null;
  function measure() {
    for (const item of items) {
      const rect = item.button.getBoundingClientRect();
      item.center = rect.x + rect.width / 2;
    }
  }
  function reset() {
    cancelAnimationFrame(frame); frame = 0; previousTime = 0;
    for (const item of items) {
      item.amount = 0; item.shift = 0;
      item.lift.style.transform = '';
      item.button.classList.remove('dock-nearest');
      motion.stop(item.launch);
    }
  }
  function update(now) {
    const elapsed = previousTime ? Math.min(now - previousTime, 40) : 16;
    previousTime = now;
    const targetX = pointer ?? focused;
    const enabled = !reducedMotion() && finePointer.matches;
    let moving = false;
    const nearest = enabled && targetX !== null ? items.reduce((best, item) => Math.abs(item.center - targetX) < Math.abs(best.center - targetX) ? item : best, items[0]) : null;
    for (const item of items) {
      const distance = targetX === null ? 999 : item.center - targetX;
      const target = enabled ? dockInfluence(distance) : 0;
      const push = enabled && targetX !== null ? Math.sign(distance) * 8 * dockInfluence(Math.abs(distance) - 30, 160) * Math.min(1, Math.abs(distance) / 40) : 0;
      item.amount = damp(item.amount, target, elapsed, target > item.amount ? 65 : 100);
      item.shift = damp(item.shift, push, elapsed, 80);
      if (Math.abs(item.amount - target) < .001) item.amount = target;
      if (Math.abs(item.shift - push) < .01) item.shift = push;
      const press = pressed === item.button ? .96 : 1;
      item.lift.style.transform = `translate3d(${item.shift.toFixed(2)}px, ${(-item.amount * 13).toFixed(2)}px, 0) scale(${((1 + item.amount * .27) * press).toFixed(4)})`;
      item.button.classList.toggle('dock-nearest', item === nearest);
      moving ||= item.amount !== target || item.shift !== push;
    }
    frame = moving ? requestAnimationFrame(update) : 0;
    if (!frame) previousTime = 0;
  }
  function wake() { if (!frame) frame = requestAnimationFrame(update); }
  dock.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { measure(); pointer = event.clientX; wake(); } }, options);
  dock.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') { pointer = event.clientX; wake(); } }, options);
  dock.addEventListener('pointerleave', () => { pointer = null; pressed = null; wake(); }, options);
  dock.addEventListener('pointerdown', event => { pressed = event.target.closest('.dock-item'); wake(); }, options);
  window.addEventListener('pointerup', () => { pressed = null; wake(); }, options);
  window.addEventListener('pointercancel', () => { pressed = null; wake(); }, options);
  dock.addEventListener('focusin', event => { measure(); focused = event.target.matches(':focus-visible') ? items.find(item => item.button === event.target)?.center ?? null : null; wake(); }, options);
  dock.addEventListener('focusout', () => { focused = null; wake(); }, options);
  window.addEventListener('resize', () => { measure(); wake(); }, options);
  window.addEventListener('blur', () => { pointer = null; focused = null; pressed = null; reset(); }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); }, options);
  preference.addEventListener('change', reset, options);
  document.addEventListener('notes:motionchange', () => { reset(); wake(); }, options);
  finePointer.addEventListener('change', reset, options);
  measure();
  return {
    launch(id) {
      const item = items.find(item => item.button.dataset.app === id);
      if (!item || reducedMotion()) return;
      motion.play(item.launch, [{ transform: 'translateY(0)' }, { transform: 'translateY(-11px)', offset: .36, easing: easing.soft }, { transform: 'translateY(0)' }], { duration: 520, easing: easing.flow, continuity: [] });
    },
    destroy() { abort.abort(); reset(); }
  };
}
