export const WALLPAPER_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
export const MAX_WALLPAPER_BYTES = 20 * 1024 * 1024;
const DB_NAME = 'notes-os-assets-v1', STORE = 'wallpapers';
const clone = value => structuredClone(value);

export function validateWallpaperDescriptor({ name = '', type = '', size = 0 }) {
  if (!WALLPAPER_TYPES.has(type)) throw new Error('Choose a PNG, JPG, WebP, or SVG image.');
  if (!size || size > MAX_WALLPAPER_BYTES) throw new Error('Wallpaper images must be between 1 byte and 20 MB.');
  return { name: String(name).slice(0, 120) || 'Custom wallpaper', type, size };
}
export function validateSvgWallpaper(text) {
  const source = String(text);
  if (!/<svg[\s>]/i.test(source)) throw new Error('That file is not a valid SVG image.');
  if (/<(?:script|foreignObject|iframe|object|embed|audio|video)\b/i.test(source) || /\son\w+\s*=/i.test(source) || /(?:href|src)\s*=\s*["']\s*(?:https?:|javascript:|data:text\/html)/i.test(source)) throw new Error('That SVG contains active or external content and cannot be used.');
  return true;
}
export const wallpaperFit = fit => ['cover', 'contain', 'center'].includes(fit) ? fit : 'cover';

export function createMemoryWallpaperStore() {
  const records = new Map();
  return {
    async list() { return [...records.values()].map(({ blob, ...meta }) => structuredClone(meta)); }, async get(id) { return records.has(id) ? structuredClone(records.get(id)) : null; },
    async put(record) { records.set(record.id, structuredClone(record)); }, async remove(id) { return records.delete(id); },
    async exportAll() { return [...records.values()].map(record => structuredClone(record)); }, values: records
  };
}

function openDatabase(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) throw new Error('This browser cannot store custom wallpaper images.');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open the wallpaper library.'));
  });
}
async function transact(mode, run) {
  const db = await openDatabase();
  try { return await new Promise((resolve, reject) => { const tx = db.transaction(STORE, mode), store = tx.objectStore(STORE); let result; try { result = run(store); } catch (error) { reject(error); return; } tx.oncomplete = () => resolve(result?.result ?? result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Wallpaper storage was interrupted.')); }); }
  finally { db.close(); }
}
export function createWallpaperStore() {
  const listeners = new Set(), urls = new Map();
  const announce = event => listeners.forEach(fn => fn(event));
  return {
    async list() { const records = await transact('readonly', store => store.getAll()); return records.map(({ blob, ...meta }) => meta).sort((a,b) => b.createdAt-a.createdAt); },
    async get(id) { return await transact('readonly', store => store.get(id)) || null; },
    async add(file) {
      const meta = validateWallpaperDescriptor(file); if (meta.type === 'image/svg+xml') validateSvgWallpaper(await file.text());
      const record = { id: `custom-${crypto.randomUUID()}`, ...meta, fit: 'cover', createdAt: Date.now(), blob: file.slice(0, file.size, file.type) };
      await transact('readwrite', store => store.put(record)); announce({ type: 'add', id: record.id }); return { ...record, blob: undefined };
    },
    async remove(id) { const current = await this.get(id); if (!current) return false; await transact('readwrite', store => store.delete(id)); if (urls.has(id)) URL.revokeObjectURL(urls.get(id)); urls.delete(id); announce({ type: 'remove', id }); return true; },
    async setFit(id, fit) { const record = await this.get(id); if (!record) throw new Error('Wallpaper not found.'); record.fit = wallpaperFit(fit); await transact('readwrite', store => store.put(record)); announce({ type: 'fit', id }); return record.fit; },
    async url(id) { if (urls.has(id)) return urls.get(id); const record = await this.get(id); if (!record) return null; const url = URL.createObjectURL(record.blob); urls.set(id, url); return url; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async exportAll() { return await transact('readonly', store => store.getAll()); },
    async importAll(records) { for (const record of records || []) { validateWallpaperDescriptor(record); if (!(record.blob instanceof Blob)) throw new Error('A wallpaper image is missing from this backup.'); await transact('readwrite', store => store.put({ ...clone(record), fit: wallpaperFit(record.fit) })); } announce({ type: 'import' }); },
    destroy() { for (const url of urls.values()) URL.revokeObjectURL(url); urls.clear(); listeners.clear(); }
  };
}
export const wallpaperStore = createWallpaperStore();
