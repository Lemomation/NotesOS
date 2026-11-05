import { uid } from './utils.js';
import { equalData } from './workspace-controller.js';

export const STORAGE_KEY = 'notes-os.workspace.v1';
const defaults = { theme: 'light', motion: 'system', wallpaper: 'topographic', accent: '#b85f40', soundEnabled: false, workspace: 1, scratchpad: 'Less noise.\nMore room for the good stuff.', desktopPositions: {} };
const clone = value => structuredClone(value);

export function seedWorkspace() {
  const now = Date.now();
  const note = (id, title, body, folder, tags, days = 0, favorite = false) => ({ id, title, body, folder, tags, favorite, createdAt: now - (days + 4) * 86400000, updatedAt: now - days * 86400000, deleted: false });
  return {
    version: 1,
    folders: ['/Notes', '/Projects', '/Journal', '/Canvas'],
    notes: [
      note('welcome', 'A little room to think.', 'A quieter place for your ideas, your unfinished thoughts, and the things you don’t want to forget.\n\n## Make yourself at home\n\nThis is **your space**. No feeds, no noise. Just a few good tools and a little breathing room.\n\n- [x] Find a place for your thoughts\n- [x] Leave a little space for possibility\n- [ ] Write something that matters to you\n\n> You don’t have to make something great. Just make a little room, and see what happens.\n\n## A few things to try\n\nOpen [[Small things, lately]] for a little inspiration. Map a loose idea on your **Canvas**, or settle into a focus session with **Tempo**.\n\nPress **Ctrl + K** to find your way around. Everything you write stays right here, in this browser.\n\n---\n\n*Made for the way you think. Not the other way around.*', '/Notes', ['getting-started'], 0, true),
      note('small-things', 'Small things, lately', '## The ordinary, noticed\n\nMorning light on the kitchen wall. The first page of a new notebook. A song you haven’t heard in years.\n\n- The almost-green of olive leaves\n- Someone remembering how you take your coffee\n- A walk without a destination\n- The comfortable sound of rain\n\n> Pay attention. Be astonished. Tell about it.\n\nA reminder from [[A little room to think.]]: there is no wrong way to begin.\n\n## This week\n\n- [ ] Take the long way home\n- [ ] Make something with my hands\n- [x] Buy flowers for no reason', '/Journal', ['everyday', 'inspiration'], 1, true),
      note('weekend', 'A slow weekend', '## Leave the calendar a little empty\n\nSaturday: the bookshop on the corner, a good coffee, and nothing that needs to be optimized.\n\nSunday: cook something that takes a little longer. Put on a record. Watch the afternoon change.\n\n### On the table\n\n- Sourdough, if it cooperates\n- The half-finished novel\n- A new idea for [[The analog project]]\n\n**One rule:** put the phone in another room.', '/Journal', ['personal'], 2),
      note('analog', 'The analog project', '## A collection of useful things\n\nAn exploration of everyday objects that ask less of us, and somehow give more back.\n\n### Guiding ideas\n\n1. A thing should be good at being itself.\n2. Materials should look like materials.\n3. Leave something for the imagination.\n\n### Working palette\n\n| Material | Color | Feeling |\n| --- | --- | --- |\n| Uncoated paper | Warm white | Open |\n| Brushed aluminum | Silver gray | Honest |\n| Oak | Honey | Familiar |\n| Canvas | Olive | Quiet |\n\nSee [[Design that gets out of the way]] and [[Field recordings]] for the wider mood.\n\n- [x] Collect references\n- [ ] Sketch three directions\n- [ ] Build a small prototype', '/Projects', ['design', 'work-in-progress'], 0, true),
      note('design', 'Design that gets out of the way', 'Good design is not always the thing you notice. Sometimes it is the thing that lets you notice everything else.\n\n## A short list\n\n- Clear before clever\n- Useful before impressive\n- Enough, instead of more\n- Details that reward attention\n\n> The details are not the details. They make the design.\n\nThis is the starting point for [[The analog project]].\n\n```css\n:root {\n  --space-to-think: 100%;\n  --unnecessary-noise: 0;\n}\n```', '/Notes', ['design', 'inspiration'], 3, true),
      note('field', 'Field recordings', '## A small library of atmosphere\n\nSounds to work alongside, not sounds to work against.\n\n### Rain, near the window\n\nA soft, uneven rhythm. Recorded on a Tuesday afternoon when the room felt especially still.\n\n### The room between songs\n\nThe hum of an amplifier. A chair being pulled out. Someone turning a page.\n\n### Tape notes\n\n- Keep the imperfections\n- Don’t compress the life out of it\n- Leave some silence at the end\n\nOpen **Tempo** to make your own mix of rain, vinyl, soft keys and a warm drone.\n\nRelated: [[The analog project]]', '/Projects', ['sound', 'inspiration'], 4),
      note('reading', 'The reading shelf', '## In good company\n\n| Book | Author | Status |\n| --- | --- | --- |\n| The Creative Act | Rick Rubin | Reading |\n| A Field Guide to Getting Lost | Rebecca Solnit | Next |\n| The Book of Tea | Kakuzō Okakura | Revisit |\n\n## Marginalia\n\nA book becomes your own somewhere between underlining the first sentence and disagreeing with the second.\n\n- [ ] Write one thought after each chapter\n- [x] Keep a pencil nearby\n\nPut stray observations in [[Small things, lately]].', '/Notes', ['books', 'personal'], 5),
      note('today', 'Today, on purpose', '## Just three things\n\n- [ ] Give one thing my full attention\n- [ ] Get outside before the afternoon\n- [ ] Leave the desk a little better than I found it\n\nEverything else is a bonus.\n\n## A thought to keep\n\nThere is a difference between an empty day and a spacious one.', '/Journal', ['everyday'], 0)
    ],
    prefs: clone(defaults),
    canvas: {
      nodes: [
        { id: 'card-1', type: 'note', noteId: 'analog', x: 65, y: 68, color: 'paper' },
        { id: 'card-2', type: 'sticky', title: 'What if it felt a little more human?', body: 'Less interface. More intuition.\nA place you want to come back to.', x: 350, y: 130, color: 'sage' },
        { id: 'card-3', type: 'note', noteId: 'design', x: 86, y: 320, color: 'ochre' },
        { id: 'card-4', type: 'sticky', title: 'Collect, then connect.', body: 'The good ideas tend to find each other.', x: 383, y: 383, color: 'terracotta' }
      ],
      edges: [{ id: 'edge-1', from: 'card-1', to: 'card-2' }, { id: 'edge-2', from: 'card-1', to: 'card-3' }, { id: 'edge-3', from: 'card-3', to: 'card-4' }],
      view: { x: 0, y: 0, zoom: 1 }
    }
  };
}

