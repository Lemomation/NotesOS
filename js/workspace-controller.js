export const WORKSPACE_RECORD_KEY = 'notesOsWorkspace';

const clone = value => structuredClone(value);
const noteFields = ['title', 'body', 'folder', 'tags', 'favorite', 'deleted'];
const textFields = ['title', 'body'];
const noteMap = workspace => new Map((workspace?.notes || []).map(note => [note.id, note]));

// Storage/message serialization may reorder object keys. Order is not a content change.
export function equalData(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => equalData(value, b[index]));
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equalData(a[key], b[key]));
}

export function validWorkspaceShape(workspace) {
  return !!workspace && workspace.version === 1 && Array.isArray(workspace.folders) && Array.isArray(workspace.notes) && workspace.notes.every(note => note && typeof note.id === 'string' && typeof note.title === 'string' && typeof note.body === 'string') && workspace.canvas && Array.isArray(workspace.canvas.nodes) && Array.isArray(workspace.canvas.edges) && workspace.prefs && typeof workspace.prefs === 'object';
}

export function recoveredNote(note, now = Date.now()) {
  return { ...clone(note), id: `${note.id}-recovered-${now}`, title: `${note.title} — recovered copy`, favorite: false, deleted: false, createdAt: now, updatedAt: now, tags: [...new Set([...(note.tags || []), 'recovered'])] };
}

function sameNote(a, b) {
  return !!a && !!b && noteFields.every(field => equalData(a[field], b[field]));
}
function keepRecovery(notes, note, now) {
  const copy = recoveredNote(note, now);
  const prefix = `${note.id}-recovered-`;
  if ([...notes.values()].some(existing => existing.id.startsWith(prefix) && existing.title === copy.title && existing.body === copy.body)) return;
  let suffix = 1;
  while (notes.has(copy.id)) copy.id = `${prefix}${now}-${suffix++}`;
  notes.set(copy.id, copy);
}

function mergeNotes(current, incoming, base, events, now) {
  const merged = noteMap(current), incomingById = noteMap(incoming), baseById = noteMap(base);
  const touched = new Set(events.filter(event => event.type === 'notes' && event.id).map(event => event.id));
  for (const id of touched) {
    const live = merged.get(id), next = incomingById.get(id), before = baseById.get(id);
    if (!next) {
      if (before && sameNote(live, before)) merged.delete(id);
      continue;
    }
    if (!live) {
      if (!before) merged.set(id, clone(next));
      else if (!sameNote(next, before)) keepRecovery(merged, next, now);
      continue;
    }
    if (!before) {
      if (!sameNote(live, next)) { keepRecovery(merged, live, now); merged.set(id, clone(next)); }
      continue;
    }
    const changed = noteFields.filter(field => !equalData(next[field], before[field]));
    if (!changed.length) continue;
    const writingText = textFields.some(field => changed.includes(field));
    if (live.deleted && !before.deleted && writingText && !changed.includes('deleted')) {
      // An edit based on a pre-deletion tab must not silently resurrect the deleted note.
      keepRecovery(merged, next, now);
      continue;
    }
    const conflictingText = textFields.some(field => changed.includes(field) && !equalData(live[field], before[field]) && !equalData(live[field], next[field]));
    const deletingEditedText = changed.includes('deleted') && next.deleted && textFields.some(field => !equalData(live[field], before[field]));
    if (conflictingText || deletingEditedText) keepRecovery(merged, live, now);
    // Keep the active writer on the original ID. Recovery holds the displaced text, never each next keystroke.
    const updated = clone(live);
    for (const field of changed) updated[field] = clone(next[field]);
    updated.updatedAt = Math.max(Number(live.updatedAt) || 0, Number(next.updatedAt) || 0);
    merged.set(id, updated);
  }
  return [...merged.values()];
}

function mergeCanvas(current, incoming, base, events) {
  if (!events.some(event => event.type === 'canvas')) return clone(current.canvas);
  const mergeItems = key => {
    const live = new Map((current.canvas[key] || []).map(item => [item.id, clone(item)]));
    const before = new Map((base.canvas[key] || []).map(item => [item.id, item]));
    const next = new Map((incoming.canvas[key] || []).map(item => [item.id, item]));
    for (const [id, item] of next) {
      const old = before.get(id);
      if (equalData(item, old)) continue;
      if (!old) { live.set(id, clone(item)); continue; }
      const merged = live.get(id);
      if (!merged) continue;
      for (const field of Object.keys(item)) if (!equalData(item[field], old[field])) merged[field] = clone(item[field]);
    }
    for (const [id, item] of before) if (!next.has(id) && equalData(live.get(id), item)) live.delete(id);
    return [...live.values()];
  };
  const nodes = mergeItems('nodes'), ids = new Set(nodes.map(node => node.id));
  const edges = mergeItems('edges').filter(edge => ids.has(edge.from) && ids.has(edge.to));
  const view = equalData(incoming.canvas.view, base.canvas.view) ? current.canvas.view : incoming.canvas.view;
  return { nodes, edges, view: clone(view) };
}

export function mergeWorkspaceCommit({ current, incoming, base, events = [], now = Date.now() }) {
  if (!validWorkspaceShape(incoming)) throw new Error('The incoming workspace is invalid.');
  if (!validWorkspaceShape(current) || events.some(event => event.type === 'reset' || event.type === 'import')) return clone(incoming);
  const before = validWorkspaceShape(base) ? base : current;
  const merged = clone(current);
  merged.notes = mergeNotes(current, incoming, before, events, now);
  if (events.some(event => event.type === 'folders')) merged.folders = [...new Set([...current.folders, ...incoming.folders])];
  for (const event of events.filter(event => event.type === 'prefs')) {
    for (const key of event.keys || []) {
      if (!Object.hasOwn(incoming.prefs, key) || equalData(incoming.prefs[key], before.prefs[key])) continue;
      merged.prefs[key] = clone(incoming.prefs[key]);
    }
  }
  merged.canvas = mergeCanvas(current, incoming, before, events);
  return merged;
}

export function createWorkspaceRecord(workspace, revision = 0) {
  if (!validWorkspaceShape(workspace)) throw new Error('Cannot store an invalid workspace.');
  return { workspace: clone(workspace), revision, updatedAt: Date.now() };
}
