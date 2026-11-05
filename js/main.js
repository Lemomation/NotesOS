import { vfs, extensionStorage } from './vfs.js';
import { sound, focusTimer, formatTime } from './sound.js';
import { icon, appIcon, appNames } from './icons.js';
import { renderWallpaper } from './wallpapers.js';
import { escapeHTML as esc, clamp, trapFocus, downloadFile } from './utils.js';
import { createWindowManager } from './wm.js';
import { mountNotesApp } from './apps/notes-studio.js';
import { mountCanvasApp } from './apps/spatial-canvas.js';
import { mountFilesApp, mountTerminalApp } from './apps/files-and-terminal.js';
import { mountTempoApp, mountSettingsApp } from './apps/tempo-and-settings.js';
import { motion, durations, reveal, dismiss, isShown, reducedMotion, setMotionPreference } from './motion.js';
import { createDock } from './dock.js';
import { wallpaperStore } from './wallpaper-store.js';

const $ = selector => document.querySelector(selector);
const menuPopover = $('#menu-popover'), contextMenu = $('#context-menu'), controlCenter = $('#control-center'), spotlightLayer = $('#spotlight-modal');
let selectedNoteId = 'welcome', activeMenu = null, resolveDialog = null, lastWallpaper = '', wallpaperSequence = 0, spotlightResults = [], spotlightIndex = 0, returnFocus = null;
const media = matchMedia('(prefers-color-scheme: dark)');
const resolvedTheme = () => vfs.getPrefs().theme === 'system' ? media.matches ? 'dark' : 'light' : vfs.getPrefs().theme;

