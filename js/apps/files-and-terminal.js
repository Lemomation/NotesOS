import { icon, appIcon } from '../icons.js';
import { escapeHTML as esc, relativeDate, stripMarkdown, wordCount } from '../utils.js';
import { COMMANDS, executeCommand } from '../terminal.js';

const paper = note => `<div class="file-paper" aria-hidden="true"><b>${esc(note.title.slice(0,22))}</b>${'<i></i>'.repeat(5)}</div>`;
export function mountFilesApp(container, context) {
  const {vfs, openApp, dialog, notify} = context;
  const abort=new AbortController(), opts={signal:abort.signal};
  let folder=context.options.folder||'/Notes',query='',view='grid',selectedId=null;
  container.innerHTML=`<div class="files-app"><aside class="files-sidebar" aria-label="File collections"></aside><div class="files-main"><div class="files-toolbar"><button class="icon-button" data-action="home" aria-label="All collections" title="All collections">${icon('back')}</button><span class="files-path"></span><div class="spacer"></div><input class="files-search" type="search" aria-label="Search files" placeholder="Search files"><div class="segmented"><button data-view="grid" class="active" aria-label="Grid view">${icon('grid','icon-sm')}</button><button data-view="list" aria-label="List view">${icon('list','icon-sm')}</button></div><button class="icon-button" data-action="new-note" aria-label="Create note in Files" title="New note">${icon('plus')}</button><button class="icon-button" data-action="new-folder" aria-label="New collection" title="New collection">${icon('folder')}</button></div><div class="files-content"><div class="files-items files-grid" role="list"></div><aside class="file-inspector" aria-label="File information" hidden></aside></div><footer class="files-status"></footer></div></div>`;
  const items=container.querySelector('.files-items'),sidebar=container.querySelector('.files-sidebar'),inspector=container.querySelector('.file-inspector');
  function render() {
    const notes=vfs.listNotes({...folder==='/'?{}:{folder},query});
    sidebar.innerHTML=`<div class="sidebar-section-title">Personal space</div><button class="sidebar-nav${folder==='/'?' active':''}" data-folder="/" title="All collections">${icon('monitor')}<span class="nav-label">My space</span></button><div class="sidebar-section-title">Collections</div>${vfs.getFolders().map(f=>`<button class="sidebar-nav${folder===f?' active':''}" data-folder="${esc(f)}" title="${esc(f.slice(1))}">${icon(f==='/Journal'?'journal':'folder')}<span class="nav-label">${esc(f.slice(1))}</span></button>`).join('')}<div class="spacer"></div><button class="sidebar-nav${folder==='/Trash'?' active':''}" data-folder="/Trash" title="Recently deleted">${icon('trash')}<span class="nav-label">Recently deleted</span></button>`;
    container.querySelector('.files-path').innerHTML=`${icon('folder')}<span>${folder==='/'?'My space':esc(folder.slice(1))}</span>`;
    items.className=`files-items files-${view}`;
    const folders=folder==='/'&&!query?vfs.getFolders().map(f=>`<button class="file-card" data-folder="${esc(f)}" role="listitem" aria-label="Open collection ${esc(f.slice(1))}">${appIcon('files',51)}<span class="file-card-label">${esc(f.slice(1))}<small>${vfs.listNotes({folder:f}).length} notes</small></span></button>`).join(''):'';
    items.innerHTML=folders+notes.map(n=>`<button class="file-card${selectedId===n.id?' selected':''}" data-file="${esc(n.id)}" role="listitem" aria-label="File: ${esc(n.title)}">${paper(n)}<span class="file-card-label">${esc(n.title)}<small>${relativeDate(n.updatedAt)}</small></span></button>`).join('');
    if(!items.innerHTML)items.innerHTML='<div class="empty-state"><h3>A little room.</h3><p>No notes here yet.</p></div>';
    container.querySelector('.files-status').innerHTML=`<span>${notes.length} notes</span><span>·</span><span>${folder==='/'?'Personal space':esc(folder)}</span><span class="spacer"></span><span>Stored on this device</span>`;
    renderInspector();
  }
  function renderInspector() {
    const n=vfs.getNote(selectedId);inspector.hidden=!n;if(!n)return;
    inspector.innerHTML=`${paper(n)}<h3>${esc(n.title)}</h3><div class="inspector-row"><span>Kind</span><span>Markdown note</span></div><div class="inspector-row"><span>Collection</span><span>${esc(n.folder.slice(1))}</span></div><div class="inspector-row"><span>Words</span><span>${wordCount(n.body)}</span></div><div class="inspector-row"><span>Edited</span><span>${relativeDate(n.updatedAt)}</span></div><div class="inspector-preview">${esc(stripMarkdown(n.body).slice(0,240))}</div><div class="inspector-actions"><button class="secondary-button" data-action="open">${icon('arrow')} Open</button><button class="secondary-button" data-action="rename">${icon('edit')} Rename</button><button class="secondary-button" data-action="duplicate">${icon('copy')} Duplicate</button><button class="secondary-button" data-action="${n.deleted?'restore':'trash'}">${icon(n.deleted?'reset':'trash')} ${n.deleted?'Restore':'Trash'}</button></div>`;
  }
  function openFolder(path){folder=path;selectedId=null;render();}
  container.addEventListener('click',async e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.folder){openFolder(button.dataset.folder);return;}
    if(button.dataset.file){selectedId=button.dataset.file;items.querySelectorAll('[data-file]').forEach(item=>item.classList.toggle('selected',item.dataset.file===selectedId));renderInspector();return;}
    if(button.dataset.view){view=button.dataset.view;container.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));render();return;}
    const n=vfs.getNote(selectedId);
    switch(button.dataset.action){
      case 'home':openFolder('/');break;
      case 'open':if(n)openApp('notes',{noteId:n.id});break;
      case 'new-note':{const note=vfs.createNote({folder:folder==='/'||folder==='/Trash'?'/Notes':folder});selectedId=note.id;openApp('notes',{noteId:note.id});break;}
      case 'new-folder':{const name=await dialog({title:'A place for a few things.',message:'Name your new collection.',input:'',placeholder:'Collection name',confirm:'Create collection'});if(name){try{openFolder(vfs.createFolder(name));notify('Your new collection is ready.');}catch(error){notify(error.message);}}break;}
      case 'rename':{if(!n)break;const title=await dialog({title:'A new name.',message:'Give this thought a title.',input:n.title,confirm:'Rename'});if(title?.trim())vfs.updateNote(n.id,{title:title.trim()});break;}
      case 'duplicate':if(n){const duplicate=vfs.duplicateNote(n.id);selectedId=duplicate.id;render();notify('A copy, just in case.');}break;
      case 'trash':if(n){vfs.deleteNote(n.id);selectedId=null;render();notify('Moved to Recently deleted.');}break;
      case 'restore':if(n){vfs.restoreNote(n.id);openFolder(n.folder);notify('Back where it belongs.');}break;
    }
  },opts);
  container.addEventListener('dblclick',e=>{const el=e.target.closest('[data-file]');if(el)openApp('notes',{noteId:el.dataset.file});},opts);
  container.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest('[data-file]'))openApp('notes',{noteId:e.target.closest('[data-file]').dataset.file});},opts);
  container.querySelector('.files-search').addEventListener('input',e=>{query=e.target.value;render();},opts);
  const unsubscribe=vfs.subscribe(e=>{if(['notes','folders','reset'].includes(e.type))render();});
  render();return{openFolder,destroy(){unsubscribe();abort.abort();}};
}

