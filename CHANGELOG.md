# Changelog

## 1.0.2 — 2026-11-05

### Fixed

- Reordered JSON fields and timestamp-only changes no longer trigger false recovered notes.
- Consecutive edits retain their actual baseline through slow saves rather than being mistaken for competing edits.
- Conflicts are checked per edited field; changing a favorite in one tab does not conflict with typing in another.
- Genuine competing text edits keep the active writer on the original note ID and preserve the displaced text as a recovered copy.
- Retried saves are idempotent across service-worker restarts, and a failed write no longer blocks all later saves.
- Canvas merges preserve independent card edits and respect intentional removal.

Existing notes and recovered copies are not deleted or automatically cleaned up. Save tests now exercise the actual service and merge logic, including storage that reorders object keys, two-tab edits, failed writes, and lost acknowledgements.

## 1.0.1 — 2026-11-05

### Fixed

- Notes Studio no longer loses focus after each extension autosave.
- A save response no longer replaces letters typed while that request was in progress.
- Late or duplicate extension storage notifications no longer reset the editor.
- Active note focus, selection, and scroll are preserved when a real remote edit requires an update.
- The editor distinguishes pending saves from completed saves.

### Included in this first GitHub release

- Personal Edge New Tab extension with Notes Studio, Canvas, Files, Terminal, Tempo, and Settings.
- Smooth window and dock motion, light/dark themes, eight original SVG wallpapers, and local custom wallpaper support.
- Workspace JSON and full-backup import/export.
- Installation guide, dependency-free development server, and regression tests.

### Updating

Replace the files in your existing unpacked extension folder and click **Reload** in `edge://extensions`. Do not uninstall the extension. Close old Notes OS tabs and open a fresh new tab to use the updated scripts.
