export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const relativeDate = timestamp => {
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
export function downloadFile(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function listen(target, event, fn, signal, options = {}) {
  target.addEventListener(event, fn, { ...options, signal });
}
export function wordCount(text) { return String(text).trim().match(/\S+/g)?.length || 0; }
export function stripMarkdown(text) { return String(text).replace(/[#*_>`~\[\]]/g, '').replace(/\n+/g, ' ').trim(); }
export function trapFocus(event, container) {
  if (event.key !== 'Tab') return;
  const items = [...container.querySelectorAll('button:not([disabled]),input,textarea,select,a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
  if (!items.length) return;
  const first = items[0], last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