export function mountTerminalApp(container, context) {
  const {vfs,openApp}=context;
  const abort=new AbortController(),opts={signal:abort.signal};
  const shell={cwd:'/'};const history=[];let historyIndex=0,draft='';
  container.innerHTML=`<div class="terminal-app"><div class="terminal-scroll" aria-label="Terminal output"><div class="terminal-welcome"><div class="terminal-brand"><pre>╭────────╮\n│  N /   │\n│   / OS │\n╰────────╯</pre><div><h2>A quieter kind of terminal.</h2><small>NOTES-SH / PERSONAL EDITION</small></div></div><p>A few useful commands. Nothing to get in the way.</p><p>Try <button class="terminal-command-chip" data-command="help">help</button>, <button class="terminal-command-chip" data-command="ls">ls</button>, or <button class="terminal-command-chip" data-command="neofetch">neofetch</button>.</p></div><div class="terminal-output" aria-live="polite"></div><form class="terminal-entry"><span class="terminal-prompt"><span>you@notes</span><span class="prompt-path">~</span><span class="prompt-arrow">›</span></span><input class="terminal-input" aria-label="Terminal command" autocomplete="off" autocapitalize="off" spellcheck="false"></form></div><footer class="terminal-status"><span>notes-sh 1.0</span><span>UTF-8 · LOCAL WORKSPACE</span></footer></div>`;
  const scroll=container.querySelector('.terminal-scroll'),output=container.querySelector('.terminal-output'),input=container.querySelector('.terminal-input');
  function run(value){
    if(!value.trim())return;
    const oldPath=shell.cwd==='/'?'~':shell.cwd;
    const result=executeCommand(value,shell,vfs);
    history.push(value);historyIndex=history.length;draft='';input.value='';
    if(result.clear){output.innerHTML='';container.querySelector('.terminal-welcome').hidden=true;}
    else{const record=document.createElement('div');record.className='terminal-record';record.innerHTML=`<div class="terminal-prompt"><span>you@notes</span><span class="prompt-path">${esc(oldPath)}</span><span class="prompt-arrow">›</span><span style="color:#e4e9d5">${esc(value)}</span></div><pre class="${result.error?'error':''}">${esc(result.output)}</pre>`;output.append(record);}
    container.querySelector('.terminal-entry .prompt-path').textContent=shell.cwd==='/'?'~':shell.cwd;
    if(result.effect)openApp(result.effect.app,result.effect);
    scroll.scrollTop=scroll.scrollHeight;input.focus();
  }
  container.querySelector('form').addEventListener('submit',e=>{e.preventDefault();run(input.value);},opts);
  container.addEventListener('click',e=>{const chip=e.target.closest('[data-command]');if(chip)run(chip.dataset.command);else if(e.target===scroll||e.target===output)input.focus();},opts);
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();run(input.value);return;}
    if(e.key==='ArrowUp'){e.preventDefault();if(historyIndex===history.length)draft=input.value;historyIndex=Math.max(0,historyIndex-1);input.value=history[historyIndex]||draft;}
    if(e.key==='ArrowDown'){e.preventDefault();historyIndex=Math.min(history.length,historyIndex+1);input.value=history[historyIndex]??draft;}
    if(e.key==='Tab'){e.preventDefault();const text=input.value;const parts=text.split(/\s+/);if(parts.length===1){const matching=COMMANDS.filter(c=>c.startsWith(text));if(matching.length===1)input.value=matching[0]+' ';else if(matching.length>1){const line=document.createElement('pre');line.textContent=matching.join('   ');output.append(line);scroll.scrollTop=scroll.scrollHeight;}}else if(parts[0]==='cd'){const prefix=parts.slice(1).join(' ');const folders=vfs.getFolders().filter(f=>f.toLowerCase().startsWith((prefix.startsWith('/')?prefix:'/'+prefix).toLowerCase()));if(folders.length===1)input.value='cd '+folders[0];}else{const prefix=parts.slice(1).join(' ').replace(/^['"]/,'');const note=vfs.listNotes().find(n=>n.title.toLowerCase().startsWith(prefix.toLowerCase()));if(note)input.value=parts[0]+' "'+note.title+'"';}}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='l'){e.preventDefault();run('clear');}
  },opts);
  return{destroy(){abort.abort();}};
}
