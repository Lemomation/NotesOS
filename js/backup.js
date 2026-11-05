import { validWorkspaceShape } from './workspace-controller.js';
import { validateWallpaperDescriptor, validateSvgWallpaper, wallpaperFit } from './wallpaper-store.js';

const MAX_BACKUP_BYTES = 80 * 1024 * 1024;
const readDataUrl = blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error || new Error('Could not read an image.')); reader.readAsDataURL(blob); });
function blobFromDataUrl(value, expectedType) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(value || '');
  if (!match || match[1] !== expectedType) throw new Error('A wallpaper image in this backup is invalid.');
  const binary = atob(match[2]), bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: expectedType });
}
export function validateWorkspaceBackup(value) {
  const workspace = typeof value === 'string' ? JSON.parse(value) : value;
  if (!validWorkspaceShape(workspace)) throw new Error('That file is not a valid Notes OS workspace.');
  return structuredClone(workspace);
}
export async function createFullBackup(workspace, wallpaperStore) {
  const wallpapers = [];
  for (const record of await wallpaperStore.exportAll()) wallpapers.push({ id: record.id, name: record.name, type: record.type, size: record.size, fit: wallpaperFit(record.fit), createdAt: record.createdAt, data: await readDataUrl(record.blob) });
  return JSON.stringify({ format: 'notes-os-backup', version: 1, createdAt: new Date().toISOString(), workspace: validateWorkspaceBackup(workspace), wallpapers }, null, 2);
}
export function parseBackup(text) {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('That backup is too large to import.');
  const value = JSON.parse(text);
  if (value?.format !== 'notes-os-backup' || value.version !== 1) return { workspace: validateWorkspaceBackup(value), wallpapers: [], full: false };
  const workspace = validateWorkspaceBackup(value.workspace), wallpapers = [];
  for (const item of value.wallpapers || []) {
    const descriptor = validateWallpaperDescriptor(item), blob = blobFromDataUrl(item.data, descriptor.type);
    if (blob.size !== descriptor.size) throw new Error(`The image “${descriptor.name}” is incomplete.`);
    wallpapers.push({ id: /^custom-[\w-]+$/.test(item.id) ? item.id : `custom-${crypto.randomUUID()}`, ...descriptor, fit: wallpaperFit(item.fit), createdAt: Number(item.createdAt) || Date.now(), blob });
  }
  return { workspace, wallpapers, full: true };
}
