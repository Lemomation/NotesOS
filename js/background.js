import { createWorkspaceService } from './workspace-service.js';

const service = createWorkspaceService(chrome.storage.local);
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !['WORKSPACE_GET', 'WORKSPACE_COMMIT'].includes(message?.type)) return;
  service.handle(message).then(sendResponse, error => sendResponse({ error: error.message }));
  return true;
});