function notify(message, title = 'Notes OS') {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `${icon('check')}<div><strong>${esc(title)}</strong><p>${esc(message)}</p></div><button class="icon-button" aria-label="Dismiss notification">${icon('close','icon-sm')}</button>`;
  $('#notification-area').append(el);
  motion.play(el, [{ opacity: 0, transform: 'translateX(24px) scale(.97)' }, { opacity: 1, transform: 'translateX(0) scale(1)' }], { duration: 360 });
  const remove = () => dismiss(el, { offset: -5, scale: .97, remove: true });
  const timeout = setTimeout(remove, 4800);
  el.querySelector('button').addEventListener('click', () => { clearTimeout(timeout); remove(); }, { once: true });
}
function dialog({ title, message = '', input, multiline = false, choices, placeholder = '', confirm = 'OK', danger = false, content = '' }) {
  if (resolveDialog) resolveDialog(null);
  const layer = $('#dialog-layer'), previous = document.activeElement;
  layer.innerHTML = `<form class="system-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">${esc(title)}</h2><p>${esc(message)}</p>${content}${choices ? `<select class="dialog-field" aria-label="Choose a note">${choices.map(c => `<option value="${esc(c.value)}">${esc(c.label)}</option>`).join('')}</select>` : input !== undefined ? multiline ? `<textarea class="dialog-field" aria-label="${esc(title)}" placeholder="${esc(placeholder)}" rows="5">${esc(input)}</textarea>` : `<input class="dialog-field" aria-label="${esc(title)}" placeholder="${esc(placeholder)}" value="${esc(input)}" maxlength="200">` : ''}<div class="dialog-actions">${input !== undefined || choices || danger ? '<button type="button" class="secondary-button" data-dialog-cancel>Cancel</button>' : ''}<button type="submit" class="primary-button"${danger ? ' style="background:var(--accent);color:#fff8e9"' : ''}>${esc(confirm)}</button></div></form>`;
  reveal(layer, { offset: 0, scale: 1 });
  const form = layer.querySelector('form');
  motion.play(form, [{ opacity: 0, transform: 'translateY(14px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 330 });
  return new Promise(resolve => {
    const abort = new AbortController();
    const close = value => {
      abort.abort(); resolveDialog = null;
      motion.play(form, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(6px) scale(.98)' }], { duration: 180 });
      dismiss(layer, { offset: 0, scale: 1, onHidden: () => { if (layer.contains(form)) layer.innerHTML = ''; } });
      previous?.isConnected && previous.focus(); resolve(value);
    };
    resolveDialog = close;
    layer.querySelector('form').addEventListener('submit', e => { e.preventDefault(); close(layer.querySelector('.dialog-field')?.value ?? true); }, { signal: abort.signal });
    layer.querySelector('[data-dialog-cancel]')?.addEventListener('click', () => close(null), { signal: abort.signal });
    layer.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); } else trapFocus(e,layer); }, { signal: abort.signal });
    layer.addEventListener('click', e => { if (e.target === layer) close(null); }, { signal: abort.signal });
    const field = layer.querySelector('.dialog-field') || layer.querySelector('button[type="submit"]');
    field.focus(); if (input !== undefined && !multiline) field.select?.();
  });
}
const wm = createWindowManager({
  layer: $('#windows-layer'), sound,
  context: () => ({ vfs, sound, wallpaperStore, extensionStorage, openApp, notify, dialog, getSelectedNote: () => selectedNoteId, setSelectedNote: id => { selectedNoteId = id; } }),
  onChange(state) {
    const active = state.windows.find(w => w.active);
    const name = $('#active-app-name'); if (name) name.textContent = active ? appNames[active.id] : 'Notes OS';
    document.querySelectorAll('.dock-item[data-app]').forEach(button => button.classList.toggle('running', state.windows.some(w => w.id === button.dataset.app)));
    document.querySelectorAll('[data-workspace]').forEach(button => { button.classList.toggle('active', Number(button.dataset.workspace) === state.workspace); button.setAttribute('aria-pressed', String(Number(button.dataset.workspace) === state.workspace)); });
    if (vfs.getPrefs().workspace !== state.workspace) vfs.setPrefs({ workspace: state.workspace });
  }
});
wm.registerApp('notes', { mount: mountNotesApp, width: 980, height: 645, minWidth: 350, minHeight: 330, subtitle: 'YOUR PERSONAL SPACE' });
wm.registerApp('canvas', { mount: mountCanvasApp, width: 780, height: 540, minWidth: 300, minHeight: 230, subtitle: 'LOOSE IDEAS / 01' });
wm.registerApp('files', { mount: mountFilesApp, width: 790, height: 505, minWidth: 360, minHeight: 310, subtitle: 'A PLACE FOR EVERYTHING' });
wm.registerApp('terminal', { mount: mountTerminalApp, width: 665, height: 449, minWidth: 345, minHeight: 265, subtitle: 'NOTES-SH / 1.0' });
wm.registerApp('tempo', { mount: mountTempoApp, width: 370, height: 638, minWidth: 310, minHeight: 470, subtitle: 'FOCUS / SOUND' });
wm.registerApp('settings', { mount: mountSettingsApp, width: 690, height: 505, minWidth: 360, minHeight: 325, subtitle: 'MAKE IT YOURS' });
function openApp(id, options = {}) {
  dock.launch(id);
  return wm.openApp(id, options);
}
function newNote() { openApp('notes', { newNote: true }); }
function closePopovers() {
  dismiss(menuPopover); dismiss(contextMenu); dismiss(controlCenter); activeMenu = null;
  document.querySelectorAll('.menu-button.selected').forEach(button => button.classList.remove('selected'));
}
function showShortcuts() {
  dialog({ title: 'Find your way around.', message: 'A few shortcuts. A little less reaching.', confirm: 'Got it', content: `<div class="shortcut-list">${[['Find anything','Ctrl / ⌘ + K'],['New note','Ctrl / ⌘ + N'],['Window overview','F3'],['Minimize window','Ctrl / ⌘ + Shift + M'],['Maximize or restore','Ctrl / ⌘ + Shift + F'],['Close window','Ctrl / ⌘ + Shift + W'],['Writing / Research','Alt + 1 / 2'],['Bold / italic','Ctrl / ⌘ + B / I'],['Editor blocks','/'],['Dismiss a panel','Esc']].map(([label,key]) => `<div class="shortcut-row"><span>${label}</span><kbd>${key}</kbd></div>`).join('')}</div>` });
}
async function scratchpad() {
  const content = await dialog({ title: 'Before the thought goes.', message: 'A quick scratchpad, kept between visits.', input: vfs.getPrefs().scratchpad, multiline: true, confirm: 'Keep this thought' });
  if (content !== null) vfs.setPrefs({ scratchpad: content });
}
const menuDefinitions = {
  system: () => [
    { label: 'About Notes OS', icon: 'info', run: () => openApp('settings',{section:'about'}) },
    { separator:true },
    { label: 'System settings…', icon: 'settings', run: () => openApp('settings') },
    { label: 'Change wallpaper…', icon:'image', run:()=>openApp('settings',{section:'wallpaper'}) },
    { separator:true },
    { label:'Quick scratchpad',icon:'edit',run:scratchpad },
    { label:'Keyboard shortcuts',icon:'keyboard',run:showShortcuts },
    { separator:true },
    { label:'Show desktop',icon:'monitor',run:()=>wm.showDesktop() }
  ],
  File: () => [
    { label:'New note',icon:'edit',shortcut:'Ctrl N',run:newNote },
    { label:'Open files',icon:'folder',run:()=>openApp('files') },
    { label:'Quick scratchpad',icon:'note',run:scratchpad },
    { separator:true },
    { label:'Export workspace…',icon:'download',run:()=>downloadFile('notes-os-workspace.json',vfs.exportWorkspaceJSON(),'application/json') },
    { label:'Recently deleted',icon:'trash',run:()=>openApp('files',{folder:'/Trash'}) },
    { separator:true },
    { label:'Close window',icon:'close',shortcut:'Ctrl ⇧ W',run:()=>wm.close() }
  ],
  Edit: () => [
    { label:'New thought',icon:'plus',run:newNote },
    { label:'Search notes',icon:'search',shortcut:'Ctrl K',run:openSpotlight },
    { label:'Quick scratchpad',icon:'edit',run:scratchpad },
    { separator:true },
    { label:'Writing shortcuts',icon:'keyboard',run:showShortcuts }
  ],
  View: () => [
    { label:'Find anything',icon:'search',shortcut:'Ctrl K',run:openSpotlight },
    { label:'Window overview',icon:'grid',shortcut:'F3',run:()=>wm.toggleExpose() },
    { label:'Show desktop',icon:'monitor',run:()=>wm.showDesktop() },
    { separator:true },
    { label:resolvedTheme()==='dark'?'Bring back daylight':'Switch to after hours',icon:resolvedTheme()==='dark'?'sun':'moon',run:()=>vfs.setPrefs({theme:resolvedTheme()==='dark'?'light':'dark'}) },
    { label:'Change wallpaper…',icon:'image',run:()=>openApp('settings',{section:'wallpaper'}) }
  ],
  Window: () => [
    { label:'Minimize',icon:'minus',shortcut:'Ctrl ⇧ M',run:()=>wm.minimize() },
    { label:'Maximize / restore',icon:'maximize',shortcut:'Ctrl ⇧ F',run:()=>wm.toggleMaximize() },
    { label:'Tile to the left',icon:'back',run:()=>wm.snap(undefined,'left') },
    { label:'Tile to the right',icon:'chevron',run:()=>wm.snap(undefined,'right') },
    { separator:true },
    ...wm.getWindows().map(w=>({label:appNames[w.id]+(w.minimized?' · minimized':''),icon:w.id,run:()=>openApp(w.id)}))
  ],
  Help: () => [
    { label:'Make yourself at home',icon:'notes',run:()=>openApp('notes',{noteId:'welcome'}) },
    { label:'Keyboard shortcuts',icon:'keyboard',run:showShortcuts },
    { label:'About your workspace',icon:'info',run:()=>openApp('settings',{section:'about'}) }
  ]
};
function renderMenu(items, target, x, y, title = '') {
  target.innerHTML = (title ? `<div class="popover-title">${esc(title)}</div>` : '') + items.map((item,i) => item.separator ? '<div class="menu-separator"></div>' : `<button class="menu-entry${item.danger?' danger':''}" role="menuitem" data-menu-index="${i}">${icon(item.icon||'note')}<span>${esc(item.label)}</span>${item.shortcut?`<kbd>${esc(item.shortcut)}</kbd>`:''}</button>`).join('');
  const wasOpen = isShown(target);
  if (!wasOpen) { target.hidden = false; target.dataset.motionVisibility = 'closing'; }
  target.style.left = clamp(x,8,innerWidth-target.offsetWidth-8)+'px';
  target.style.top = clamp(y,38,innerHeight-target.offsetHeight-8)+'px';
  reveal(target, { offset: -5, scale: .97, origin: 'left top', duration: 230 });
  target.querySelectorAll('[data-menu-index]').forEach(b=>b.addEventListener('click',()=>{closePopovers();items[Number(b.dataset.menuIndex)].run();}));
}
function toggleMenu(name,button){
  if(activeMenu===name&&isShown(menuPopover)){closePopovers();return;}
  closePopovers();activeMenu=name;button.classList.add('selected');
  const rect=button.getBoundingClientRect();renderMenu(menuDefinitions[name](),menuPopover,rect.x,38);
}

