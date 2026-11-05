import { icon, appIcon, appNames } from './icons.js';
import { clamp, escapeHTML } from './utils.js';
import { motion, durations, easing, reducedMotion, reveal, dismiss, isShown } from './motion.js';

export function createWindowManager({ layer, onChange = () => {}, sound, context }) {
  const registry = new Map(), windows = new Map();
  const controller = new AbortController();
  const signal = controller.signal;
  let topIndex = 20, workspace = 1, active = null;
  const snapPreview = document.getElementById('snap-preview');
  const overview = document.getElementById('expose-overlay');
  const usable = () => ({ x: 12, y: 48, w: innerWidth - 24, h: Math.max(210, innerHeight - 160) });
  const emit = () => onChange({ active, workspace, windows: wm.getWindows() });
  const copyBounds = w => ({ x: w.x, y: w.y, width: w.width, height: w.height });
  function paint(w) {
    Object.assign(w.el.style, { left: `${w.x}px`, top: `${w.y}px`, width: `${w.width}px`, height: `${w.height}px`, zIndex: w.z });
    w.el.hidden = (w.minimized && !w.minimizing) || (w.workspace !== workspace && !w.workspaceLeaving);
    w.el.classList.toggle('active', active === w.id && !w.minimized && w.workspace === workspace);
    w.el.dataset.state = w.minimized ? 'minimized' : w.snapped || 'normal';
  }
  function bounded(bounds, config = {}) {
    const area = usable();
    const width = clamp(bounds.width, Math.min(config.minWidth || 300, area.w), area.w);
    const height = clamp(bounds.height, Math.min(config.minHeight || 220, area.h), area.h);
    return { x: clamp(bounds.x, 8, Math.max(8, innerWidth - width - 8)), y: clamp(bounds.y, 42, Math.max(42, innerHeight - height - 106)), width, height };
  }
  function focusNext() {
    const candidates = [...windows.values()].filter(w => !w.minimized && w.workspace === workspace).sort((a,b) => b.z - a.z);
    active = candidates[0]?.id || null;
    for (const w of windows.values()) paint(w);
  }
  function geometryMotion(w) {
    motion.stop(w.el); w.minimizing = false; w.workspaceLeaving = false;
    w.el.style.pointerEvents = ''; w.el.inert = false;
    w.el.classList.add('geometry-motion'); clearTimeout(w.motionTimer);
    w.motionTimer = setTimeout(() => w.el.classList.remove('geometry-motion'), 460);
  }
  function interrupt(w) {
    motion.stop(w.el); w.minimizing = false; w.workspaceLeaving = false;
    w.el.style.pointerEvents = ''; w.el.inert = false;
    w.el.classList.remove('geometry-motion'); clearTimeout(w.motionTimer);
  }
  function dockPose(w, compact = false) {
    const rect = document.querySelector(`.dock-item[data-app="${w.id}"]`)?.getBoundingClientRect();
    if (!rect) return { transform: 'translateY(24px) scale(.94)', opacity: 0 };
    const dx = rect.x + rect.width / 2 - (w.x + w.width / 2);
    const dy = rect.y + rect.height / 2 - (w.y + w.height);
    return { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${compact ? '.045' : '.82'})`, opacity: 0 };
  }
  function snapBounds(side) {
    const area = usable();
    return side === 'maximized' ? { x: 8, y: 42, width: innerWidth - 16, height: Math.max(210, innerHeight - 148) } : { x: side === 'left' ? area.x : innerWidth / 2 + 3, y: area.y, width: area.w / 2 - 3, height: area.h };
  }
  function snapTarget(event) {
    if (event.clientY < 44) return 'maximized';
    if (event.clientX < 16) return 'left';
    if (event.clientX > innerWidth - 16) return 'right';
    return null;
  }
  function showSnap(side) {
    snapPreview.hidden = !side;
    if (side) { const b = snapBounds(side); Object.assign(snapPreview.style, { left: b.x + 'px', top: b.y + 'px', width: b.width + 'px', height: b.height + 'px' }); }
  }
  function dragWindow(event, w) {
    if (event.button !== 0 || event.target.closest('button,input,select,textarea')) return;
    if (event.detail === 2) { wm.toggleMaximize(w.id); return; }
    event.preventDefault();
    wm.focus(w.id);
    const titlebar = event.currentTarget;
    let original = copyBounds(w);
    const startX = event.clientX, startY = event.clientY;
    let moved = false;
    interrupt(w);
    titlebar.setPointerCapture(event.pointerId);
    const move = e => {
      if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) < 3 && !moved) return;
      if (!moved && w.snapped) {
        const fraction = (startX - w.x) / w.width;
        const saved = w.restoreBounds || { width: 700, height: 500 };
        original = { x: startX - saved.width * fraction, y: startY - 20, width: saved.width, height: saved.height };
        w.snapped = null; Object.assign(w, original);
      }
      moved = true; w.el.classList.add('window-moving');
      w.x = clamp(original.x + e.clientX - startX, -w.width + 140, innerWidth - 140);
      w.y = clamp(original.y + e.clientY - startY, 35, innerHeight - 145);
      paint(w); showSnap(snapTarget(e));
    };
    const finish = e => {
      titlebar.removeEventListener('pointermove', move); titlebar.removeEventListener('pointerup', finish); titlebar.removeEventListener('pointercancel', cancel);
      try { titlebar.releasePointerCapture(event.pointerId); } catch {}
      w.el.classList.remove('window-moving'); showSnap(null);
      if (moved && snapTarget(e)) wm.snap(w.id, snapTarget(e));
      else { Object.assign(w, bounded(copyBounds(w), registry.get(w.id))); paint(w); }
    };
    const cancel = e => { showSnap(null); finish({ ...e, clientX: innerWidth / 2, clientY: 100 }); };
    titlebar.addEventListener('pointermove', move); titlebar.addEventListener('pointerup', finish); titlebar.addEventListener('pointercancel', cancel);
  }
  function resizeWindow(event, w, edge) {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); wm.focus(w.id);
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    interrupt(w); w.el.classList.add('window-moving');
    const origin = copyBounds(w), startX = event.clientX, startY = event.clientY;
    const config = registry.get(w.id), area = usable();
    const minWidth = Math.min(config.minWidth || 320, area.w), minHeight = Math.min(config.minHeight || 240, area.h);
    w.snapped = null;
    const move = e => {
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let x = origin.x, y = origin.y, width = origin.width, height = origin.height;
      if (edge.includes('e')) width = clamp(origin.width + dx, minWidth, innerWidth - x - 8);
      if (edge.includes('s')) height = clamp(origin.height + dy, minHeight, innerHeight - y - 106);
      if (edge.includes('w')) { x = clamp(origin.x + dx, 8, origin.x + origin.width - minWidth); width = origin.width + origin.x - x; }
      if (edge.includes('n')) { y = clamp(origin.y + dy, 42, origin.y + origin.height - minHeight); height = origin.height + origin.y - y; }
      Object.assign(w, { x,y,width,height }); paint(w);
    };
    const end = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end); target.removeEventListener('pointercancel', end); w.el.classList.remove('window-moving'); try { target.releasePointerCapture(event.pointerId); } catch {} };
    target.addEventListener('pointermove', move); target.addEventListener('pointerup', end); target.addEventListener('pointercancel', end);
  }
  const wm = {
    registerApp(id, config) { registry.set(id, config); },
    openApp(id, options = {}) {
      const existing = windows.get(id);
      if (existing) {
        if (existing.workspace !== workspace) wm.switchWorkspace(existing.workspace);
        if (existing.minimized) wm.restore(id); else wm.focus(id);
        if (options.noteId) existing.lifecycle?.openNote?.(options.noteId);
        if (options.folder) existing.lifecycle?.openFolder?.(options.folder);
        if (options.section) existing.lifecycle?.openSection?.(options.section);
        if (options.newNote) existing.lifecycle?.newNote?.();
        return existing;
      }
      const config = registry.get(id);
      if (!config) return null;
      const offset = windows.size * 23;
      const proposed = { x: 125 + offset, y: 78 + offset, width: config.width || 750, height: config.height || 530, ...options.bounds };
      const bounds = bounded(proposed, config);
      const abort = new AbortController();
      const w = { id, ...bounds, z: ++topIndex, workspace, minimized: false, snapped: null, restoreBounds: null, abort, lifecycle: null };
      const el = document.createElement('section'); w.el = el;
      el.className = 'os-window'; el.dataset.app = id; el.setAttribute('aria-label', appNames[id] || id); el.setAttribute('role','region');
      el.innerHTML = `<header class="window-titlebar"><div class="window-controls"><button class="traffic-light close" aria-label="Close ${escapeHTML(appNames[id])}" title="Close">${icon('close')}</button><button class="traffic-light minimize" aria-label="Minimize ${escapeHTML(appNames[id])}" title="Minimize">${icon('minus')}</button><button class="traffic-light maximize" aria-label="Maximize ${escapeHTML(appNames[id])}" title="Maximize or restore">${icon('maximize')}</button></div><span class="window-app-name">${icon(id)}${escapeHTML(appNames[id])}</span><span class="window-subtitle">${escapeHTML(config.subtitle || 'NOTES OS')}</span></header><div class="window-content"></div>${['n','ne','e','se','s','sw','w','nw'].map(edge => `<div class="resize-handle resize-${edge}" data-edge="${edge}" aria-hidden="true"></div>`).join('')}`;
      windows.set(id, w); layer.append(el);
      const opts = { signal: abort.signal };
      el.addEventListener('pointerdown', () => wm.focus(id), opts);
      el.querySelector('.close').addEventListener('click', () => wm.close(id), opts);
      el.querySelector('.minimize').addEventListener('click', () => wm.minimize(id), opts);
      el.querySelector('.maximize').addEventListener('click', () => wm.toggleMaximize(id), opts);
      el.querySelector('.window-titlebar').addEventListener('pointerdown', e => dragWindow(e, w), opts);
      el.querySelectorAll('.resize-handle').forEach(handle => handle.addEventListener('pointerdown', e => resizeWindow(e, w, handle.dataset.edge), opts));
      try { w.lifecycle = config.mount(el.querySelector('.window-content'), { ...context(), options, windowId: id, wm }); }
      catch (error) { console.error(`Unable to open ${id}`, error); el.querySelector('.window-content').innerHTML = `<div class="empty-state"><h3>This app needs a moment.</h3><p>${escapeHTML(error.message)}</p></div>`; }
      wm.focus(id); sound?.click();
      const source = dockPose(w);
      const rect = document.querySelector(`.dock-item[data-app="${id}"]`)?.getBoundingClientRect();
      const drift = rect ? Math.max(-35, Math.min(35, (rect.x - w.x) * .08)) : 0;
      source.transform = `translate3d(${drift}px, 35px, 0) scale(.925)`;
      motion.play(el, [source, { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 }], { duration: durations.window });
      return w;
    },
    focus(id) {
      const w = windows.get(id);
      if (!w || w.minimized || w.workspace !== workspace) return;
      if (active === id) return;
      active = id; w.z = ++topIndex;
      for (const other of windows.values()) paint(other);
      emit();
    },
    close(id = active) {
      const w = windows.get(id); if (!w) return;
      windows.delete(id); w.lifecycle?.destroy?.(); w.abort.abort(); clearTimeout(w.motionTimer);
      const visible = !w.el.hidden;
      w.el.inert = true; w.el.style.pointerEvents = 'none';
      w.el.classList.remove('geometry-motion');
      if (active === id) focusNext();
      if (visible) motion.play(w.el, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(16px) scale(.945)' }], { duration: 260, easing: easing.soft }, () => w.el.remove());
      else { motion.stop(w.el); w.el.remove(); }
      sound?.click(); emit();
    },
    minimize(id = active) {
      const w = windows.get(id); if (!w || w.minimized) return;
      clearTimeout(w.motionTimer); w.el.classList.remove('geometry-motion');
      w.minimized = true; w.minimizing = true; w.workspaceLeaving = false;
      w.el.inert = true; w.el.style.pointerEvents = 'none';
      motion.play(w.el, [{ transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 }, dockPose(w, true)], { duration: durations.flight, easing: 'cubic-bezier(.38, .05, .25, 1)' }, () => {
        w.minimizing = false; w.el.style.pointerEvents = ''; w.el.inert = false; paint(w);
      });
      if (active === id) focusNext();
      emit();
    },
    restore(id) {
      const w = windows.get(id); if (!w) return;
      if (w.workspace !== workspace) wm.switchWorkspace(w.workspace);
      w.minimized = false; w.minimizing = false; w.workspaceLeaving = false;
      w.el.inert = false; w.el.style.pointerEvents = ''; paint(w);
      motion.play(w.el, [dockPose(w, true), { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }], { duration: durations.flight, easing: easing.flow });
      wm.focus(id); emit();
    },
    snap(id = active, side = 'maximized') {
      const w = windows.get(id); if (!w) return;
      if (!w.snapped) w.restoreBounds = copyBounds(w);
      w.snapped = side; geometryMotion(w); Object.assign(w, snapBounds(side)); paint(w); wm.focus(id); emit();
    },
    toggleMaximize(id = active) {
      const w = windows.get(id); if (!w) return;
      if (w.snapped === 'maximized') { geometryMotion(w); Object.assign(w, bounded(w.restoreBounds || { x: 90, y: 75, width: 750, height: 530 }, registry.get(id))); w.snapped = null; paint(w); }
      else wm.snap(id, 'maximized');
    },
    switchWorkspace(value) {
      const next = value === 2 ? 2 : 1;
      if (next === workspace) return;
      const direction = next > workspace ? 1 : -1;
      workspace = next;
      for (const w of windows.values()) {
        if (w.minimized) { interrupt(w); paint(w); continue; }
        const entering = w.workspace === workspace;
        w.workspaceLeaving = !entering; w.el.inert = !entering;
        w.el.style.pointerEvents = entering ? '' : 'none';
        paint(w);
        motion.play(w.el, entering
          ? [{ opacity: 0, transform: `translateX(${direction * 48}px) scale(.99)` }, { opacity: 1, transform: 'translateX(0) scale(1)' }]
          : [{ opacity: 1, transform: 'translateX(0) scale(1)' }, { opacity: 0, transform: `translateX(${-direction * 48}px) scale(.99)` }],
          { duration: durations.workspace }, () => { w.workspaceLeaving = false; w.el.inert = false; w.el.style.pointerEvents = ''; paint(w); });
      }
      focusNext(); emit();
    },
    showDesktop() { for (const w of windows.values()) if (w.workspace === workspace && !w.minimized) wm.minimize(w.id); },
    toggleExpose() {
      if (isShown(overview)) { dismiss(overview, { offset: 0, scale: 1 }); return; }
      overview.innerHTML = `<div class="expose-heading"><div><h2>A little overview.</h2><p>Your open windows, all in one place.</p></div><button class="secondary-button" data-expose-close>Back to desktop <kbd>Esc</kbd></button></div><div class="expose-grid">${[...windows.values()].map(w => `<button class="expose-card" data-expose-app="${w.id}">${appIcon(w.id,46)}<b>${escapeHTML(appNames[w.id])}</b><span>${w.workspace === 1 ? 'Writing' : 'Research'}${w.minimized ? ' · Minimized' : ''}</span></button>`).join('') || '<p>No windows open. Pick an app from the dock.</p>'}</div>`;
      reveal(overview, { offset: 0, scale: 1, duration: durations.workspace });
      overview.querySelectorAll('.expose-card').forEach((card, index) => motion.play(card, [{ opacity: 0, transform: 'translateY(22px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 380, delay: index * 28 }));
      overview.querySelector('[data-expose-close]').addEventListener('click', () => dismiss(overview, { offset: 0, scale: 1 }), { once: true });
      overview.querySelectorAll('[data-expose-app]').forEach(btn => btn.addEventListener('click', () => { dismiss(overview, { offset: 0, scale: 1 }); wm.openApp(btn.dataset.exposeApp); }, { once: true }));
    },
    getWindows: () => [...windows.values()].map(w => ({ id: w.id, workspace: w.workspace, minimized: w.minimized, active: active === w.id, snapped: w.snapped, ...copyBounds(w) })),
    getActiveWindow: () => windows.get(active) || null,
    getWindow: id => windows.get(id) || null,
    getWorkspace: () => workspace,
    destroy() { controller.abort(); for (const w of windows.values()) { w.lifecycle?.destroy?.(); w.abort.abort(); motion.stop(w.el); clearTimeout(w.motionTimer); w.el.remove(); } windows.clear(); }
  };
  window.addEventListener('resize', () => {
    for (const w of windows.values()) { interrupt(w); Object.assign(w, w.snapped ? snapBounds(w.snapped) : bounded(copyBounds(w), registry.get(w.id))); paint(w); }
  }, { signal });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isShown(overview)) { dismiss(overview, { offset: 0, scale: 1 }); e.preventDefault(); }
    if (e.key === 'F3') { e.preventDefault(); wm.toggleExpose(); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); wm.minimize(); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); wm.toggleMaximize(); }
  }, { signal });
  return wm;
}
