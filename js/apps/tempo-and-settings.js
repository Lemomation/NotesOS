import { icon } from '../icons.js';
import { WALLPAPERS, renderWallpaper } from '../wallpapers.js';
import { focusTimer, formatTime } from '../sound.js';
import { escapeHTML as esc, downloadFile } from '../utils.js';
import { createFullBackup, parseBackup } from '../backup.js';

export function mountTempoApp(container, context) {
  const {sound}=context;
  const abort=new AbortController(),opts={signal:abort.signal};
  const stems=[['rain','Rain at the window'],['drone','Warm tape'],['keys','Soft keys'],['vinyl','Vinyl texture']];
  container.innerHTML=`<div class="tempo-app"><div class="tempo-header"><span class="tempo-brand">Time, well spent.</span><span class="tempo-model">TM—01</span></div><div class="tempo-presets"><div class="segmented" aria-label="Timer presets">${[['Focus',25],['Break',5],['Deep',50]].map(([name,minutes])=>`<button data-preset="${name}" data-minutes="${minutes}">${name} <span style="opacity:.5">${minutes}</span></button>`).join('')}</div></div><div class="timer-dial"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="timer-track" cx="100" cy="100" r="89"/>${Array.from({length:60},(_,i)=>{const a=i*Math.PI/30;const r=i%5===0?77:80;return`<line class="timer-ticks" x1="${100+Math.cos(a)*r}" y1="${100+Math.sin(a)*r}" x2="${100+Math.cos(a)*83}" y2="${100+Math.sin(a)*83}"/>`;}).join('')}<circle class="timer-progress" cx="100" cy="100" r="89" stroke-dasharray="559.2"/></svg><div class="timer-display"><span class="timer-digits" role="timer" aria-label="Focus time remaining"></span><span class="eyebrow timer-message">ONE THING AT A TIME</span></div></div><div class="timer-controls"><button class="primary-button timer-start" data-action="start"></button><button class="icon-button timer-reset" data-action="reset" aria-label="Reset timer">${icon('reset')}</button></div><div class="tempo-session"></div><div class="mixer-header">${icon('headphones')}<h3>A little atmosphere</h3><button data-action="audio" aria-label="Toggle ambient audio"></button></div><div class="mixer-stems">${stems.map(([id,name])=>`<label class="stem"><span class="stem-label">${name}<span data-level="${id}"></span></span><input type="range" min="0" max="100" data-stem="${id}" aria-label="${name} volume"></label>`).join('')}</div><canvas class="tempo-waveform" aria-label="Ambient audio waveform"></canvas><div class="tempo-footer"><span>ANALOG IN SPIRIT.</span><span>STEREO / LOCAL</span></div></div>`;
  function updateTimer(state){
    container.querySelector('.timer-digits').textContent=formatTime(state.remaining);
    container.querySelector('.timer-progress').style.strokeDashoffset=559.2*(1-state.remaining/state.duration);
    container.querySelector('.timer-start').innerHTML=`${icon(state.running?'pause':'play')}${state.running?'Take a pause':state.remaining<state.duration?'Continue':'Begin session'}`;
    container.querySelector('.timer-start').setAttribute('aria-label',state.running?'Pause focus timer':'Start focus timer');
    container.querySelector('.timer-message').textContent=state.running?'A LITTLE ROOM TO FOCUS':state.remaining===0?'A MOMENT WELL SPENT':'ONE THING AT A TIME';
    container.querySelector('.tempo-session').textContent=`${state.sessions} ${state.sessions===1?'session':'sessions'} completed · A little progress is still progress.`;
    container.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===state.preset));
  }
  function updateAudio(){
    const levels=sound.getLevels(),playing=sound.isPlaying();
    const button=container.querySelector('[data-action="audio"]');button.textContent=playing?'SOUND ON':'SOUND OFF';button.classList.toggle('playing',playing);
    for(const [id] of stems){container.querySelector(`[data-stem="${id}"]`).value=levels[id]*100;container.querySelector(`[data-level="${id}"]`).textContent=Math.round(levels[id]*100);}
  }
  container.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.preset){focusTimer.setPreset(b.dataset.preset,Number(b.dataset.minutes)*60);return;}
    if(b.dataset.action==='start')focusTimer.toggle();
    if(b.dataset.action==='reset')focusTimer.reset();
    if(b.dataset.action==='audio')sound.toggleMaster();
  },opts);
  container.addEventListener('input',e=>{if(e.target.dataset.stem)sound.setStemLevel(e.target.dataset.stem,Number(e.target.value)/100);},opts);
  const offTimer=focusTimer.subscribe(updateTimer),offSound=sound.subscribe(updateAudio);
  updateTimer(focusTimer.getState());updateAudio();
  const canvas=container.querySelector('canvas'),draw=canvas.getContext('2d');let animation;
  function paint(){
    const rect=canvas.getBoundingClientRect(),ratio=devicePixelRatio||1;
    if(rect.width>0){
      const width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      draw.clearRect(0,0,width,height);draw.strokeStyle=getComputedStyle(container).getPropertyValue('--sage').trim()||'#63816a';draw.lineWidth=ratio;draw.beginPath();
      const data=sound.getAnalyserData();
      data.forEach((value,i)=>{const x=i/(data.length-1)*width,y=height/2+(value-128)/128*height*.48;if(!i)draw.moveTo(x,y);else draw.lineTo(x,y);});draw.stroke();
    }
    animation=requestAnimationFrame(paint);
  }
  paint();
  return{destroy(){offTimer();offSound();abort.abort();cancelAnimationFrame(animation);}};
}