$('#menubar').innerHTML=`<button class="brand-button menu-button" data-menu="system" aria-label="Notes OS menu" title="Notes OS"><svg class="brand-mark" viewBox="0 0 22 24" aria-hidden="true"><path d="M3 21V3h4.8L15 15.1V3h4v18h-4.8L7 8.9V21Z"/><circle cx="20" cy="2" r="1"/></svg></button><button class="menu-active-app" id="active-app-name" data-menu="system">Notes OS</button>${['File','Edit','View','Window','Help'].map(name=>`<button class="menu-button menu-app-item" data-menu="${name}">${name}</button>`).join('')}<div class="menubar-workspaces" aria-label="Workspaces"><button class="workspace-button active" data-workspace="1" aria-pressed="true"><i></i>Writing</button><button class="workspace-button" data-workspace="2" aria-pressed="false"><i></i>Research</button></div><div class="system-status"><button class="sound-status" aria-label="Open soundscape" title="Tempo soundscape"><i class="sound-led"></i><span>Sound off</span></button><span class="status-wifi" title="Offline-ready workspace">${icon('wifi')}</span><span class="status-battery" title="Your notes stay on this device" style="margin:0 7px">${icon('battery')}</span><button class="icon-button" id="spotlight-trigger" aria-label="Search Notes OS" title="Find anything · Ctrl+K">${icon('search')}</button><button class="icon-button" id="control-trigger" aria-label="Open Control Center" title="Control Center">${icon('control')}</button><button class="clock-button" id="system-clock" aria-label="Date and time"></button></div>`;
$('#menubar').addEventListener('click',e=>{
  const menu=e.target.closest('[data-menu]');if(menu){toggleMenu(menu.dataset.menu,menu);return;}
  const workspace=e.target.closest('[data-workspace]');if(workspace){closePopovers();wm.switchWorkspace(Number(workspace.dataset.workspace));return;}
  if(e.target.closest('#spotlight-trigger'))openSpotlight();
  if(e.target.closest('#control-trigger')){const wasOpen=isShown(controlCenter);closePopovers();if(!wasOpen)renderControlCenter();}
  if(e.target.closest('.sound-status'))openApp('tempo');
  if(e.target.closest('#system-clock'))dialog({title:new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}),message:'No rush. There is room for one good thing today.',confirm:'A good reminder',content:`<div style="font:48px var(--serif);letter-spacing:-2px;margin:20px 0 5px">${esc(new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}))}</div><span class="eyebrow">YOUR LOCAL TIME</span>`});
});
function updateClock(){const now=new Date();$('#system-clock').textContent=now.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+'  '+now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:false});}
updateClock();setInterval(updateClock,15000);
function renderControlCenter(){
  const prefs=vfs.getPrefs();
  const wasOpen=isShown(controlCenter);
  controlCenter.innerHTML=`<div class="control-head"><h3>A few little controls.</h3><span>NOTES OS</span></div><div class="control-tiles"><button class="control-tile" data-control="theme">${icon(resolvedTheme()==='light'?'sun':'moon')}<b>${resolvedTheme()==='light'?'Daylight':'After hours'}</b><small>Click to change</small></button><button class="control-tile" data-control="sound">${icon(prefs.soundEnabled?'volume':'mute')}<b>Interface sound</b><small>${prefs.soundEnabled?'Soft sounds on':'Quiet mode'}</small></button><button class="control-tile" data-control="wallpaper">${icon('image')}<b>Wallpaper</b><small>A change of scenery</small></button><button class="control-tile" data-control="tempo">${icon('tempo')}<b>A little focus</b><small>${formatTime(focusTimer.getState().remaining)} waiting for you</small></button></div><div class="rule"></div><button class="menu-entry" data-control="ambient">${icon('headphones')}<span>${sound.isPlaying()?'Pause your soundscape':'Play a little atmosphere'}</span>${icon(sound.isPlaying()?'pause':'play','icon-sm')}</button><button class="menu-entry" data-control="settings">${icon('settings')}<span>All settings</span>${icon('chevron','icon-sm')}</button>`;
  if(!wasOpen)reveal(controlCenter,{offset:-7,scale:.965,origin:'right top',duration:300});
}
controlCenter.addEventListener('click',e=>{
  const action=e.target.closest('[data-control]')?.dataset.control;if(!action)return;
  if(action==='theme'){vfs.setPrefs({theme:resolvedTheme()==='light'?'dark':'light'});renderControlCenter();}
  if(action==='sound'){vfs.setPrefs({soundEnabled:!vfs.getPrefs().soundEnabled});sound.click();renderControlCenter();}
  if(action==='ambient'){sound.toggleMaster();renderControlCenter();}
  if(['wallpaper','tempo','settings'].includes(action)){closePopovers();openApp(action==='tempo'?'tempo':'settings',action==='wallpaper'?{section:'wallpaper'}:{});}
});

