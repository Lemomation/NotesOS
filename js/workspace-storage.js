import { equalData } from './workspace-controller.js';
import { uid } from './utils.js';

export const STORAGE_KEY = 'notes-os.workspace.v1';

const delay = 120;
const clone = value => structuredClone(value);

export async function createExtensionStorage(seed, chrome = globalThis.chrome) {
  if (!chrome?.storage?.local || !chrome?.runtime?.sendMessage) throw new Error('Edge extension storage is unavailable.');
  const initial = await chrome.runtime.sendMessage({ type: 'WORKSPACE_GET', seed });
  if (!initial?.workspace) throw new Error(initial?.error || 'Could not open the shared workspace.');
  let raw = JSON.stringify(initial.workspace), revision = initial.revision || 0;
  let timer = null, inFlight = null, pending = null, retryBatch = null, queuedRemote = null, error = '', disposed = false;
  const external = new Set(), status = new Set();
  const announce = () => status.forEach(fn => fn({ pending: !!timer || !!inFlight || !!pending || !!retryBatch, error }));
  const publish = workspace => {
    if (disposed || equalData(JSON.parse(raw), workspace)) return;
    raw = JSON.stringify(workspace);
    external.forEach(fn => fn(raw));
  };
  function acceptRemote(record) {
    if (!record?.workspace || record.revision <= revision) return;
    revision = record.revision;
    publish(record.workspace);
  }
  function schedule() {
    if (disposed) return;
    clearTimeout(timer); timer = setTimeout(() => { void flush(); }, delay); announce();
  }
  function flush() {
    clearTimeout(timer); timer = null;
    if (disposed) return Promise.resolve();
    if (inFlight) return inFlight.then(() => error ? undefined : flush());
    if (!pending && !retryBatch) return Promise.resolve();
    const batch = retryBatch || pending;
    if (retryBatch) retryBatch = null;
    else pending = null;
    // Keep the exact draft this batch started from. An acknowledgement must not become
    // the baseline for edits that were already typed against an earlier version.
    const request = new Promise(resolve => resolve(chrome.runtime.sendMessage({ type: 'WORKSPACE_COMMIT', commitId: batch.id, baseRevision: batch.revision, baseWorkspace: batch.base, workspace: batch.workspace, events: batch.events })));
    inFlight = (async () => {
      let succeeded = false;
      try {
        const result = await request;
        if (!result?.workspace) throw new Error(result?.error || 'The workspace could not be saved.');
        revision = Math.max(revision, result.revision); error = '';
        if (!pending) publish(result.workspace);
        if (queuedRemote?.revision <= revision) queuedRemote = null;
        succeeded = true;
      } catch (reason) {
        error = reason?.message || String(reason);
        // Retry the same operation before sending later letters. A lost response may
        // already have committed it; merging that retry with a new draft invents a conflict.
        retryBatch = batch;
        clearTimeout(timer); timer = null;
      }
      inFlight = null;
      if (pending && succeeded) schedule();
      else if (!pending && !retryBatch && queuedRemote) {
        const remote = queuedRemote; queuedRemote = null;
        acceptRemote(remote);
      }
      announce();
    })();
    announce();
    return inFlight;
  }
  const onChanged = (changes, area) => {
    const record = area === 'local' && changes.notesOsWorkspace?.newValue;
    if (!record?.workspace || record.revision <= revision || disposed) return;
    if (timer || inFlight || pending || retryBatch) {
      if (!queuedRemote || record.revision > queuedRemote.revision) queuedRemote = clone(record);
    } else acceptRemote(record);
  };
  chrome.storage.onChanged.addListener(onChanged);
  return {
    getItem(key) { return key === STORAGE_KEY ? raw : null; },
    setItem(key, value, event = { type: 'reset' }) {
      if (key !== STORAGE_KEY || disposed) return;
      const workspace = JSON.parse(value);
      pending ||= { id: uid(), base: JSON.parse(raw), revision, workspace, events: [] };
      pending.workspace = workspace; pending.events.push(clone(event)); raw = value;
      schedule();
    },
    getStatus: () => ({ pending: !!timer || !!inFlight || !!pending || !!retryBatch, error }),
    subscribeExternal(fn) { external.add(fn); return () => external.delete(fn); },
    subscribeStatus(fn) { status.add(fn); return () => status.delete(fn); },
    flush,
    destroy() { disposed = true; clearTimeout(timer); chrome.storage.onChanged.removeListener?.(onChanged); external.clear(); status.clear(); }
  };
}
