import { mergeWorkspaceCommit, createWorkspaceRecord, WORKSPACE_RECORD_KEY, validWorkspaceShape } from './workspace-controller.js';

let queue = Promise.resolve();
const clone = value => structuredClone(value);
async function record(seed) {
  const stored = (await chrome.storage.local.get(WORKSPACE_RECORD_KEY))[WORKSPACE_RECORD_KEY];
  if (stored?.workspace && validWorkspaceShape(stored.workspace)) return stored;
  const created = createWorkspaceRecord(seed, 1);
  await chrome.storage.local.set({ [WORKSPACE_RECORD_KEY]: created });
  return created;
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'WORKSPACE_GET') {
    record(message.seed).then(value => sendResponse({ workspace: clone(value.workspace), revision: value.revision })).catch(error => sendResponse({ error: error.message }));
    return true;
  }
  if (message?.type === 'WORKSPACE_COMMIT') {
    queue = queue.then(async () => {
      const current = await record(message.workspace);
      const workspace = mergeWorkspaceCommit({ current: current.workspace, incoming: message.workspace, base: message.baseWorkspace, events: message.events });
      const next = createWorkspaceRecord(workspace, current.revision + 1);
      await chrome.storage.local.set({ [WORKSPACE_RECORD_KEY]: next });
      return { workspace: clone(next.workspace), revision: next.revision };
    });
    queue.then(sendResponse).catch(error => sendResponse({ error: error.message }));
    return true;
  }
});