const accents=[['Terracotta','#b85f40'],['Garden sage','#63816a'],['Golden hour','#ba943e'],['Slate blue','#567e87'],['Soft plum','#987d90']];
export function mountSettingsApp(container,context){
  const {vfs,sound,wallpaperStore,extensionStorage,dialog,notify}=context;
  const abort=new AbortController(),opts={signal:abort.signal};
  let section=context.options.section||'appearance',customWallpapers=[];
  let wallpaperUrls=new Map();
  async function loadWallpapers(){customWallpapers=await wallpaperStore.list();for(const item of customWallpapers){const url=await wallpaperStore.url(item.id);if(url)wallpaperUrls.set(item.id,url);}if(section==='wallpaper')render();}
  loadWallpapers().catch(error=>notify(error.message,'Wallpaper library'));
  container.innerHTML='<div class="settings-app"><aside class="settings-sidebar" aria-label="Settings navigation"></aside><section class="settings-main" aria-label="Settings content"></section></div>';
  const sidebar=container.querySelector('.settings-sidebar'),main=container.querySelector('.settings-main');
  function render(){
    const prefs=vfs.getPrefs(),dark=document.documentElement.dataset.theme==='dark';
    sidebar.innerHTML=`<div class="settings-identity"><strong>Make it yours.</strong><span>NOTES OS / PREFERENCES</span></div>${[['appearance','sun','Appearance'],['wallpaper','image','Wallpaper'],['sound','volume','Sound'],['storage','folder','Your workspace'],['about','info','About']].map(([id,glyph,name])=>`<button class="sidebar-nav${section===id?' active':''}" data-section="${id}" title="${name}">${icon(glyph)}<span class="nav-label">${name}</span></button>`).join('')}`;
    if(section==='appearance')main.innerHTML=`<h2>Set the feeling.</h2><p>A little change can make a space feel like yours.</p><div class="settings-section"><h3>Appearance</h3><div class="theme-options">${[['light','Daylight'],['dark','After hours'],['system','With the day']].map(([id,name])=>`<button class="theme-option${prefs.theme===id?' active':''}" data-theme-choice="${id}" aria-label="${name} theme" aria-pressed="${prefs.theme===id}"><div class="theme-preview ${id}"></div><span>${name}${prefs.theme===id?icon('check'):''}</span></button>`).join('')}</div></div><div class="settings-section"><h3>A small accent</h3><div class="accent-options">${accents.map(([name,color])=>`<button class="accent-choice${prefs.accent===color?' active':''}" data-accent="${color}" style="background:${color}" title="${name}" aria-label="${name} accent"></button>`).join('')}<span class="accent-caption">${accents.find(a=>a[1]===prefs.accent)?.[0]||'Personal'}</span></div></div><div class="settings-section"><h3>The way things move</h3><div class="segmented" aria-label="Motion preference">${[['smooth','Smooth'],['system','Follow device'],['reduced','Reduced']].map(([id,name])=>`<button data-motion-choice="${id}" class="${prefs.motion===id?'active':''}" aria-label="${name} motion" aria-pressed="${prefs.motion===id}">${name}</button>`).join('')}</div></div><div class="settings-notice">${prefs.motion==='smooth'?'Fluid motion, just for Notes OS. Your system preference stays untouched.':prefs.motion==='reduced'?'Minimal movement. The same space, a little quieter.':'Motion follows your device’s accessibility preference.'} All settings stay on this device.</div><button class="secondary-button" data-section="wallpaper">Choose a different view ${icon('arrow','icon-sm')}</button>`;
    else if(section==='wallpaper')main.innerHTML=`<h2>A change of scenery.</h2><p>Eight drawn worlds, plus as many of your own as you like.</p><div class="wallpaper-grid">${WALLPAPERS.map(w=>`<button class="wallpaper-choice${prefs.wallpaper===w.id?' active':''}" data-wallpaper="${w.id}" aria-label="${w.name} wallpaper" aria-pressed="${prefs.wallpaper===w.id}"><div class="wallpaper-thumbnail">${renderWallpaper(w.id,dark?'dark':'light',prefs.accent)}</div><span>${w.name}${prefs.wallpaper===w.id?icon('check','icon-sm'):''}</span><small>${w.detail}</small></button>`).join('')}${customWallpapers.map(w=>`<div class="custom-wallpaper-choice${prefs.wallpaper===w.id?' active':''}"><button class="wallpaper-choice" data-wallpaper="${w.id}" aria-label="${esc(w.name)} wallpaper" aria-pressed="${prefs.wallpaper===w.id}"><div class="wallpaper-thumbnail"><img src="${esc(wallpaperUrls.get(w.id)||'')}" alt="" style="object-fit:${w.fit==='center'?'contain':w.fit}"></div><span>${esc(w.name)}${prefs.wallpaper===w.id?icon('check','icon-sm'):''}</span><small>${(w.type.split('/')[1]||'image').toUpperCase()} · ${(w.size/1048576).toFixed(1)} MB</small></button><div class="custom-wallpaper-tools"><select data-wallpaper-fit="${w.id}" aria-label="Fit for ${esc(w.name)}"><option value="cover"${w.fit==='cover'?' selected':''}>Fill</option><option value="contain"${w.fit==='contain'?' selected':''}>Fit</option><option value="center"${w.fit==='center'?' selected':''}>Center</option></select><button class="icon-button" data-remove-wallpaper="${w.id}" aria-label="Remove ${esc(w.name)}">${icon('trash','icon-sm')}</button></div></div>`).join('')}</div><div class="settings-upload"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-wallpaper-file hidden><button class="secondary-button" data-action="upload-wallpaper">${icon('plus','icon-sm')} Upload PNG, JPG, WebP or SVG</button><span>Stored only on this device · 20 MB max</span></div><div class="settings-notice">Uploaded SVGs are displayed as isolated images, not executed as page code. Use Full backup under Your workspace to include custom image files.</div>`;
    else if(section==='sound')main.innerHTML=`<h2>Sounds like home.</h2><p>Just enough sound to make the space feel alive.</p><div class="settings-row"><div><b>Little interface sounds</b><p>Soft feedback when you open a window or finish a session.</p></div><button class="toggle" role="switch" aria-label="Interface sounds" aria-checked="${prefs.soundEnabled}" data-action="ui-sound"></button></div><div class="settings-row"><div><b>Ambient soundscape</b><p>Rain, warm tape, soft keys and a hint of vinyl.</p></div><button class="toggle" role="switch" aria-label="Ambient soundscape" aria-checked="${sound.isPlaying()}" data-action="ambient"></button></div><div class="settings-notice">Audio is generated here, on your device. No streams, no trackers, no sudden surprises. Nothing plays until you press play.</div><button class="secondary-button" data-action="open-tempo">${icon('headphones','icon-sm')} Open the sound mixer</button>`;
    else if(section==='storage'){
      const state=vfs.getState(),size=new TextEncoder().encode(vfs.exportWorkspaceJSON()).length;
      const bytes=[state.notes,state.canvas,state.prefs].map(value=>new TextEncoder().encode(JSON.stringify(value)).length);
      const total=bytes.reduce((sum,value)=>sum+value,0);
      const shares=bytes.map(value=>(value/total*100).toFixed(1));
      main.innerHTML=`<h2>Your space, kept close.</h2><p>Everything is saved in this browser, on this device.</p><div class="settings-section"><h3>Personal workspace · ${(size/1024).toFixed(1)} KB</h3><div class="storage-meter"><i style="width:${shares[0]}%"></i><i style="width:${shares[1]}%"></i><i style="width:${shares[2]}%"></i></div><div class="storage-legend"><span><i></i>${vfs.listNotes().length} notes</span><span><i style="background:var(--ochre)"></i>${state.canvas.nodes.length} canvas cards</span><span><i style="background:var(--accent)"></i>Preferences</span></div></div><div class="settings-row"><div><b>Keep a copy</b><p>Download all your notes, canvas cards and settings as JSON.</p></div><div style="display:flex;gap:6px"><button class="secondary-button" data-action="export">${icon('download','icon-sm')} Workspace JSON</button><button class="secondary-button" data-action="full-export">${icon('download','icon-sm')} Full backup</button></div></div><div class="settings-row"><div><b>Bring a workspace in</b><p>Import a Notes OS JSON or full backup after reviewing a confirmation.</p></div><input type="file" accept="application/json,.json" data-workspace-file hidden><button class="secondary-button" data-action="import">${icon('arrowDown','icon-sm')} Import</button></div><div class="settings-row"><div><b>Recently deleted</b><p>${vfs.listNotes({trash:true}).length} notes you can still bring back.</p></div><button class="secondary-button" data-action="trash">View</button></div><div class="settings-notice">${vfs.getStorageError()?esc(vfs.getStorageError()):'A browser is a lovely place to work, but not a backup. Clearing site data or using a private window can remove your notes. Export a copy of anything important.'}</div><button class="secondary-button danger-button" data-action="reset">Reset to a fresh workspace</button>`;
    }else main.innerHTML=`<div class="about-brand">Notes<span>OS</span><sup style="font:11px var(--sans);vertical-align:top">®</sup></div><div class="about-version">PERSONAL EDITION / VERSION 1.0</div><h2>A little room to think.</h2><p style="margin-top:14px;line-height:1.9">A quieter corner of the internet. A few carefully made tools. And space for the thoughts that make you, you.</p><div class="settings-notice">This is an interactive browser desktop, not an operating-system kernel. Your collections live in local browser storage. The terminal operates only on that workspace—it cannot run system commands.</div><p>Built with HTML, CSS, JavaScript, and a belief that useful things can be beautiful.</p><div class="rule"></div><span class="eyebrow">LESS NOISE. MORE POSSIBILITY.</span>`;
  }
  container.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.section){section=b.dataset.section;render();main.scrollTop=0;return;}
    if(b.dataset.motionChoice){vfs.setPrefs({motion:b.dataset.motionChoice});return;}
    if(b.dataset.themeChoice){vfs.setPrefs({theme:b.dataset.themeChoice});return;}
    if(b.dataset.accent){vfs.setPrefs({accent:b.dataset.accent});return;}
    if(b.dataset.removeWallpaper){
      const removing=b.dataset.removeWallpaper,yes=await dialog({title:'Remove this wallpaper?',message:'The image will be deleted from Notes OS. The original file on your computer is untouched.',confirm:'Remove wallpaper',danger:true});
      if(yes){if(vfs.getPrefs().wallpaper===removing)vfs.setPrefs({wallpaper:'topographic'});await wallpaperStore.remove(removing);await loadWallpapers();notify('Custom wallpaper removed.');}return;
    }
    if(b.dataset.wallpaper){vfs.setPrefs({wallpaper:b.dataset.wallpaper});return;}
    switch(b.dataset.action){
      case 'ui-sound':vfs.setPrefs({soundEnabled:!vfs.getPrefs().soundEnabled});sound.click();break;
      case 'ambient':sound.toggleMaster();break;
      case 'open-tempo':context.openApp('tempo');break;
      case 'upload-wallpaper':main.querySelector('[data-wallpaper-file]').click();break;
      case 'trash':context.openApp('files',{folder:'/Trash'});break;
      case 'export':downloadFile('notes-os-workspace.json',vfs.exportWorkspaceJSON(),'application/json');notify('Workspace JSON exported. Custom image files are not included.');break;
      case 'full-export':{const backup=await createFullBackup(vfs.getState(),wallpaperStore);downloadFile('notes-os-full-backup.json',backup,'application/json');notify('Full backup exported with custom wallpapers.');break;}
      case 'import':main.querySelector('[data-workspace-file]').click();break;
      case 'reset':{const yes=await dialog({title:'Begin again?',message:'This replaces your notes, canvas and settings with the original starter workspace. Export a copy first if there is anything you want to keep.',confirm:'Reset workspace',danger:true});if(yes){vfs.resetVFS();notify('A fresh page. Make yourself at home.');}break;}
    }
  },opts);
  container.addEventListener('change',async e=>{
    try{
      if(e.target.matches('[data-wallpaper-file]')){
        const file=e.target.files?.[0];if(!file)return;const record=await wallpaperStore.add(file);await loadWallpapers();vfs.setPrefs({wallpaper:record.id});notify(`“${record.name}” added to your wallpaper library.`);e.target.value='';
      }else if(e.target.matches('[data-wallpaper-fit]')){
        await wallpaperStore.setFit(e.target.dataset.wallpaperFit,e.target.value);await loadWallpapers();if(vfs.getPrefs().wallpaper===e.target.dataset.wallpaperFit){vfs.setPrefs({wallpaper:'topographic'});queueMicrotask(()=>vfs.setPrefs({wallpaper:e.target.dataset.wallpaperFit}));}
      }else if(e.target.matches('[data-workspace-file]')){
        const file=e.target.files?.[0];if(!file)return;const parsed=parseBackup(await file.text());const yes=await dialog({title:'Replace this workspace?',message:`This import contains ${parsed.workspace.notes.length} notes${parsed.wallpapers.length?` and ${parsed.wallpapers.length} custom wallpapers`:''}. Export a backup first if you want to keep the current workspace.`,confirm:'Import workspace',danger:true});
        if(yes){if(parsed.wallpapers.length)await wallpaperStore.importAll(parsed.wallpapers);vfs.importWorkspace(parsed.workspace);await extensionStorage?.flush?.();await loadWallpapers();notify(parsed.full?'Full backup imported.':'Workspace imported. Custom wallpaper files were not included in this JSON.');}e.target.value='';
      }
    }catch(error){notify(error.message,'Could not complete that import');e.target.value='';}
  },opts);
  const wallpaperSubscription=wallpaperStore.subscribe(()=>loadWallpapers().catch(()=>{}));
  const unsubscribe=vfs.subscribe(e=>{if(['prefs','notes','reset','canvas'].includes(e.type))render();});
  const offSound=sound.subscribe(()=>{if(section==='sound')render();});
  render();return{openSection(id){section=id;render();},destroy(){unsubscribe();offSound();wallpaperSubscription();abort.abort();}};
}
