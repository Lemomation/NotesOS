import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createVFS, seedWorkspace, STORAGE_KEY } from './js/vfs.js';
import { renderMarkdown, inlineMarkdown, toggleMarkdownTask } from './js/markdown.js';
import { WALLPAPERS, renderWallpaper } from './js/wallpapers.js';
import { tokenize, executeCommand } from './js/terminal.js';
import { focusTimer, formatTime } from './js/sound.js';
import { verifyMotion } from './verify-motion.mjs';
import { verifyStorage } from './verify-storage.mjs';
import { mergeWorkspaceCommit, validWorkspaceShape } from './js/workspace-controller.js';
import { validateWallpaperDescriptor, validateSvgWallpaper, wallpaperFit, createMemoryWallpaperStore } from './js/wallpaper-store.js';
import { parseBackup } from './js/backup.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const checks = [];
function check(name, fn) { fn(); checks.push(name); console.log(`  PASS  ${name}`); }
const memory = initial => {
  const data = new Map(Object.entries(initial || {}));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data };
};
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'edge-extension', '.git', '.zcode'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full)); else files.push(full);
  }
  return files;
}
console.log('\nNotes OS — deterministic checks\n');
const files = await walk(root);
const sourceFiles = files.filter(file => /\.(?:m?js)$/.test(file));
for (const file of sourceFiles) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
console.log(`  PASS  ${sourceFiles.length} JavaScript modules parse cleanly`);
for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) assert(files.includes(path.resolve(path.dirname(file),match[1])), `${path.relative(root,file)} imports missing ${match[1]}`);
}
console.log('  PASS  Complete local module import graph');
const required = ['index.html','css/tokens-and-reset.css','css/desktop-and-wm.css','css/apps.css','js/main.js','js/wm.js','js/vfs.js','js/wallpapers.js','js/sound.js','js/markdown.js','js/icons.js','js/apps/notes-studio.js','js/apps/spatial-canvas.js','js/apps/files-and-terminal.js','js/apps/tempo-and-settings.js','server.mjs'];
check('All desktop and application files exist', () => required.forEach(file => assert(files.includes(path.join(root,file)),file)));
const html = await readFile(path.join(root,'index.html'),'utf8');
const extensionManifest = JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
check('Semantic desktop shell and local-only resources', () => {
  for (const id of ['desktop','wallpaper-stage','desktop-icons','windows-layer','menubar','dock','spotlight-modal','context-menu','control-center','notification-area','expose-overlay']) assert(html.includes(`id="${id}"`),id);
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) if(!match[1].startsWith('data:')) assert(files.includes(path.join(root,match[1])),`Missing resource ${match[1]}`);
  assert(!/https?:\/\//.test(html.replace(/data:[^"]+/g,'')));
});
const store=memory();let fs=createVFS(store);
check('Seeded collections, notes, tags and canvas',()=>{assert.equal(fs.listNotes().length,8);assert(fs.getAllTags().includes('design'));assert.equal(fs.getCanvas().nodes.length,4);assert.equal(fs.getCanvas().edges.length,3);assert(fs.getFolders().includes('/Journal'));});
let testNote;
check('Create and edit notes through the shared filesystem',()=>{testNote=fs.createNote({title:'Verification note',body:'A useful thought',folder:'/Projects',tags:['tests']});assert.equal(fs.getNote(testNote.id).body,'A useful thought');fs.updateNote(testNote.id,{body:'A better thought',favorite:true});assert.equal(fs.getNote(testNote.id).body,'A better thought');assert(fs.listNotes({favorite:true}).some(n=>n.id===testNote.id));});
check('Search, folder and tag filtering',()=>{assert(fs.listNotes({query:'BETTER THOUGHT'}).some(n=>n.id===testNote.id));assert.equal(fs.listNotes({tag:'tests'}).length,1);assert(fs.listNotes({folder:'/Projects'}).some(n=>n.id===testNote.id));assert(!fs.listNotes({folder:'/Journal'}).some(n=>n.id===testNote.id));});
check('Real wiki-link backlinks',()=>{const linked=fs.createNote({title:'Connected note',body:'See [[Verification note]] and [[The analog project]].'});assert(fs.getBacklinks(testNote.id).some(n=>n.id===linked.id));assert(fs.getBacklinks('analog').some(n=>n.id===linked.id));});
check('Duplicate, trash and restore without data loss',()=>{const copy=fs.duplicateNote(testNote.id);assert(copy.id!==testNote.id);assert.equal(copy.body,'A better thought');fs.deleteNote(testNote.id);assert(!fs.listNotes().some(n=>n.id===testNote.id));assert(fs.listNotes({trash:true}).some(n=>n.id===testNote.id));fs.restoreNote(testNote.id);assert.equal(fs.getNote(testNote.id).body,'A better thought');assert(fs.listNotes().some(n=>n.id===testNote.id));});
check('Folder creation and invalid names',()=>{assert.equal(fs.createFolder('Research'),'/Research');assert.throws(()=>fs.createFolder('Research'));assert.throws(()=>fs.createFolder('<script>'));});
check('Preferences, canvas geometry and JSON roundtrip',()=>{fs.setPrefs({theme:'dark',wallpaper:'herbarium'});const canvas=fs.getCanvas();canvas.nodes[0].x=231;fs.saveCanvas(canvas.nodes,canvas.edges,{x:12,y:24,zoom:.8});fs=createVFS(store);assert.equal(fs.getPrefs().theme,'dark');assert.equal(fs.getCanvas().nodes[0].x,231);assert.equal(fs.getCanvas().view.zoom,.8);assert.equal(fs.getNote(testNote.id).body,'A better thought');assert.equal(JSON.parse(fs.exportWorkspaceJSON()).version,1);});
check('Subscriber notifications and unsubscribe',()=>{let called=0;const off=fs.subscribe(()=>called++);fs.updateNote(testNote.id,{title:'Renamed note'});assert.equal(called,1);off();fs.updateNote(testNote.id,{title:'Verification note'});assert.equal(called,1);});
check('Malformed saved data is preserved, never overwritten',()=>{const raw='{broken';const storage=memory({[STORAGE_KEY]:raw});const recovered=createVFS(storage);assert(recovered.getStorageError());recovered.createNote({title:'Still here'});assert.equal(storage.getItem(STORAGE_KEY),raw);assert(recovered.listNotes().some(n=>n.title==='Still here'));});
check('Unavailable storage preserves in-memory edits with an error',()=>{const broken={getItem:()=>null,setItem:()=>{throw new Error('Quota exceeded');}};const temporary=createVFS(broken);const note=temporary.createNote({title:'Keep me'});assert(temporary.getStorageError());assert.equal(temporary.getNote(note.id).title,'Keep me');});
check('Canvas drops dangling edges',()=>{const board=fs.getCanvas();fs.saveCanvas(board.nodes,[...board.edges,{id:'bad',from:'missing',to:board.nodes[0].id}]);assert(!fs.getCanvas().edges.some(e=>e.id==='bad'));});
check('Markdown never executes raw HTML or unsafe link URLs',()=>{const result=renderMarkdown('<img src=x onerror=alert(1)>\n\n[x](javascript:alert)\n\n```html\n<script>alert(1)</script>\n```');assert(!result.includes('<img'));assert(!result.includes('<script>'));assert(!result.includes('href="javascript:'));assert(result.includes('&lt;script&gt;'));assert(!inlineMarkdown('[["><img onerror=x>]]').includes('<img'));});
check('Markdown headings, emphasis, tasks, quotes and tables',()=>{const result=renderMarkdown('## Heading\n\n**Bold** and *italic*.\n\n- [ ] Task\n- [x] Done\n\n> A quotation\n\n| A | B |\n| --- | --- |\n| x | y |');assert(result.includes('<h3>Heading</h3>'));assert(result.includes('<strong>Bold</strong>'));assert(result.includes('<em>italic</em>'));assert(result.includes('data-task-line="4"'));assert(result.includes('<blockquote>'));assert(result.includes('<table>'));});
check('Task toggles update the exact source line',()=>{const source='- [ ] First\n\n- [x] Last';assert.equal(toggleMarkdownTask(source,0,true),'- [x] First\n\n- [x] Last');assert.equal(toggleMarkdownTask(source,2,false),'- [ ] First\n\n- [ ] Last');});
check('All original wallpapers work in light and dark',()=>{assert.equal(WALLPAPERS.length,8);for(const wallpaper of WALLPAPERS){for(const theme of ['light','dark']){const svg=renderWallpaper(wallpaper.id,theme);assert(svg.startsWith('<svg'));assert(svg.includes('viewBox="0 0 1600 1000"'));assert(svg.includes('feTurbulence'));assert(svg.length>2500);assert(!svg.includes('undefined'));}}});
check('Wallpaper definitions have unique per-render IDs',()=>{const a=renderWallpaper('topographic'),b=renderWallpaper('topographic');const ids=[...a.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert(ids.every(id=>!b.includes(`id="${id}"`)));});
const shell={cwd:'/'};
check('Terminal tokenization handles quoted multiword titles',()=>{assert.deepEqual(tokenize('write "My thought" "One\\nTwo"'),['write','My thought','One\nTwo']);assert.throws(()=>tokenize('cat "unfinished'));});
check('Terminal commands mutate the same persistent notes',()=>{assert(!executeCommand('cd /Notes',shell,fs).error);assert.equal(shell.cwd,'/Notes');assert(!executeCommand('touch "From the terminal"',shell,fs).error);assert(fs.findNoteByTitle('From the terminal'));assert(!executeCommand('write "From the terminal" "A shared thought"',shell,fs).error);assert.equal(fs.findNoteByTitle('From the terminal').body,'A shared thought');assert(executeCommand('grep "shared thought"',shell,fs).output.includes('From the terminal'));const open=executeCommand('open "From the terminal"',shell,fs);assert.equal(open.effect.app,'notes');assert.equal(open.effect.noteId,fs.findNoteByTitle('From the terminal').id);});
check('Terminal settings and unsupported commands are safe',()=>{executeCommand('theme light',shell,fs);assert.equal(fs.getPrefs().theme,'light');executeCommand('wallpaper bauhaus',shell,fs);assert.equal(fs.getPrefs().wallpaper,'bauhaus');assert(executeCommand('rm -rf /',shell,fs).error);assert(executeCommand('cat missing',shell,fs).error);assert(executeCommand('neofetch',shell,fs).output.includes('Notes OS'));});
check('Focus timer pause preserves elapsed time and resets correctly',()=>{
  const originalNow=Date.now;let now=100000;
  try{
    Date.now=()=>now;
    focusTimer.setPreset('Test',10);focusTimer.toggle();now+=3700;focusTimer.toggle();
    assert.equal(focusTimer.getState().remaining,7);assert.equal(focusTimer.getState().running,false);
    focusTimer.toggle();now+=1800;focusTimer.toggle();assert.equal(focusTimer.getState().remaining,6);
    focusTimer.reset();assert.equal(focusTimer.getState().remaining,10);assert.equal(formatTime(1500),'25:00');
  }finally{Date.now=originalNow;focusTimer.setPreset('Focus',1500);}
});
check('Motion preference persists without changing note data',()=>{
  const storage=memory();const original=createVFS(storage);const note=original.getNote('welcome');
  assert.equal(original.getPrefs().motion,'system');original.setPrefs({motion:'smooth'});
  const restored=createVFS(storage);assert.equal(restored.getPrefs().motion,'smooth');assert.deepEqual(restored.getNote('welcome'),note);
  const raw=JSON.parse(storage.getItem(STORAGE_KEY));raw.prefs.motion='invalid';storage.setItem(STORAGE_KEY,JSON.stringify(raw));
  assert.equal(createVFS(storage).getPrefs().motion,'system');
});
check('Extension workspace merge preserves independent tab edits',()=>{
  const base=seedWorkspace(),tabA=structuredClone(base),tabB=structuredClone(base);
  tabA.notes[0].title='Changed in A';tabA.notes[0].updatedAt+=1;
  tabB.notes[1].title='Changed in B';tabB.notes[1].updatedAt+=2;
  const afterA=mergeWorkspaceCommit({current:base,incoming:tabA,base,events:[{type:'notes',id:tabA.notes[0].id}],now:100});
  const afterB=mergeWorkspaceCommit({current:afterA,incoming:tabB,base,events:[{type:'notes',id:tabB.notes[1].id}],now:101});
  assert.equal(afterB.notes.find(n=>n.id===tabA.notes[0].id).title,'Changed in A');assert.equal(afterB.notes.find(n=>n.id===tabB.notes[1].id).title,'Changed in B');
});
check('Simultaneous note body conflicts create one recovered copy',()=>{
  const base=seedWorkspace(),current=structuredClone(base),incoming=structuredClone(base),id=base.notes[0].id;
  current.notes[0].body='First tab';incoming.notes[0].body='Second tab';
  const merged=mergeWorkspaceCommit({current,incoming,base,events:[{type:'notes',id}],now:777});
  assert.equal(merged.notes.find(n=>n.id===id).body,'First tab');const recovered=merged.notes.find(n=>n.id===`${id}-recovered-777`);assert.equal(recovered.body,'Second tab');assert(recovered.tags.includes('recovered'));
});
check('Preference and canvas commits merge without replacing notes',()=>{
  const base=seedWorkspace(),current=structuredClone(base),incoming=structuredClone(base);current.notes[0].title='Live note';incoming.prefs.theme='dark';incoming.canvas.nodes[0].x=500;
  const merged=mergeWorkspaceCommit({current,incoming,base,events:[{type:'prefs',keys:['theme']},{type:'canvas'}]});
  assert.equal(merged.notes[0].title,'Live note');assert.equal(merged.prefs.theme,'dark');assert.equal(merged.canvas.nodes[0].x,500);
});
check('Wallpaper files and SVG active content are validated',()=>{
  assert.equal(validateWallpaperDescriptor({name:'photo.png',type:'image/png',size:5}).type,'image/png');assert.throws(()=>validateWallpaperDescriptor({name:'bad.exe',type:'application/octet-stream',size:5}));assert.throws(()=>validateWallpaperDescriptor({name:'huge.png',type:'image/png',size:21*1024*1024}));
  assert(validateSvgWallpaper('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'));assert.throws(()=>validateSvgWallpaper('<svg><script>alert(1)</script></svg>'));assert.throws(()=>validateSvgWallpaper('<svg><image href="https://example.com/a.png"/></svg>'));assert.equal(wallpaperFit('center'),'center');assert.equal(wallpaperFit('nonsense'),'cover');
});
check('Workspace-only and full backup imports validate before use',()=>{
  const workspace=seedWorkspace(),plain=parseBackup(JSON.stringify(workspace));assert.equal(plain.full,false);assert(validWorkspaceShape(plain.workspace));
  const full=parseBackup(JSON.stringify({format:'notes-os-backup',version:1,workspace,wallpapers:[]}));assert.equal(full.full,true);assert.deepEqual(full.wallpapers,[]);assert.throws(()=>parseBackup('{"no":"workspace"}'));
});
check('Edge manifest requests only storage and overrides New Tab',()=>{
  const manifest=extensionManifest;assert.equal(manifest.manifest_version,3);assert.deepEqual(manifest.permissions,['storage']);assert.equal(manifest.chrome_url_overrides.newtab,'index.html');assert.equal(manifest.background.type,'module');assert(!manifest.host_permissions);assert(!manifest.content_scripts);
});
await verifyStorage(check);
await verifyMotion(check);
console.log(`\n${checks.length + 2} checks passed. Browser layout and interaction tests are a separate acceptance pass.\n`);