$('#dock').innerHTML=`${Object.entries(appNames).map(([id,name])=>`<button class="dock-item" data-app="${id}" aria-label="Launch ${name}" title="${name}">${appIcon(id)}<span class="dock-dot"></span><span class="dock-label">${name}</span></button>`).join('')}<div class="dock-divider"></div><button class="dock-item dock-trash" data-trash aria-label="Open Recently deleted" title="Recently deleted">${appIcon('trash')}<span class="dock-dot"></span><span class="dock-label">Recently deleted</span></button>`;
const dock = createDock($('#dock'));
$('#dock').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;closePopovers();if(b.dataset.app)openApp(b.dataset.app);else if(b.hasAttribute('data-trash'))openApp('files',{folder:'/Trash'});});
const desktopFiles=[{id:'personal',label:'Personal',type:'files',options:{folder:'/'},top:75},{id:'welcome',label:'Read me.md',type:'notes',options:{noteId:'welcome'},top:180}];
function renderDesktopFiles(){
  const positions=vfs.getPrefs().desktopPositions;
  $('#desktop-icons').innerHTML=desktopFiles.map(file=>{
    const stored=positions[file.id];const left=stored&&Number.isFinite(stored.x)?clamp(stored.x,0,innerWidth-100):null;const top=stored&&Number.isFinite(stored.y)?clamp(stored.y,42,innerHeight-180):file.top;
    const art=file.type==='files'?appIcon('files'): `<svg viewBox="0 0 60 68" aria-hidden="true"><path d="M10 3h28l12 12v49H10Z" fill="#faf7e6" stroke="#76836455"/><path d="M38 3v13h12" fill="#e1e5cf" stroke="#76836444"/><path d="M18 26h24M18 32h24M18 38h18M18 44h22M18 50h15" stroke="#a9b49588"/><text x="19" y="60" font-family="monospace" font-size="6" fill="#7b8a67">READ ME</text></svg>`;
    return `<button class="desktop-file" data-desktop="${file.id}" style="top:${top}px;${left!==null?`left:${left}px;right:auto;`:''}" aria-label="Desktop ${file.label}">${art}<span>${file.label}</span></button>`;
  }).join('');
}
renderDesktopFiles();
$('#desktop-icons').addEventListener('dblclick',e=>{const id=e.target.closest('[data-desktop]')?.dataset.desktop;const file=desktopFiles.find(f=>f.id===id);if(file)openApp(file.type,file.options);});
$('#desktop-icons').addEventListener('keydown',e=>{if(e.key==='Enter'){const id=e.target.closest('[data-desktop]')?.dataset.desktop;const file=desktopFiles.find(f=>f.id===id);if(file)openApp(file.type,file.options);}});
$('#desktop-icons').addEventListener('pointerdown',e=>{
  const button=e.target.closest('[data-desktop]');if(!button||e.button!==0)return;
  document.querySelectorAll('.desktop-file').forEach(b=>b.classList.toggle('selected',b===button));
  const rect=button.getBoundingClientRect(),start={x:e.clientX,y:e.clientY};let moved=false;
  button.setPointerCapture(e.pointerId);
  const move=event=>{if(Math.abs(event.clientX-start.x)+Math.abs(event.clientY-start.y)<5&&!moved)return;moved=true;button.style.left=clamp(rect.x+event.clientX-start.x,0,innerWidth-100)+'px';button.style.top=clamp(rect.y+event.clientY-start.y,42,innerHeight-170)+'px';button.style.right='auto';};
  const end=()=>{button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',end);button.removeEventListener('pointercancel',end);if(moved){const positions=vfs.getPrefs().desktopPositions;positions[button.dataset.desktop]={x:parseFloat(button.style.left),y:parseFloat(button.style.top)};vfs.setPrefs({desktopPositions:positions});}try{button.releasePointerCapture(e.pointerId);}catch{}};
  button.addEventListener('pointermove',move);button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);
});
$('#focus-widget').innerHTML=`<div class="focus-widget-head">${icon('tempo')} A LITTLE FOCUS</div><div class="focus-widget-time">25:00</div><div class="focus-widget-foot"><span>Make room for one thing</span>${icon('arrow')}</div>`;
$('#focus-widget').addEventListener('click',()=>openApp('tempo'));
let timerWasRunning=false;
focusTimer.subscribe(state=>{ $('#focus-widget .focus-widget-time').textContent=formatTime(state.remaining);$('#focus-widget .focus-widget-foot span').textContent=state.running?'One thing at a time':'Make room for one thing';if(timerWasRunning&&!state.running&&state.remaining===0)notify('A little progress. A well-earned pause.','Your focus session is complete');timerWasRunning=state.running; });
sound.subscribe(()=>{const button=$('.sound-status');button.classList.toggle('playing',sound.isPlaying());button.querySelector('span').textContent=sound.isPlaying()?'A little atmosphere':'Sound off';});

