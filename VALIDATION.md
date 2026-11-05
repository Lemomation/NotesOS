# Notes OS — validation

## Version 1.0.2 — 2026-11-05

### False recovery-copy regression

The reported behavior was reproduced: object-key reordering across extension storage made logically identical notes compare unequal. Typing `e` after `H` left the original note at `H` and created a `— recovered copy` containing `He`. Slow overlapping saves could also compare later letters against the wrong draft.

The conflict merger now compares semantic values rather than serialized key order, ignores `updatedAt` as conflict content, merges edited fields independently, preserves intentional delete-versus-edit conflicts, and keeps the arriving writer on the original note ID. The storage adapter retains the baseline for the entire pending batch, retries the same commit separately from newer typing, and gives commits persistent IDs so a retry after a service-worker restart is idempotent.

Existing notes and recovered copies are preserved. The update does not delete or automatically consolidate them.

### Automated checks

`npm test` passes **56 checks**. In addition to the original workspace, Markdown, wallpaper, terminal, timer, manifest, motion, and autosave tests, the suite now verifies:

- Reordered JSON keys are not a conflict.
- Timestamp-only changes do not create recovery notes.
- Body and favorite edits merge independently.
- Unrelated stale snapshots cannot overwrite saved notes.
- Every keystroke stays on the same original note ID.
- Slow acknowledgements and in-flight edits keep all letters.
- Two tabs perform 60 interleaved real-service saves with stable note IDs and zero recovered copies.
- A genuine same-text conflict preserves exactly one alternate version, then later typing does not create more copies.
- Existing recovered copies remain editable.
- The save queue recovers after a storage write error.
- A lost acknowledgement retried after a service-worker restart commits exactly once.

### Browser regression

`tests/typing-regression.html` mounts the actual Notes Studio editor against the actual extension storage adapter, workspace service, and conflict merger with two isolated simulated tabs. It types one character at a time across save boundaries, adds characters while a save is in flight, performs remote updates, and reloads the service.

It verifies body and title focus, textarea DOM identity, caret and backward selection, stable original IDs, saved content after restart, and zero unexpected recovered copies. Personal notes are not used or modified.

## Version 1.0.1

Version 1.0.1 fixed editor focus loss caused by own `chrome.storage.onChanged` notifications. Version 1.0.2 retains that fix and replaces the incomplete conflict logic that could still create copies.

## Earlier UI verification

The desktop was exercised in Chromium at 1440×900, 1280×720, and 390×844: editing and reload persistence, Files/Terminal updates, window drag/resize/snap, dock minimize/restore, workspaces, search, Canvas editing/linking, focus-timer controls, appearance settings, and the compact note picker.

Motion testing sampled intermediate launch and reversal frames, verified that hover hitboxes remain fixed, and checked that animations settle without leaving hidden or inert windows.

## Boundaries

These checks cannot exhaust every browser lifecycle or storage quota condition. Physical touch devices, screen readers, other browser engines, physical speaker output, and a full-length focus session were not verified. Uploaded-image decode validity and full-backup restore should be checked with representative personal files. Keep exported backups of important work.
