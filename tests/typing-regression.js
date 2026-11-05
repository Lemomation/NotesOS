import { createExtensionStorage } from '../js/workspace-storage.js';
import { createVFS, seedWorkspace } from '../js/vfs.js';
import { mountNotesApp } from '../js/apps/notes-studio.js';

const host = document.getElementById('editor-test'), output = document.getElementById('results');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let app, storage;
document.getElementById('run').addEventListener('click', async () => {
  app?.destroy(); storage?.destroy();
  let record = { workspace: seedWorkspace(), revision: 1 }, resets = 0, saves = 0;
  record.workspace.notes.find(n => n.id === 'welcome').body = '';
  const listeners = new Set();
  const broadcast = value => listeners.forEach(fn => fn({ notesOsWorkspace: { newValue: structuredClone(value) } }, 'local'));
  const chrome = {
    storage: { local: {}, onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } },
    runtime: { async sendMessage(message) {
      if (message.type === 'WORKSPACE_GET') return structuredClone(record);
      await wait(20);
      record = { workspace: structuredClone(message.workspace), revision: record.revision + 1 };
      broadcast(record);
      await wait(10);
      saves++;
      return structuredClone(record);
    } }
  };
  output.textContent = 'Testing actual editor DOM against simulated Edge save notifications…';
  try {
    storage = await createExtensionStorage(record.workspace, chrome);
    const vfs = createVFS(storage);
    storage.subscribeExternal(() => resets++);
    app = mountNotesApp(host, { vfs, options: {}, notify() {}, dialog: async () => null });
    host.querySelector('[data-mode="write"]').click();
    const input = host.querySelector('.note-source');
    input.focus();
    for (const letter of 'Typing stays focused.') {
      input.setRangeText(letter, input.selectionStart, input.selectionEnd, 'end');
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: letter, inputType: 'insertText' }));
      await wait(180);
      assert(document.activeElement === input, 'Body editor lost focus after saving ' + letter);
      assert(input === host.querySelector('.note-source'), 'Body editor was replaced during own save');
      assert(input.selectionStart === input.value.length, 'Caret moved after saving');
    }
    assert(resets === 0, 'Save echoes were delivered as external resets');
    assert(saves >= 20, 'The test did not cross enough save boundaries');
    assert(record.workspace.notes.find(n => n.id === 'welcome').body === input.value, 'Saved text differs from typed text');
    input.setSelectionRange(4, 11, 'backward');
    record.workspace.notes.find(n => n.id === 'analog').body = 'Another tab edited another note';
    record.revision++; broadcast(record); await wait(20);
    assert(document.activeElement === input && host.querySelector('.note-source') === input, 'Unrelated remote change replaced the editor');
    assert(input.selectionStart === 4 && input.selectionEnd === 11, 'Selection lost after remote change');
    record.workspace.notes.find(n => n.id === 'welcome').body += ' Remote suffix.';
    record.revision++; broadcast(record); await wait(20);
    const updated = host.querySelector('.note-source');
    assert(document.activeElement === updated, 'Changed remote note lost focus');
    assert(updated.selectionStart === 4 && updated.selectionEnd === 11 && updated.selectionDirection === 'backward', 'Changed remote note lost selection');
    const title = host.querySelector('.note-title'); title.focus(); title.select();
    for (const letter of 'Stable title') {
      title.setRangeText(letter, title.selectionStart, title.selectionEnd, 'end');
      title.dispatchEvent(new InputEvent('input', { bubbles: true, data: letter }));
      await wait(180);
      assert(document.activeElement === title && title === host.querySelector('.note-title'), 'Title lost focus after saving');
    }
    output.textContent = JSON.stringify({ result: 'PASS', saves, ownSaveResets: resets - 2, checks: ['body typing across each autosave', 'same textarea DOM node', 'caret stays at insertion point', 'unrelated remote update preserves selection', 'changed remote note preserves focus and backward selection', 'title typing across each autosave', 'saved contents match'], storageError: vfs.getStorageError() }, null, 2);
  } catch (error) { output.textContent = 'FAIL: ' + error.stack; }
});