function makeSpotlightResults(query){
  const q=query.trim().toLowerCase();
  const apps=Object.entries(appNames).filter(([,name])=>!q||name.toLowerCase().includes(q)).map(([id,name])=>({title:name,detail:'Application',icon:id,kind:'Open',run:()=>openApp(id)}));
  const notes=vfs.listNotes({query:q}).slice(0,q?8:3).map(n=>({title:n.title,detail:n.folder.slice(1)+' · Note',icon:'note',kind:'Note',run:()=>openApp('notes',{noteId:n.id})}));
  const actions=[{title:'New note',detail:'A fresh place to begin',icon:'edit',kind:'Action',run:newNote},{title:'Quick scratchpad',detail:'Before the thought goes',icon:'note',kind:'Action',run:scratchpad},{title:'Toggle dark mode',detail:'Change the feeling',icon:'moon',kind:'Action',run:()=>vfs.setPrefs({theme:resolvedTheme()==='dark'?'light':'dark'})},{title:'Change wallpaper',detail:'A different view',icon:'image',kind:'Action',run:()=>openApp('settings',{section:'wallpaper'})},{title:'Window overview',detail:'All your open windows',icon:'grid',kind:'Action',run:()=>wm.toggleExpose()}].filter(a=>q&&`${a.title} ${a.detail}`.toLowerCase().includes(q));
  return q?[...apps,...notes,...actions].slice(0,12):[...apps.slice(0,3),...notes];
}
function renderSpotlightResults(){
  const q=$('#spotlight-input').value;spotlightResults=makeSpotlightResults(q);spotlightIndex=0;
  $('.spotlight-label').textContent=q?'A FEW THINGS YOU MIGHT MEAN':'YOUR SPACE, AT A GLANCE';
  $('.spotlight-results').innerHTML=spotlightResults.map((r,i)=>`<button class="spotlight-result${i===spotlightIndex?' selected':''}" role="option" aria-selected="${i===spotlightIndex}" id="spotlight-option-${i}" data-result="${i}">${icon(r.icon)}<span><b>${esc(r.title)}</b><small>${esc(r.detail)}</small></span><span>${r.kind}</span></button>`).join('')||'<div class="empty-state"><h3>Nothing here, yet.</h3><p>Try a title, a word, or an app.</p></div>';
  $('#spotlight-input').setAttribute('aria-activedescendant',spotlightResults.length?'spotlight-option-0':'');
}
function closeSpotlight(){dismiss(spotlightLayer,{offset:0,scale:1});const panel=spotlightLayer.querySelector('.spotlight');if(panel)motion.play(panel,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-6px) scale(.985)'}],{duration:180});returnFocus?.isConnected&&returnFocus.focus();}
function openSpotlight(){
  closePopovers();returnFocus=document.activeElement;
  spotlightLayer.innerHTML=`<section class="spotlight" role="dialog" aria-modal="true" aria-label="Find anything"><div class="spotlight-input-wrap">${icon('search')}<input id="spotlight-input" aria-label="Find apps, notes and actions" role="combobox" aria-controls="spotlight-results" aria-expanded="true" autocomplete="off" placeholder="A thought, an app, anything…"><kbd>esc</kbd></div><div class="spotlight-label"></div><div class="spotlight-results" id="spotlight-results" role="listbox" aria-label="Search results"></div><div class="spotlight-footer"><span><kbd>↑ ↓</kbd> to explore</span><span><kbd>↵</kbd> to open</span><span class="spacer"></span><span>A LITTLE LESS SEARCHING.</span></div></section>`;
  reveal(spotlightLayer,{offset:0,scale:1});
  motion.play(spotlightLayer.querySelector('.spotlight'),[{opacity:0,transform:'translateY(-12px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:350});
  renderSpotlightResults();$('#spotlight-input').focus();
  $('#spotlight-input').addEventListener('input',renderSpotlightResults);
}
spotlightLayer.addEventListener('click',e=>{if(e.target===spotlightLayer)closeSpotlight();const b=e.target.closest('[data-result]');if(b){const r=spotlightResults[Number(b.dataset.result)];closeSpotlight();r?.run();}});
spotlightLayer.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSpotlight();return;}
  if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(!spotlightResults.length)return;spotlightIndex=(spotlightIndex+(e.key==='ArrowDown'?1:-1)+spotlightResults.length)%spotlightResults.length;spotlightLayer.querySelectorAll('[data-result]').forEach((b,i)=>{b.classList.toggle('selected',i===spotlightIndex);b.setAttribute('aria-selected',String(i===spotlightIndex));});const selected=$(`#spotlight-option-${spotlightIndex}`);$('#spotlight-input').setAttribute('aria-activedescendant',selected.id);selected.scrollIntoView({block:'nearest'});}
  if(e.key==='Enter'){e.preventDefault();const r=spotlightResults[spotlightIndex];if(r){closeSpotlight();r.run();}}
  trapFocus(e,spotlightLayer);
});

