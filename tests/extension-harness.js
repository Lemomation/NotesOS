import { createWorkspaceService } from '../js/workspace-service.js';

export function storageRoundtrip(value) {
  if (Array.isArray(value)) return value.map(storageRoundtrip);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, storageRoundtrip(value[key])]));
  return value;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Both browser and Node tests use the actual service, merge algorithm, and storage adapter.
export function createExtensionHarness({ requestDelay = 0, responseDelay = 0 } = {}) {
  let data = {}, service, writeFailure = false, lostResponse = false, commits = 0;
  const pages = new Set(), writes = [], requests = [];
  const storage = {
    async get(key) { return data[key] ? { [key]: storageRoundtrip(data[key]) } : {}; },
    async set(values) {
      if (writeFailure) { writeFailure = false; throw new Error('Simulated storage write failure'); }
      const changes = {};
      for (const [key, value] of Object.entries(values)) {
        changes[key] = { oldValue: data[key] ? storageRoundtrip(data[key]) : undefined, newValue: storageRoundtrip(value) };
        data[key] = storageRoundtrip(value);
      }
      writes.push(storageRoundtrip(values));
      for (const page of pages) for (const fn of page.listeners) fn(storageRoundtrip(changes), 'local');
    }
  };
  const restart = () => { service = createWorkspaceService(storage); };
  restart();
  return {
    createPage() {
      const page = { listeners: new Set() }; pages.add(page);
      return {
        storage: { local: {}, onChanged: { addListener: fn => page.listeners.add(fn), removeListener: fn => page.listeners.delete(fn) } },
        runtime: { async sendMessage(message) {
          requests.push(storageRoundtrip(message));
          if (requestDelay) await wait(requestDelay);
          const result = await service.handle(storageRoundtrip(message));
          if (message.type === 'WORKSPACE_COMMIT') {
            commits++;
            if (lostResponse) { lostResponse = false; throw new Error('Simulated lost acknowledgement'); }
          }
          if (responseDelay) await wait(responseDelay);
          return storageRoundtrip(result);
        } }
      };
    },
    restart,
    failNextWrite() { writeFailure = true; },
    loseNextResponse() { lostResponse = true; },
    get record() { return data.notesOsWorkspace ? storageRoundtrip(data.notesOsWorkspace) : null; },
    get commits() { return commits; },
    writes, requests
  };
}
