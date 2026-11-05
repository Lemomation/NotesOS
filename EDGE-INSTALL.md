# Install Notes OS in Microsoft Edge

## Download the extension

1. Open [the latest GitHub release](https://github.com/Lemomation/NotesOS/releases/latest).
2. Download **notes-os-edge-extension.zip** from **Assets** (not GitHub's source-code ZIP).
3. Extract it to a permanent folder on your computer. The extracted folder should contain `manifest.json` directly inside it.

## Load it in Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the extracted folder containing `manifest.json`.
5. Open a new tab. If Edge asks whether to keep the New Tab change, approve it.

No server or Node.js installation is needed to use the extension. It requests only `storage`, not access to your websites, history, or tabs. It does not replace InPrivate tabs.

## Updating an existing installation

1. Export a **Full backup** from Settings → Your workspace if you want a safety copy.
2. Extract the new release over the **same folder** you already loaded in Edge.
3. On `edge://extensions`, find Notes OS and click **Reload**.
4. Close older Notes OS tabs and open a fresh new tab.

**Do not remove and reinstall the extension to update it.** Reusing the same folder preserves its identity and stored data. Version **1.0.2** fixes false recovered copies during typing as well as retaining the 1.0.1 focus fix. Close every older Notes OS tab after reloading so no stale copy of the save code is still running. Existing recovered notes are preserved; review them before removing any.

If using the locally built extension folder, rebuilding it and clicking **Reload** is sufficient.

## Bring over the localhost workspace

1. In the localhost Notes OS, open **Settings → Your workspace**.
2. Choose **Workspace JSON** to export notes, canvas, and preferences, or **Full backup** to include custom wallpaper image files.
3. In the extension, open **Settings → Your workspace → Import** and select the exported JSON.
4. Review and approve the replacement confirmation.

Localhost and the extension have separate browser origins. They do not share storage automatically.

## Build from source (optional)

From the repository directory:

```sh
npm test
npm run package:edge
```

No dependency installation is required. Node.js 22+ runs the build; packaging currently uses PowerShell's `Compress-Archive` on Windows.

The command produces:

- `edge-extension/` — the folder Edge loads.
- `notes-os-edge-extension.zip` — the ready-to-extract runtime package.

## Backups and removal

- **Workspace JSON** excludes custom image bytes.
- **Full backup** includes PNG, JPG, WebP, and SVG files and can be much larger.
- Export before uninstalling: removing an extension can remove its stored data.
- Another New Tab extension may take precedence; disable it if needed.
- Keep the loaded folder in place so Edge can read its files.

This is an unpacked personal-use extension, not a Microsoft Edge Add-ons store installation.