document.addEventListener('pointerdown',e=>{if(!e.target.closest('.popover,[data-menu],#control-trigger'))closePopovers();});
document.addEventListener('contextmenu',e=>{
  if(e.target.closest('.window-content,input,textarea'))return;
  if(!e.target.closest('#desktop'))return;
  e.preventDefault();closePopovers();
  const windowEl=e.target.closest('.os-window');
  const items=windowEl?[{label:'Minimize window',icon:'minus',run:()=>wm.minimize(windowEl.dataset.app)},{label:'Maximize / restore',icon:'maximize',run:()=>wm.toggleMaximize(windowEl.dataset.app)},{label:'Tile to the left',icon:'back',run:()=>wm.snap(windowEl.dataset.app,'left')},{label:'Tile to the right',icon:'chevron',run:()=>wm.snap(windowEl.dataset.app,'right')},{separator:true},{label:'Close window',icon:'close',run:()=>wm.close(windowEl.dataset.app)}]:[{label:'New note',icon:'edit',run:newNote},{label:'Quick scratchpad',icon:'note',run:scratchpad},{separator:true},{label:'Change wallpaper…',icon:'image',run:()=>openApp('settings',{section:'wallpaper'})},{label:'Show desktop',icon:'monitor',run:()=>wm.showDesktop()},{label:'Find anything',icon:'search',shortcut:'Ctrl K',run:openSpotlight}];
  renderMenu(items,contextMenu,e.clientX,e.clientY,windowEl?appNames[windowEl.dataset.app]:'A little space of your own');
});
document.addEventListener('keydown',e=>{
  if(isShown($('#dialog-layer')))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();isShown(spotlightLayer)?closeSpotlight():openSpotlight();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'&&!e.defaultPrevented){e.preventDefault();newNote();}
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='w'){e.preventDefault();wm.close();}
  if(e.altKey&&['1','2'].includes(e.key)){e.preventDefault();wm.switchWorkspace(Number(e.key));}
  if(e.key==='Escape')closePopovers();
});
async function applyPrefs(){
  const prefs=vfs.getPrefs(),theme=resolvedTheme();
  setMotionPreference(prefs.motion);
  document.documentElement.dataset.theme=theme;document.documentElement.style.setProperty('--accent',prefs.accent);document.documentElement.style.setProperty('--accent-soft',prefs.accent+'14');
  const key=`${prefs.wallpaper}:${theme}:${prefs.accent}`;
  if(lastWallpaper!==key){
    const request=++wallpaperSequence,stage=$('#wallpaper-stage'),previous=stage.lastElementChild;
    for(const old of [...stage.children])if(old!==previous){motion.stop(old);old.remove();}
    let next;
    if(prefs.wallpaper.startsWith('custom-')){
      const [url,record]=await Promise.all([wallpaperStore.url(prefs.wallpaper),wallpaperStore.get(prefs.wallpaper)]);
      if(request!==wallpaperSequence)return;
      if(url&&record){next=document.createElement('img');next.src=url;next.alt='';next.className='custom-wallpaper';next.dataset.fit=record.fit||'cover';stage.append(next);}
      else{vfs.setPrefs({wallpaper:'topographic'});return;}
    }else{stage.insertAdjacentHTML('beforeend',renderWallpaper(prefs.wallpaper,theme,prefs.accent));next=stage.lastElementChild;}
    if(previous&&lastWallpaper&&!reducedMotion())motion.play(next,[{opacity:0},{opacity:1}],{duration:durations.wallpaper,continuity:[]},()=>previous.remove());
    else previous?.remove();
    lastWallpaper=key;
  }
  if(wm.getWorkspace()!==prefs.workspace)wm.switchWorkspace(prefs.workspace);
}
let shownStorageError='';
vfs.subscribe(event=>{if(event.type==='prefs'||event.type==='reset')applyPrefs();if(event.storageError&&shownStorageError!==event.storageError){shownStorageError=event.storageError;notify(event.storageError,'Your workspace needs a little care');}});
media.addEventListener('change',applyPrefs);
applyPrefs();
const small=innerWidth<760;
const showCanvas=innerWidth>=1120&&innerHeight>=650;
const notesX=small?8:Math.max(45,Math.round(innerWidth*.05));
const notesWidth=small?innerWidth-16:Math.min(960,innerWidth-notesX-(showCanvas?370:45));
if(showCanvas)openApp('canvas',{compact:true,bounds:{x:Math.min(innerWidth-382,notesX+notesWidth-14),y:Math.min(488,innerHeight-351),width:350,height:275}});
openApp('notes',{bounds:{x:notesX,y:small?43:77,width:notesWidth,height:small?innerHeight-148:Math.min(640,innerHeight-199)}});
function finishBoot(){const boot=$('#boot-screen');if(!boot)return;boot.classList.add('leaving');setTimeout(()=>boot.remove(),460);}
$('#skip-boot').addEventListener('click',finishBoot,{once:true});setTimeout(finishBoot,550);
if(vfs.getStorageError())setTimeout(()=>notify(vfs.getStorageError(),'Your original data has been kept'),1000);
window.addEventListener('beforeunload',e=>{if(vfs.getStorageError()){e.preventDefault();e.returnValue='';}});
