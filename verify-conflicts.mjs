import assert from 'node:assert/strict';
import { createVFS, seedWorkspace } from './js/vfs.js';
import { mergeWorkspaceCommit } from './js/workspace-controller.js';
import { createExtensionStorage, STORAGE_KEY } from './js/workspace-storage.js';
import { createExtensionHarness } from './tests/extension-harness.js';

export function storageRoundtrip(value) {
  if (Array.isArray(value)) return value.map(storageRoundtrip);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, storageRoundtrip(value[key])]));
  return value;
}

export function createCommitHarness(seed = seedWorkspace()) {
  let record = { workspace: storageRoundtrip(seed), revision: 1 }, clock = 10000;
  const listeners = new Set(), requests = [];
  const broadcast = () => {
    for (const listener of listeners) listener({ notesOsWorkspace: { newValue: storageRoundtrip(record) } }, 'local');
  };
  return {
    chrome: {
      storage: { local: {}, onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } },
      runtime: { sendMessage(message) {
        if (message.type === 'WORKSPACE_GET') return Promise.resolve(storageRoundtrip(record));
        return new Promise((resolve, reject) => requests.push({ message: structuredClone(message), resolve, reject }));
      } }
    },
    requests,
    commit(index = requests.length - 1, { publish = true, respond = true } = {}) {
      const request = requests[index];
      if (request.result) throw new Error('This request was already committed.');
      const workspace = mergeWorkspaceCommit({ current: record.workspace, incoming: request.message.workspace, base: request.message.baseWorkspace, events: request.message.events, now: ++clock });
      record = storageRoundtrip({ workspace, revision: record.revision + 1 });
      request.result = structuredClone(record);
      if (publish) broadcast();
      if (respond) request.resolve(structuredClone(request.result));
      return structuredClone(record);
    },
    respond(index) { requests[index].resolve(structuredClone(requests[index].result)); },
    get record() { return structuredClone(record); }
  };
}

const byId = (state, id = 'welcome') => state.notes.find(note => note.id === id);
const recovered = state => state.notes.filter(note => note.id.includes('-recovered-'));
const change = (state, patch, id = 'welcome') => { const next = structuredClone(state); Object.assign(byId(next, id), patch); return next; };

