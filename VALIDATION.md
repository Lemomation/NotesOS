# Notes OS — validation

## Version 1.0.1 — 2026-11-05

### Autosave focus regression

Reproduced the extension bug using the same asynchronous ordering as Edge:

1. Type a character and start an autosave.
2. Receive `chrome.storage.onChanged` before the save request resolves.
3. The old adapter queued its own notification and replayed it as an external workspace reset.
4. The editor rebuilt its inputs and lost keyboard focus.

The regression initially failed with **3 external resets for 3 typed letters**. The fixed adapter ignores acknowledged/stale revisions and unchanged snapshots, retains newer pending edits while an earlier request is in flight, and only delivers real external changes. The editor avoids rebuilding an unchanged selected note; when a real remote edit changes it, focus, selection direction, and scroll position are restored.

### Deterministic checks

`npm test` passes **43 checks**, covering:

- All JavaScript syntax, local import paths, desktop containers, and required assets.
- Workspace creation, updates, filters, tags, favorites, backlinks, duplicate/trash/restore, storage roundtrips, corrupt storage, and quota failures.
- Markdown escaping, unsafe link handling, tasks, headings, tables, and code blocks.
- Eight SVG wallpaper outputs, theme variants, unique definitions, image descriptors, SVG validation, and backup parsing.
- Terminal parsing/actions and timer pause/reset accounting.
- Motion preference resolution, damping, interruption, completion, and cleanup.
- Manifest V3 and the storage-only permission set.
- Independent tab edits and recovered copies for conflicting note changes.
- Own save notifications, late acknowledgements, stale revisions, and typing during slow saves.

### Browser test performed

The page at `tests/typing-regression.html` mounts the actual Notes Studio editor with an isolated simulated Edge storage API. It types one character at a time, allowing autosave to complete between characters, then checks remote updates and title editing.

Observed result:

```text
PASS
33 completed saves
0 own-save editor resets
No storage error
```

Verified:

- The textarea remains the same DOM node across its own autosaves.
- Keyboard focus and the insertion point remain in the editor.
- A remote edit to another note does not replace the active textarea.
- A remote edit to the active note preserves focus and backward selection.
- The note title remains focused across autosaves.
- Saved text matches the typed text.

This checks the real editor DOM with a simulated extension API, not an automated installation into Edge. The personal-use extension was previously reported working in Edge by its user; the 1.0.1 fix should be checked there after reloading the extension.

## Earlier UI verification

The desktop was exercised in a Chromium browser at 1440×900, 1280×720, and 390×844: note editing and reload persistence, Files/Terminal updates, window drag/resize/snap, dock minimize/restore, workspaces, search, Canvas editing/linking, focus-timer controls, appearance settings, and the compact note picker.

Motion testing sampled intermediate launch and reversal frames, verified that hover hitboxes remain fixed, and checked that animations settle without leaving hidden or inert windows.

## Boundaries

The automated checks do not exhaustively cover every multi-tab conflict, storage failure, or browser lifecycle. Physical touch devices, screen readers, other browser engines, physical speaker output, and a full-length focus session were not verified. Uploaded-image decode validity and full-backup restore should be checked with representative personal files. Keep exported backups of important work.
