import { mergeWorkspaceCommit } from './workspace-controller.js';

export const STORAGE_KEY = 'notes-os.workspace.v1';

const delay = 120;
const clone = value => structuredClone(value);
const runtimeError = () => globalThis.chrome?.runtime?.lastError?.message || '';

export async function createExtensionStorage(seed, chrome = globalThis.chrome) {
  if (!chrome?.storage?.local || !chrome?.runtime?.sendMessage) throw new Error('Edge extension storage is unavailable.');
  const initial = await chrome.runtime.sendMessage({ type: 'WORKSPACE_GET', seed });
  if (!initial?.workspace) throw new Error(initial?.error || runtimeError() || 'Could not open the shared workspace.');
  let raw = JSON.stringify(initial.workspace), committed = clone(initial.workspace), revision = initial.revision || 0;
  let timer = null, writing = false, pendingWorkspace = null, pendingEvents = [], queuedRemote = null, error = '', disposed = false;
  const external = new Set(), status = new Set();
  const announce = () => status.forEach(fn => fn({ pending: !!timer || writing || !!pendingWorkspace, error }));
  const publish = workspace => {
    const next = JSON.stringify(workspace);
    if (next === raw || disposed) return;
    raw = next;
    external.forEach(fn => fn(next));
  };
  function acceptRemote(record) {
    if (!record?.workspace || record.revision <= revision) return;
    revision = record.revision; committed = clone(record.workspace);
    publish(record.workspace);
  }
  async function flush() {
    clearTimeout(timer); timer = null;
    if (writing || !pendingWorkspace || disposed) return;
    writing = true;
    const workspace = pendingWorkspace, events = pendingEvents;
    pendingWorkspace = null; pendingEvents = [];
    announce();
    let succeeded = false;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'WORKSPACE_COMMIT', baseRevision: revision, baseWorkspace: committed, workspace, events });
      if (!result?.workspace) throw new Error(result?.error || runtimeError() || 'The workspace could not be saved.');
      revision = result.revision; committed = clone(result.workspace); error = '';
      // Rebase only edits made during this request; never replace the active draft with an older acknowledgement.
      if (pendingWorkspace) pendingWorkspace = mergeWorkspaceCommit({ current: committed, incoming: pendingWorkspace, base: workspace, events: pendingEvents });
      else publish(committed);
      if (queuedRemote?.revision <= revision) queuedRemote = null;
      succeeded = true;
    } catch (reason) {
      error = reason?.message || String(reason);
      pendingWorkspace ||= workspace;
      pendingEvents = [...events, ...pendingEvents];
    }
    writing = false;
    if (pendingWorkspace && succeeded) schedule();
    else if (!pendingWorkspace && queuedRemote) {
      const remote = queuedRemote; queuedRemote = null;
      acceptRemote(remote);
    }
    announce();
  }
  function schedule() {
    if (disposed) return;
    clearTimeout(timer); timer = setTimeout(flush, delay); announce();
  }
  const onChanged = (changes, area) => {
    const record = area === 'local' && changes.notesOsWorkspace?.newValue;
    if (!record?.workspace || record.revision <= revision || disposed) return;
    if (timer || writing || pendingWorkspace) {
      if (!queuedRemote || record.revision > queuedRemote.revision) queuedRemote = clone(record);
    } else acceptRemote(record);
  };
  chrome.storage.onChanged.addListener(onChanged);
  return {
    getItem(key) { return key === STORAGE_KEY ? raw : null; },
    setItem(key, value, event = { type: 'reset' }) {
      if (key !== STORAGE_KEY || disposed) return;
      raw = value; pendingWorkspace = JSON.parse(value); pendingEvents.push(clone(event)); schedule();
    },
    getStatus: () => ({ pending: !!timer || writing || !!pendingWorkspace, error }),
    subscribeExternal(fn) { external.add(fn); return () => external.delete(fn); },
    subscribeStatus(fn) { status.add(fn); return () => status.delete(fn); },
    flush,
    destroy() { disposed = true; clearTimeout(timer); chrome.storage.onChanged.removeListener?.(onChanged); external.clear(); status.clear(); }
  };
}
