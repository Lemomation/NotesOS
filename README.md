# Notes OS

**A little room to think.** A local-first desktop workspace that replaces Microsoft Edge’s New Tab page, built with vanilla HTML, CSS, JavaScript, and original SVG artwork.

[Download the extension](https://github.com/Lemomation/NotesOS/releases/latest) · [Install in Edge](EDGE-INSTALL.md) · [Validation](VALIDATION.md)

## Install in Microsoft Edge

1. Download **notes-os-edge-extension.zip** from the [latest release](https://github.com/Lemomation/NotesOS/releases/latest).
2. Extract it to a permanent folder.
3. Open `edge://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Open a new tab and accept Edge’s New Tab change prompt if shown.

No server, account, or dependency installation is needed to use the extension. Only the `storage` permission is requested—no browsing-history access, website permissions, or content scripts.

**Updating?** Replace the files in your existing extension folder, click **Reload** on its Edge extension card, then open a fresh tab. Do not uninstall it to update. Version **1.0.1** fixes the editor losing focus after each autosave.

## Inside

- **Notes Studio:** collections, favorites, tags, search, Markdown write/read/split modes, formatting and slash commands, linked notes, backlinks, task checkboxes, automatic saving, downloads, and reversible trash.
- **Canvas:** movable sticky cards, live-linked notes, pan/zoom, connections, colors, and a tidy command. Double-click a card to edit or open it.
- **Files:** collections, grid/list views, search, previews, rename, duplicate, and restore.
- **Terminal:** a small shell for the notes workspace: `ls`, `cd`, `cat`, `touch`, `write`, `grep`, `tags`, `backlinks`, `open`, `theme`, `wallpaper`, `stat`, and more. Type `help`; quote titles with spaces.
- **Tempo:** focus/break/deep-work timer and a four-layer procedural soundscape. Sound starts only when requested.
- **Settings:** light/dark/system appearance, accent colors, eight built-in SVG wallpapers, custom PNG/JPG/WebP/SVG wallpapers with Fill/Fit/Center, and workspace import/export.

The desktop supports draggable/resizable windows, snapping, minimize/restore, two workspaces, Spotlight-style search, window overview, context menus, a scratchpad, and movable icons.

## Motion

Settings → Appearance → **The way things move** offers **Smooth**, **Follow device**, and **Reduced**. Follow device is the default. Smooth overrides reduced motion only within Notes OS, without changing your system’s accessibility preference.

A proximity-responsive dock, interruptible window animations, panel transitions, and wallpaper crossfades share the same motion language. Dragging and typing stay immediate.

## Your data

- In the extension, notes, collections, canvas data, and preferences use **`chrome.storage.local`** in your Edge profile.
- Uploaded image files use **IndexedDB** under the extension’s origin.
- The localhost preview uses **localStorage** and has a separate workspace from the extension.
- Notes OS makes no remote API calls and does not upload your workspace.

Open tabs receive committed workspace updates. Conflicting edits to the same note can produce a **recovered copy** rather than silently replacing the other version. This is not a collaborative editor or cloud-sync service; avoid simultaneously editing the same note in several tabs and keep backups of important work.

**Settings → Your workspace → Workspace JSON** exports notes, canvas, and preferences, but not uploaded image bytes. **Full backup** includes those images. Use **Import** to transfer a backup from the localhost preview or another installation; it asks before replacing the workspace.

Export before uninstalling the extension, clearing its storage, or switching Edge profiles. Window layouts, terminal history, and focus-timer progress are per-page sessions and reset when the browser tab reloads. Closing an app window inside Notes OS does not stop that tab’s running timer or soundscape.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl / Cmd + K | Find apps, notes, and actions |
| Ctrl / Cmd + N | New note |
| F3 | Window overview |
| Ctrl / Cmd + Shift + M | Minimize active window |
| Ctrl / Cmd + Shift + F | Maximize / restore active window |
| Ctrl / Cmd + Shift + W | Close active window |
| Alt + 1 / 2 | Writing / Research workspace |
| Ctrl / Cmd + B / I | Bold / italic in the editor |
| `/` at the start of a word | Editor block menu |
| Escape | Dismiss a panel |

A browser or operating system may intercept some shortcuts; corresponding visible controls are provided.

## Development

From the repository directory, with Node.js 22+:

```sh
npm start
npm test
npm run package:edge
```

No `npm install` is necessary. The preview opens at **http://127.0.0.1:8420**; set `PORT` to change the port. Packaging currently uses Windows PowerShell’s `Compress-Archive` and creates `edge-extension/` plus `notes-os-edge-extension.zip` after tests pass.

For the browser-level focus regression, start the server, open **http://127.0.0.1:8420/tests/typing-regression.html**, and click **Run typing regression**. It mounts the real editor with an isolated simulated Edge storage API; it does not change your personal notes.

## Source map

- `index.html`, `css/` — desktop shell and visual system
- `js/main.js`, `js/wm.js` — desktop integration and window management
- `js/motion.js`, `js/dock.js` — motion lifecycle and dock response
- `js/vfs.js`, `js/workspace-storage.js`, `js/background.js` — workspace model and extension persistence
- `js/apps/` — the six applications
- `js/wallpapers.js`, `js/wallpaper-store.js` — built-in artwork and uploaded wallpaper storage
- `js/backup.js` — workspace backup formats
- `verify*.mjs`, `tests/` — regression checks

Notes OS is a browser desktop, not a kernel or a system shell. Network and battery glyphs are decorative, not hardware telemetry. The extension is distributed unpacked and is not a Microsoft Edge Add-ons store installation.
