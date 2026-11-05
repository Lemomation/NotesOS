import { WALLPAPERS } from './wallpapers.js';
import { wordCount } from './utils.js';

export function tokenize(command) {
  const tokens = []; let current = '', quote = null, escaped = false, started = false;
  for (const char of String(command)) {
    if (escaped) { current += char === 'n' ? '\n' : char; escaped = false; started = true; }
    else if (char === '\\') escaped = true;
    else if (quote) { if (char === quote) quote = null; else current += char; }
    else if (char === '"' || char === "'") { quote = char; started = true; }
    else if (/\s/.test(char)) { if (started) { tokens.push(current); current = ''; started = false; } }
    else { current += char; started = true; }
  }
  if (quote) throw new Error('Close the quotation mark to finish the command.');
  if (escaped) current += '\\';
  if (started) tokens.push(current);
  return tokens;
}
export const COMMANDS = ['help','ls','cd','pwd','cat','touch','write','grep','tags','backlinks','open','theme','wallpaper','stat','neofetch','clear','mkdir','date','echo'];
export function executeCommand(input, shell, vfs) {
  let tokens;
  try { tokens = tokenize(input); } catch(error) { return { output: error.message, error:true }; }
  if (!tokens.length) return { output:'' };
  const [command, ...args] = tokens;
  const value = args.join(' ');
  const find = name => {
    const requested = String(name || '').replace(/\.md$/i,'');
    return vfs.getNote(requested) || vfs.findNoteByTitle(requested) || vfs.listNotes().find(n => `${n.folder}/${n.title}`.toLowerCase() === requested.toLowerCase());
  };
  const requireNote = name => { const note=find(name);if(!note)throw new Error(`No note named “${name}”. Try ls or grep.`);return note; };
  const result = output => ({ output, error:false });
  try {
    switch(command.toLowerCase()) {
      case 'help': return result('A small shell for your personal space.\n\n  ls [folder]           Look around\n  cd <folder>           Change collection\n  pwd                   Where you are\n  cat "note title"      Read a thought\n  touch "note title"    Start a new note\n  write "title" "text"  Replace a note’s text\n  grep <words>          Find something anywhere\n  tags                  List your threads\n  backlinks "title"     Find connected notes\n  open "title"          Open in Notes Studio\n  mkdir "name"          Make a collection\n  theme light|dark|system\n  wallpaper [name]      Change the scenery\n  stat [title]          A little information\n  neofetch              Meet your workspace\n  clear                 A fresh terminal\n\nQuote names with spaces. ↑ / ↓ for history. Tab completes.');
      case 'pwd': return result(shell.cwd || '/');
      case 'ls': {
        let folder = args[0] || shell.cwd || '/'; if(!folder.startsWith('/'))folder='/'+folder;
        if(folder === '/') return result(vfs.getFolders().map(f=>`  ${f.slice(1).padEnd(19)} collection`).join('\n')+`\n\n  ${vfs.listNotes().length} thoughts · ${vfs.getFolders().length} collections`);
        if(!vfs.getFolders().includes(folder) && folder!=='/Trash')throw new Error(`Collection not found: ${folder}`);
        const notes=vfs.listNotes({folder});
        return result(notes.length?notes.map(n=>`  ${n.title}.md`).join('\n'):'This collection has a little room to fill.');
      }
      case 'cd': {
        let folder=value||'/';if(folder==='..'||folder==='~')folder='/';if(!folder.startsWith('/'))folder='/'+folder;
        const match=vfs.getFolders().find(f=>f.toLowerCase()===folder.toLowerCase());
        if(folder!=='/'&&!match)throw new Error(`Collection not found: ${folder}`);
        shell.cwd=match||'/';return result('');
      }
      case 'cat': { const n=requireNote(value);return result(`${n.title}\n${'─'.repeat(Math.min(n.title.length,50))}\n${n.body}`); }
      case 'touch': {
        if(!value)throw new Error('Usage: touch "A thought worth keeping"');
        const existing=find(value);if(existing)return result(`Already here: ${existing.title}`);
        const n=vfs.createNote({title:value,folder:shell.cwd==='/'?'/Notes':shell.cwd});return result(`Created ${n.folder}/${n.title}.md`);
      }
      case 'write': {
        if(args.length<2)throw new Error('Usage: write "note title" "Your words go here"');
        const n=requireNote(args[0]);vfs.updateNote(n.id,{body:args.slice(1).join(' ')});return result(`Saved ${n.title}.md · ${wordCount(args.slice(1).join(' '))} words`);
      }
      case 'grep': {
        if(!value)throw new Error('Usage: grep <words to find>');
        const notes=vfs.listNotes({query:value});return result(notes.length?notes.map(n=>`  ${n.folder}/${n.title}.md`).join('\n'):'Nothing found. Try another thought.');
      }
      case 'tags': return result(vfs.getAllTags().map(t=>`  #${t}`).join('\n')||'No threads yet.');
      case 'backlinks': { const n=requireNote(value),links=vfs.getBacklinks(n.id);return result(links.length?links.map(l=>`  ← ${l.title}`).join('\n'):'No incoming links yet. Use [[Note title]] to connect thoughts.'); }
      case 'open': {
        const app = { notes:'notes',canvas:'canvas',files:'files',terminal:'terminal',tempo:'tempo',settings:'settings' }[value.toLowerCase()];
        if(app)return {output:`Opening ${value}…`,effect:{app}};
        const n=requireNote(value);return {output:`Opening ${n.title}…`,effect:{app:'notes',noteId:n.id}};
      }
      case 'theme': if(!['light','dark','system'].includes(value))return result(`Current: ${vfs.getPrefs().theme}\nChoose light, dark or system.`);vfs.setPrefs({theme:value});return result(`Appearance set to ${value}.`);
      case 'wallpaper': {
        const w=WALLPAPERS.find(w=>w.id===value||w.name.toLowerCase()===value.toLowerCase());
        if(!w)return result('Your four little worlds:\n'+WALLPAPERS.map(w=>`  ${w.id.padEnd(14)} ${w.name}`).join('\n'));
        vfs.setPrefs({wallpaper:w.id});return result(`A change of scenery: ${w.name}.`);
      }
      case 'mkdir': if(!value)throw new Error('Usage: mkdir "Collection name"');return result(`Created ${vfs.createFolder(value)}`);
      case 'stat': {
        if(value){const n=requireNote(value);return result(`Title     ${n.title}\nFolder    ${n.folder}\nWords     ${wordCount(n.body)}\nTags      ${n.tags.map(t=>'#'+t).join(' ')||'—'}\nEdited    ${new Date(n.updatedAt).toLocaleString()}\nID        ${n.id}`);}
        const state=vfs.getState();return result(`Notes         ${vfs.listNotes().length}\nCollections   ${state.folders.length}\nCanvas cards  ${state.canvas.nodes.length}\nStorage       ${(new TextEncoder().encode(vfs.exportWorkspaceJSON()).length/1024).toFixed(1)} KB\nLocation      This browser, this device`);
      }
      case 'neofetch': return result('    ╭────────╮\n    │  N /   │    Notes OS · Personal edition\n    │   / OS │    ───────────────────────────\n    ╰────────╯    Shell       notes-sh 1.0\n                  Home        A little room to think\n                  Theme       '+vfs.getPrefs().theme+'\n                  Thoughts    '+vfs.listNotes().length+'\n                  Philosophy  Less, but better.\n\n    paper  /  sage  /  terracotta  /  ink');
      case 'clear': return { output:'',clear:true };
      case 'date': return result(new Date().toLocaleString(undefined,{dateStyle:'full',timeStyle:'short'}));
      case 'echo': return result(value);
      default: return { output:`${command}: not in this little shell. Type help to see what is.`, error:true };
    }
  }catch(error){return {output:error.message,error:true};}
}