function cleanNote(note, folders) {
  if (!note || typeof note.id !== 'string' || typeof note.title !== 'string' || typeof note.body !== 'string') return null;
  return { id: note.id, title: note.title.slice(0, 200), body: note.body, folder: folders.includes(note.folder) ? note.folder : '/Notes', tags: [...new Set((Array.isArray(note.tags) ? note.tags : []).filter(t => typeof t === 'string').map(t => t.replace(/^#/, '').slice(0, 40)))], favorite: !!note.favorite, deleted: !!note.deleted, createdAt: Number(note.createdAt) || Date.now(), updatedAt: Number(note.updatedAt) || Date.now() };
}

export function createVFS(storage) {
  let state = seedWorkspace();
  let storageError = '';
  let corrupted = false;
  const subscribers = new Set();
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw) {
      const loaded = JSON.parse(raw);
      if (loaded.version !== 1 || !Array.isArray(loaded.notes) || !Array.isArray(loaded.folders)) throw new Error('Unrecognized workspace');
      const folders = [...new Set(['/Notes', '/Projects', '/Journal', '/Canvas', ...loaded.folders.filter(f => typeof f === 'string' && /^\/[\w /-]+$/.test(f))])];
      const notes = loaded.notes.map(n => cleanNote(n, folders)).filter(Boolean);
      if (notes.length !== loaded.notes.length || new Set(notes.map(n => n.id)).size !== notes.length) throw new Error('Invalid notes in workspace');
      state = { version: 1, folders, notes, prefs: { ...defaults, ...loaded.prefs }, canvas: loaded.canvas && Array.isArray(loaded.canvas.nodes) && Array.isArray(loaded.canvas.edges) ? loaded.canvas : state.canvas };
      state.prefs.theme = ['light', 'dark', 'system'].includes(state.prefs.theme) ? state.prefs.theme : 'light';
      state.prefs.motion = ['smooth', 'system', 'reduced'].includes(state.prefs.motion) ? state.prefs.motion : 'system';
      state.prefs.wallpaper = ['topographic', 'bauhaus', 'herbarium', 'atelier', 'dusk', 'morning', 'dunes', 'seafoam'].includes(state.prefs.wallpaper) || /^custom-[\w-]+$/.test(state.prefs.wallpaper) ? state.prefs.wallpaper : 'topographic';
      state.prefs.accent = /^#[0-9a-f]{6}$/i.test(state.prefs.accent) ? state.prefs.accent : defaults.accent;
      state.prefs.workspace = state.prefs.workspace === 2 ? 2 : 1;
      state.prefs.scratchpad = typeof state.prefs.scratchpad === 'string' ? state.prefs.scratchpad : defaults.scratchpad;
      state.prefs.desktopPositions = state.prefs.desktopPositions && typeof state.prefs.desktopPositions === 'object' ? state.prefs.desktopPositions : {};
      state.canvas.nodes = state.canvas.nodes.filter(n => n && typeof n.id === 'string' && ['note', 'sticky'].includes(n.type)).map(n => ({ ...n, x: Number.isFinite(n.x) ? n.x : 40, y: Number.isFinite(n.y) ? n.y : 40 }));
      const ids = new Set(state.canvas.nodes.map(n => n.id));
      state.canvas.edges = state.canvas.edges.filter(e => e && ids.has(e.from) && ids.has(e.to));
    }
  } catch {
    corrupted = true;
    storageError = 'Your saved workspace could not be read. The original has been kept; this temporary workspace will not overwrite it. Export your work before resetting storage.';
  }
  const emit = event => { for (const fn of subscribers) { try { fn(event); } catch (error) { console.error('Workspace subscriber:', error); } } };
  const persist = event => {
    if (!corrupted) {
      try {
        if (!storage) throw new Error('Storage unavailable');
        storage.setItem(STORAGE_KEY, JSON.stringify(state), event);
        storageError = '';
      } catch { storageError = 'Browser storage is unavailable or full. Your changes are kept in memory only. Export the workspace to keep them.'; }
    }
    emit({ ...event, storageError });
  };
  const api = {
    getState: () => clone(state),
    getStorageError: () => storageError,
    getStorageStatus: () => ({ pending: !!storage?.getStatus?.().pending, error: storageError }),
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    listNotes(filter = {}) {
      if (typeof filter === 'string') filter = { query: filter };
      const query = String(filter.query || '').toLowerCase();
      return state.notes.filter(n => (filter.trash || filter.folder === '/Trash' ? n.deleted : !n.deleted) && (!filter.folder || filter.folder === '/Trash' || n.folder === filter.folder) && (!filter.favorite || n.favorite) && (!filter.tag || n.tags.includes(filter.tag)) && (!query || `${n.title}\n${n.body}\n${n.tags.join(' ')}`.toLowerCase().includes(query))).sort((a, b) => filter.sort === 'title' ? a.title.localeCompare(b.title) : b.updatedAt - a.updatedAt).map(clone);
    },
    getNote: id => { const note = state.notes.find(n => n.id === id); return note ? clone(note) : null; },
    findNoteByTitle: title => { const note = state.notes.find(n => !n.deleted && n.title.toLowerCase() === String(title).toLowerCase()); return note ? clone(note) : null; },
    createNote(data = {}) {
      const note = cleanNote({ id: uid(), title: data.title || 'Untitled note', body: data.body || '', folder: data.folder || '/Notes', tags: data.tags || [], favorite: false, createdAt: Date.now(), updatedAt: Date.now(), ...data, deleted: false }, state.folders);
      if (!note || state.notes.some(n => n.id === note.id)) throw new Error('Invalid note');
      state.notes.unshift(note); persist({ type: 'notes', id: note.id, action: 'create' }); return clone(note);
    },
    updateNote(id, patch) {
      const index = state.notes.findIndex(n => n.id === id);
      if (index < 0) return null;
      const note = cleanNote({ ...state.notes[index], ...patch, id, updatedAt: Date.now() }, state.folders);
      if (!note) throw new Error('Invalid note update');
      state.notes[index] = note; persist({ type: 'notes', id, action: 'update' }); return clone(note);
    },
    deleteNote(id) { return api.updateNote(id, { deleted: true }); },
    restoreNote(id) { return api.updateNote(id, { deleted: false }); },
    duplicateNote(id) { const n = api.getNote(id); return n ? api.createNote({ title: `${n.title} — copy`, body: n.body, tags: n.tags, folder: n.folder }) : null; },
    purgeTrash() {
      const removed = new Set(state.notes.filter(n => n.deleted).map(n => n.id));
      state.notes = state.notes.filter(n => !n.deleted);
      state.canvas.nodes = state.canvas.nodes.filter(n => !removed.has(n.noteId));
      const ids = new Set(state.canvas.nodes.map(n => n.id));
      state.canvas.edges = state.canvas.edges.filter(e => ids.has(e.from) && ids.has(e.to));
      persist({ type: 'reset' });
    },
    getBacklinks(id) {
      const note = api.getNote(id);
      if (!note) return [];
      return state.notes.filter(n => !n.deleted && n.id !== id && [...n.body.matchAll(/\[\[([^\]]+)\]\]/g)].some(m => m[1].toLowerCase() === note.title.toLowerCase())).map(clone);
    },
    getAllTags() { return [...new Set(state.notes.filter(n => !n.deleted).flatMap(n => n.tags))].sort(); },
    getFolders: () => [...state.folders],
    createFolder(name) {
      const folder = '/' + String(name).trim().replace(/^\/+|\/+$/g, '');
      if (!/^\/[\w -]{1,50}$/.test(folder)) throw new Error('Use letters, numbers, spaces or dashes.');
      if (state.folders.includes(folder) || folder === '/Trash') throw new Error('That folder already exists.');
      state.folders.push(folder); persist({ type: 'folders' }); return folder;
    },
    getCanvas: () => clone(state.canvas),
    saveCanvas(nodes, edges, view) {
      const ids = new Set(nodes.map(n => n.id));
      state.canvas = { nodes: clone(nodes), edges: clone(edges.filter(e => ids.has(e.from) && ids.has(e.to) && e.from !== e.to)), view: clone(view || state.canvas.view || { x: 0, y: 0, zoom: 1 }) };
      persist({ type: 'canvas' });
    },
    getPrefs: () => clone(state.prefs),
    setPrefs(patch) { state.prefs = { ...state.prefs, ...clone(patch) }; persist({ type: 'prefs', keys: Object.keys(patch) }); },
    resetVFS() { corrupted = false; state = seedWorkspace(); persist({ type: 'reset' }); },
    importWorkspace(workspace) {
      const raw = typeof workspace === 'string' ? workspace : JSON.stringify(workspace);
      const probeStorage = { getItem: key => key === STORAGE_KEY ? raw : null, setItem() {} };
      const probe = createVFS(probeStorage);
      if (probe.getStorageError()) throw new Error('That backup is not a valid Notes OS workspace.');
      state = probe.getState(); corrupted = false; persist({ type: 'import' }); return clone(state);
    },
    exportWorkspaceJSON: () => JSON.stringify(state, null, 2)
  };
  if (storage?.subscribeExternal) storage.subscribeExternal(raw => {
    try {
      const probe = createVFS({ getItem: key => key === STORAGE_KEY ? raw : null, setItem() {} });
      if (probe.getStorageError()) return;
      const incoming = probe.getState();
      if (equalData(state, incoming)) return;
      state = incoming;
      emit({ type: 'reset', external: true, storageError });
    } catch (error) { storageError = `Another tab changed the workspace, but the update could not be read: ${error.message}`; emit({ type: 'storage', storageError }); }
  });
  if (storage?.subscribeStatus) storage.subscribeStatus(status => {
    storageError = status.error ? `Shared extension storage could not save the latest change: ${status.error}` : '';
    emit({ type: 'storage', pending: status.pending, storageError });
  });
  return api;
}
let storage;
if (globalThis.chrome?.storage?.local && globalThis.chrome?.runtime?.id) {
  try { const { createExtensionStorage } = await import('./workspace-storage.js'); storage = await createExtensionStorage(seedWorkspace()); }
  catch (error) { console.error(error); storage = null; }
} else {
  try { storage = globalThis.localStorage; } catch { storage = null; }
}
export const vfs = createVFS(storage);
export const extensionStorage = storage?.flush ? storage : null;
