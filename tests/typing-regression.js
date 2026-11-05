import { createExtensionStorage } from '../js/workspace-storage.js';
import { createVFS, seedWorkspace } from '../js/vfs.js';
import { mountNotesApp } from '../js/apps/notes-studio.js';
import { createExtensionHarness } from './extension-harness.js';

const host = document.getElementById('editor-test'), output = document.getElementById('results');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let app, storage, otherStorage;

document.getElementById('run').addEventListener('click', async () => {
  const button = document.getElementById('run'); button.disabled = true;
  app?.destroy(); storage?.destroy(); otherStorage?.destroy();
  const seed = seedWorkspace(); seed.notes.find(n => n.id === 'welcome').body = '';
  const harness = createExtensionHarness({ requestDelay: 15, responseDelay: 55 });
  output.textContent = 'Testing the real editor + storage adapter + service + merge logic across two simulated tabs…';
  try {
    storage = await createExtensionStorage(seed, harness.createPage());
    otherStorage = await createExtensionStorage(seed, harness.createPage());
    const vfs = createVFS(storage), other = createVFS(otherStorage);
    app = mountNotesApp(host, { vfs, options: {}, notify() {}, dialog: async () => null });
    host.querySelector('[data-mode="write"]').click();
    const input = host.querySelector('.note-source'); input.focus();
    const originalIds = vfs.getState().notes.map(n => n.id).sort().join(',');
    const stable = () => {
      const stored = harness.record.workspace;
      assert(stored.notes.map(n => n.id).sort().join(',') === originalIds, 'An ordinary save created or deleted a note');
      assert(!stored.notes.some(n => n.id.includes('-recovered-')), 'Typing generated a false recovered copy');
    };
    const type = letter => {
      assert(document.activeElement === input && input === host.querySelector('.note-source'), 'Editor focus/DOM identity changed');
      input.setRangeText(letter, input.selectionStart, input.selectionEnd, 'end');
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: letter, inputType: 'insertText' }));
    };
    for (const letter of 'Typing stays in one note.') {
      type(letter);
      other.updateNote('analog', { body: 'Independent edit: ' + input.value });
      await Promise.all([storage.flush(), otherStorage.flush()]);
      assert(document.activeElement === input, 'Editor lost focus after save');
      assert(input.selectionStart === input.value.length, 'Caret moved after save');
      stable();
    }
    for (const pair of [' A', 'nd', ' f', 'as', 't ', 'to', 'o.']) {
      type(pair[0]); const saving = storage.flush();
      await wait(5); type(pair.slice(1));
      await saving; await storage.flush(); stable();
      assert(document.activeElement === input, 'An in-flight edit lost focus');
    }
    const typedBody = input.value;
    assert(harness.record.workspace.notes.find(n => n.id === 'welcome').body === typedBody, 'Saved body differs from typed text');
    input.setSelectionRange(4, 11, 'backward');
    other.updateNote('analog', { body: 'Unrelated remote update' }); await otherStorage.flush();
    assert(document.activeElement === input && host.querySelector('.note-source') === input, 'Unrelated note update rebuilt the active input');
    assert(input.selectionStart === 4 && input.selectionEnd === 11, 'Remote update lost selection');
    other.updateNote('welcome', { favorite: false }); await otherStorage.flush();
    const updated = host.querySelector('.note-source');
    assert(document.activeElement === updated, 'Same-note metadata update lost focus');
    assert(updated.selectionStart === 4 && updated.selectionEnd === 11 && updated.selectionDirection === 'backward', 'Same-note update lost backward selection');
    const title = host.querySelector('.note-title'); title.focus(); title.select();
    for (const letter of 'Stable title') {
      title.setRangeText(letter, title.selectionStart, title.selectionEnd, 'end');
      title.dispatchEvent(new InputEvent('input', { bubbles: true, data: letter }));
      await storage.flush(); stable();
      assert(document.activeElement === title && title === host.querySelector('.note-title'), 'Title lost focus during save');
    }
    const expectedTitle = title.value;
    storage.destroy(); otherStorage.destroy(); harness.restart();
    const reopened = await createExtensionStorage(seed, harness.createPage());
    const reloaded = createVFS(reopened); reopened.destroy();
    assert(reloaded.getNote('welcome').body === typedBody && reloaded.getNote('welcome').title === expectedTitle, 'Restart lost saved text');
    assert(reloaded.listNotes().length === seed.notes.length, 'Note count changed on restart');
    output.textContent = JSON.stringify({ result: 'PASS', commits: harness.commits, notesBefore: seed.notes.length, notesAfter: reloaded.listNotes().length, unexpectedRecoveredCopies: 0, checks: ['real service and merge logic, serialized object keys', 'two tabs editing independently', 'slow overlapping saves', 'same textarea DOM node', 'body and title retain focus', 'caret and backward selection preserved', 'stable original note IDs', 'text persists after service restart'], storageError: vfs.getStorageError() }, null, 2);
  } catch (error) { output.textContent = 'FAIL: ' + error.stack; }
  finally { button.disabled = false; }
});
