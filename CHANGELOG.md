# Changelog

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