export async function verifyConflicts(check) {
  check('Reordered JSON keys are not a note conflict', () => {
    const base = seedWorkspace(); base.notes[0].body = 'H';
    const current = storageRoundtrip(base), incoming = change(base, { body: 'He', updatedAt: base.notes[0].updatedAt + 1 });
    const result = mergeWorkspaceCommit({ current, incoming, base, events: [{ type: 'notes', id: 'welcome' }] });
    assert.equal(byId(result).body, 'He');
    assert.equal(result.notes.length, base.notes.length);
  });
  check('Timestamp-only changes do not create recovered notes', () => {
    const base = seedWorkspace(), current = change(base, { updatedAt: 98765 }), incoming = change(base, { body: 'My new words', updatedAt: 98766 });
    const result = mergeWorkspaceCommit({ current, incoming, base, events: [{ type: 'notes', id: 'welcome' }] });
    assert.equal(byId(result).body, 'My new words'); assert.equal(recovered(result).length, 0);
  });
  check('Body edits and favorite changes merge independently on the same note', () => {
    const base = seedWorkspace(), current = change(base, { favorite: !byId(base).favorite }), incoming = change(base, { body: 'Still the same note' });
    const result = mergeWorkspaceCommit({ current, incoming, base, events: [{ type: 'notes', id: 'welcome' }] });
    assert.equal(byId(result).body, 'Still the same note'); assert.equal(byId(result).favorite, byId(current).favorite); assert.equal(recovered(result).length, 0);
  });
  check('An unrelated stale snapshot cannot overwrite a previously saved note', () => {
    const base = seedWorkspace(), current = change(base, { body: 'Saved in another tab' }, 'analog');
    const incoming = change(base, { body: 'Local words' });
    const result = mergeWorkspaceCommit({ current, incoming, base: current, events: [{ type: 'notes', id: 'welcome' }] });
    assert.equal(byId(result, 'analog').body, 'Saved in another tab'); assert.equal(byId(result).body, 'Local words');
  });

  const stores = [];
  try {
    const seed = seedWorkspace(); seed.notes[0].body = '';
    const harness = createCommitHarness(seed);
    const store = await createExtensionStorage(seed, harness.chrome); stores.push(store);
    const local = createVFS(store);
    const text = 'Every letter stays in this one note.';
    let body = '', resetCount = 0;
    local.subscribe(event => { if (event.external) resetCount++; });
    for (const letter of text) {
      body += letter; local.updateNote('welcome', { body });
      const flush = store.flush(); harness.commit(); await flush;
      assert.equal(byId(harness.record.workspace).body, body);
      assert.equal(local.getNote('welcome').body, body);
      assert.equal(recovered(harness.record.workspace).length, 0);
      assert.equal(harness.record.workspace.notes.length, seed.notes.length);
    }
    check('Actual merged and serialized saves never recover each keystroke', () => {
      assert.equal(byId(harness.record.workspace).body, text); assert.equal(resetCount, 0); assert.equal(local.listNotes().length, seed.notes.length);
    });

    const concurrent = createCommitHarness(seed);
    const storeA = await createExtensionStorage(seed, concurrent.chrome), storeB = await createExtensionStorage(seed, concurrent.chrome);
    stores.push(storeA, storeB);
    const a = createVFS(storeA), b = createVFS(storeB);
    a.updateNote('welcome', { body: 'A' }); const saveA = storeA.flush();
    concurrent.commit(0, { respond: false });
    b.updateNote('analog', { body: 'Other tab stays intact' }); const saveB = storeB.flush(); concurrent.commit(1); await saveB;
    a.updateNote('welcome', { body: 'AB' }); concurrent.respond(0); await saveA;
    a.updateNote('welcome', { body: 'ABC' }); const saveC = storeA.flush(); concurrent.commit(2); await saveC;
    check('Typing during a slow acknowledgement preserves both tabs without copies', () => {
      assert.equal(byId(concurrent.record.workspace).body, 'ABC');
      assert.equal(byId(concurrent.record.workspace, 'analog').body, 'Other tab stays intact');
      assert.equal(recovered(concurrent.record.workspace).length, 0);
      assert.equal(a.getNote('welcome').body, 'ABC'); assert.equal(b.getNote('welcome').body, 'ABC');
    });

    a.updateNote('welcome', { body: 'ABCD' }); const saveD = storeA.flush(); concurrent.commit(3, { respond: false });
    a.updateNote('welcome', { body: 'ABCDE' }); concurrent.respond(3); await saveD;
    const saveE = storeA.flush(); concurrent.commit(4); await saveE;
    check('Consecutive in-flight edits do not generate nested recovery copies', () => {
      assert.equal(byId(concurrent.record.workspace).body, 'ABCDE'); assert.equal(recovered(concurrent.record.workspace).length, 0);
      assert.equal(JSON.parse(storeA.getItem(STORAGE_KEY)).notes.length, seed.notes.length);
    });
    const serviceHarness = createExtensionHarness();
    const pageA = serviceHarness.createPage(), pageB = serviceHarness.createPage();
    const serviceA = await createExtensionStorage(seed, pageA), serviceB = await createExtensionStorage(seed, pageB);
    stores.push(serviceA, serviceB);
    const writer = createVFS(serviceA), peer = createVFS(serviceB);
    for (let index = 0; index < 30; index++) {
      writer.updateNote('welcome', { body: `Single note, save ${index}` });
      peer.updateNote('analog', { body: `Other tab, save ${index}` });
      await Promise.all([serviceA.flush(), serviceB.flush()]);
    }
    check('Two tabs through the real service keep stable IDs after 60 saves', () => {
      assert.equal(serviceHarness.record.workspace.notes.length, seed.notes.length);
      assert.equal(recovered(serviceHarness.record.workspace).length, 0);
      assert.equal(byId(serviceHarness.record.workspace).body, 'Single note, save 29');
      assert.equal(byId(serviceHarness.record.workspace, 'analog').body, 'Other tab, save 29');
      assert.equal(writer.getNote('welcome').body, 'Single note, save 29');
      assert.equal(peer.getNote('welcome').body, 'Single note, save 29');
    });
    writer.updateNote('welcome', { body: 'Competing A' });
    peer.updateNote('welcome', { body: 'Competing B' });
    await serviceA.flush(); await serviceB.flush();
    const copiesAfterConflict = recovered(serviceHarness.record.workspace);
    check('A genuine conflict preserves the other text and keeps the writer on its original ID', () => {
      assert.equal(byId(serviceHarness.record.workspace).body, 'Competing B');
      assert.equal(copiesAfterConflict.length, 1); assert.equal(copiesAfterConflict[0].body, 'Competing A');
    });
    for (const body of ['Competing B continues', 'Competing B continues normally']) { peer.updateNote('welcome', { body }); await serviceB.flush(); }
    check('Continuing after one genuine conflict does not recover every following letter', () => {
      assert.equal(byId(serviceHarness.record.workspace).body, 'Competing B continues normally');
      assert.equal(recovered(serviceHarness.record.workspace).length, 1);
      assert.equal(byId(serviceHarness.record.workspace).deleted, false);
    });
    const existingRecovery = copiesAfterConflict[0];
    writer.updateNote(existingRecovery.id, { body: 'The saved alternate is still editable' }); await serviceA.flush();
    check('Existing recovered notes remain intact and editable', () => {
      assert.equal(byId(serviceHarness.record.workspace, existingRecovery.id).body, 'The saved alternate is still editable');
      assert.equal(recovered(serviceHarness.record.workspace).length, 1);
    });
    serviceHarness.failNextWrite();
    peer.updateNote('today', { body: 'Kept through a failed save' }); await serviceB.flush();
    assert(serviceB.getStatus().error);
    peer.updateNote('today', { body: 'Kept through a failed save and continued' });
    await serviceB.flush(); await serviceB.flush();
    check('The service queue recovers from write errors without duplicating or dropping text', () => {
      assert.equal(serviceB.getStatus().error, '');
      assert.equal(byId(serviceHarness.record.workspace, 'today').body, 'Kept through a failed save and continued');
      assert.equal(recovered(serviceHarness.record.workspace).length, 1);
    });
    serviceHarness.loseNextResponse();
    peer.updateNote('today', { body: 'One committed draft' }); await serviceB.flush();
    assert(serviceB.getStatus().error);
    const committedRevision = serviceHarness.record.revision;
    serviceHarness.restart();
    await serviceB.flush();
    check('A lost acknowledgement retried after worker restart is idempotent', () => {
      assert.equal(serviceHarness.record.revision, committedRevision);
      assert.equal(byId(serviceHarness.record.workspace, 'today').body, 'One committed draft');
      assert.equal(serviceB.getStatus().error, '');
      assert.equal(recovered(serviceHarness.record.workspace).length, 1);
    });
  } finally { stores.forEach(store => store.destroy()); }
}
