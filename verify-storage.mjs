import assert from 'node:assert/strict';
import { createExtensionStorage, STORAGE_KEY } from './js/workspace-storage.js';
import { createVFS, seedWorkspace } from './js/vfs.js';

export function mockExtensionChrome(seed = seedWorkspace()) {
  let record = { workspace: structuredClone(seed), revision: 1 };
  const listeners = new Set();
  const commits = [];
  const emit = next => {
    record = structuredClone(next);
    for (const fn of listeners) fn({ notesOsWorkspace: { newValue: structuredClone(record) } }, 'local');
  };
  return {
    api: {
      storage: { local: {}, onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } },
      runtime: { sendMessage(message) {
        if (message.type === 'WORKSPACE_GET') return Promise.resolve(structuredClone(record));
        return new Promise((resolve, reject) => commits.push({ message: structuredClone(message), resolve, reject }));
      } }
    },
    commits, emit,
    acknowledge(commit, { broadcast = 'before', workspace = commit.message.workspace } = {}) {
      const next = { workspace: structuredClone(workspace), revision: record.revision + 1 };
      if (broadcast === 'before') emit(next); else record = structuredClone(next);
      commit.resolve(structuredClone(next));
      return next;
    },
    get record() { return structuredClone(record); }
  };
}

export async function verifyStorage(check) {
  const original = globalThis.chrome;
  const stores = [];
  try {
    const fake = mockExtensionChrome(); globalThis.chrome = fake.api;
    const storage = await createExtensionStorage(fake.record.workspace); stores.push(storage);
    const vfs = createVFS(storage), updates = [];
    storage.subscribeExternal(raw => updates.push(JSON.parse(raw)));
    for (const body of ['a', 'ab', 'abc']) {
      vfs.updateNote('welcome', { body });
      const saved = storage.flush();
      fake.acknowledge(fake.commits.at(-1));
      await saved;
    }
    check('Own save notifications never reset the editor', () => {
      assert.equal(updates.length, 0, 'Own storage.onChanged echo was delivered as an external workspace reset');
      assert.equal(vfs.getNote('welcome').body, 'abc');
      assert.equal(fake.record.workspace.notes.find(note => note.id === 'welcome').body, 'abc');
    });
    vfs.updateNote('welcome', { body: 'abcd' });
    const fourth = storage.flush();
    const delayed = fake.acknowledge(fake.commits.at(-1), { broadcast: 'after' });
    await fourth; fake.emit(delayed);
    check('Late acknowledgements are ignored after their revision is saved', () => assert.equal(updates.length, 0));

    const newest = fake.record; newest.revision += 2;
    newest.workspace.notes.find(note => note.id === 'analog').body = 'Updated in another tab';
    fake.emit(newest); fake.emit(delayed);
    check('Real newer changes sync and older notifications cannot roll them back', () => {
      assert.equal(updates.length, 1);
      assert.equal(vfs.getNote('analog').body, 'Updated in another tab');
      assert.equal(vfs.getNote('welcome').body, 'abcd');
    });

    const second = mockExtensionChrome(); globalThis.chrome = second.api;
    const pendingStore = await createExtensionStorage(second.record.workspace); stores.push(pendingStore);
    const pendingVfs = createVFS(pendingStore), pendingUpdates = [];
    pendingStore.subscribeExternal(raw => pendingUpdates.push(JSON.parse(raw)));
    pendingVfs.updateNote('welcome', { body: 'first' });
    const firstFlush = pendingStore.flush();
    pendingVfs.updateNote('welcome', { body: 'first plus more typing' });
    const response = second.acknowledge(second.commits[0]);
    await firstFlush;
    check('Typing during a slow save is not overwritten by its response', () => {
      assert.equal(JSON.parse(pendingStore.getItem(STORAGE_KEY)).notes.find(n => n.id === 'welcome').body, 'first plus more typing');
      assert.equal(pendingVfs.getNote('welcome').body, 'first plus more typing');
      assert.equal(pendingUpdates.length, 0);
    });
    const nextFlush = pendingStore.flush();
    second.emit(response);
    second.acknowledge(second.commits.at(-1)); await nextFlush;
    check('The next save persists all letters without replaying a stale echo', () => {
      assert.equal(second.record.workspace.notes.find(n => n.id === 'welcome').body, 'first plus more typing');
      assert.equal(pendingUpdates.length, 0);
      assert.equal(pendingVfs.getNote('welcome').body, 'first plus more typing');
    });
  } finally {
    for (const storage of stores) storage.destroy?.();
    if (original === undefined) delete globalThis.chrome; else globalThis.chrome = original;
  }
}
