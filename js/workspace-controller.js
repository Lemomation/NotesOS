export const WORKSPACE_RECORD_KEY = 'notesOsWorkspace';

const clone = value => structuredClone(value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const noteMap = workspace => new Map((workspace?.notes || []).map(note => [note.id, note]));

export function validWorkspaceShape(workspace) {
  return !!workspace && workspace.version === 1 && Array.isArray(workspace.folders) && Array.isArray(workspace.notes) && workspace.notes.every(note => note && typeof note.id === 'string' && typeof note.title === 'string' && typeof note.body === 'string') && workspace.canvas && Array.isArray(workspace.canvas.nodes) && Array.isArray(workspace.canvas.edges) && workspace.prefs && typeof workspace.prefs === 'object';
}

export function recoveredNote(note, now = Date.now()) {
  return { ...clone(note), id: `${note.id}-recovered-${now}`, title: `${note.title} — recovered copy`, favorite: false, deleted: false, createdAt: now, updatedAt: now, tags: [...new Set([...(note.tags || []), 'recovered'])] };
}

function mergeNotes(current, incoming, base, events, now) {
  const merged = noteMap(current), incomingById = noteMap(incoming), baseById = noteMap(base);
  const touched = new Set(events.filter(event => event.type === 'notes' && event.id).map(event => event.id));
  if (events.some(event => event.type === 'reset' || event.type === 'import')) return clone(incoming.notes);
  for (const id of touched) {
    const live = merged.get(id), next = incomingById.get(id), before = baseById.get(id);
    if (!next) { if (before && equal(live, before)) merged.delete(id); continue; }
    if (!live || !before || equal(live, before) || equal(live, next)) merged.set(id, clone(next));
    else if (!equal(next, before)) { const recovered = recoveredNote(next, now); merged.set(recovered.id, recovered); }
  }
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function mergeCanvas(current, incoming, events) {
  if (!events.some(event => event.type === 'canvas')) return clone(current.canvas);
  const nodes = new Map((current.canvas.nodes || []).map(node => [node.id, node]));
  for (const node of incoming.canvas.nodes || []) nodes.set(node.id, clone(node));
  const edges = new Map((current.canvas.edges || []).map(edge => [edge.id, edge]));
  for (const edge of incoming.canvas.edges || []) edges.set(edge.id, clone(edge));
  const ids = new Set(nodes.keys());
  return { nodes: [...nodes.values()], edges: [...edges.values()].filter(edge => ids.has(edge.from) && ids.has(edge.to)), view: clone(incoming.canvas.view || current.canvas.view) };
}

export function mergeWorkspaceCommit({ current, incoming, base, events = [], now = Date.now() }) {
  if (!validWorkspaceShape(incoming)) throw new Error('The incoming workspace is invalid.');
  if (!validWorkspaceShape(current) || events.some(event => event.type === 'reset' || event.type === 'import')) return clone(incoming);
  if (base && equal(current, base)) return clone(incoming);
  const merged = clone(current);
  merged.notes = mergeNotes(current, incoming, base || current, events, now);
  if (events.some(event => event.type === 'folders')) merged.folders = [...new Set([...current.folders, ...incoming.folders])];
  if (events.some(event => event.type === 'prefs')) {
    const keys = new Set(events.filter(event => event.type === 'prefs').flatMap(event => event.keys || []));
    for (const key of keys) merged.prefs[key] = clone(incoming.prefs[key]);
  }
  merged.canvas = mergeCanvas(current, incoming, events);
  return merged;
}

export function createWorkspaceRecord(workspace, revision = 0) {
  if (!validWorkspaceShape(workspace)) throw new Error('Cannot store an invalid workspace.');
  return { workspace: clone(workspace), revision, updatedAt: Date.now() };
}
