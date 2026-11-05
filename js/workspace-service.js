import { mergeWorkspaceCommit, createWorkspaceRecord, WORKSPACE_RECORD_KEY, validWorkspaceShape } from './workspace-controller.js';

export function createWorkspaceService(storage, now = () => Date.now()) {
  let queue = Promise.resolve();
  async function record(seed) {
    const stored = (await storage.get(WORKSPACE_RECORD_KEY))[WORKSPACE_RECORD_KEY];
    if (stored !== undefined) {
      if (!validWorkspaceShape(stored?.workspace)) throw new Error('The saved workspace is invalid. It has been kept untouched; export your work before resetting.');
      return stored;
    }
    const created = createWorkspaceRecord(seed, 1);
    await storage.set({ [WORKSPACE_RECORD_KEY]: created });
    return created;
  }
  return {
    handle(message) {
      const operation = queue.then(async () => {
        if (message.type === 'WORKSPACE_GET') return record(message.seed);
        if (message.type !== 'WORKSPACE_COMMIT') throw new Error('Unknown workspace request.');
        const current = await record(message.workspace);
        const commits = current.recentCommits || [];
        // Persist the acknowledgement key with the workspace, including across worker restarts.
        if (message.commitId && commits.includes(message.commitId)) return current;
        const workspace = mergeWorkspaceCommit({ current: current.workspace, incoming: message.workspace, base: message.baseWorkspace, events: message.events, now: now() });
        const next = createWorkspaceRecord(workspace, current.revision + 1);
        next.recentCommits = message.commitId ? [...commits, message.commitId].slice(-128) : commits;
        await storage.set({ [WORKSPACE_RECORD_KEY]: next });
        return next;
      });
      // A rejected write must not poison every later save.
      queue = operation.catch(() => {});
      return operation.then(value => ({ workspace: structuredClone(value.workspace), revision: value.revision }));
    }
  };
}
