import { icon } from '../icons.js';
import { escapeHTML as esc, relativeDate, stripMarkdown, wordCount, downloadFile } from '../utils.js';
import { renderMarkdown, toggleMarkdownTask } from '../markdown.js';

const commands = [
  { id: 'h1', name: 'Heading', icon: 'edit', before: '# ', after: '' },
  { id: 'h2', name: 'Subheading', icon: 'edit', before: '## ', after: '' },
  { id: 'bold', name: 'Bold', icon: 'bold', before: '**', after: '**' },
  { id: 'italic', name: 'Italic', icon: 'italic', before: '*', after: '*' },
  { id: 'todo', name: 'To-do list', icon: 'checkSquare', before: '- [ ] ', after: '' },
  { id: 'quote', name: 'Quote', icon: 'quote', before: '> ', after: '' },
  { id: 'code', name: 'Code block', icon: 'code', before: '\n```\n', after: '\n```\n' },
  { id: 'callout', name: 'Callout', icon: 'info', before: '> [!NOTE] ', after: '' },
  { id: 'divider', name: 'Divider', icon: 'minus', before: '\n---\n', after: '' },
  { id: 'link', name: 'Link a note', icon: 'link', before: '[[', after: ']]' }
];

export function mountNotesApp(container, context) {
  const { vfs, notify, dialog } = context;
  const abort = new AbortController(), opts = { signal: abort.signal };
  let selectedId = context.options.noteId || 'welcome';
  let filter = context.options.folder ? { folder: context.options.folder } : {};
  let query = '', sort = 'updated', mode = 'read', backlinks = false, updating = false, slashIndex = 0, renderedNote = '';
  container.innerHTML = `<div class="notes-app"><aside class="notes-sidebar" aria-label="Notes navigation"></aside><section class="note-list-pane" aria-label="Note list"><div class="note-list-heading"><h2>All notes</h2><span class="list-count"></span><button class="icon-button" data-action="new" aria-label="New note" title="New note · Ctrl+N">${icon('edit')}</button></div><label class="note-search">${icon('search')}<input type="search" aria-label="Search notes" placeholder="Find a thought..."></label><div class="note-list-sort"><span>YOUR COLLECTION</span><button data-action="sort" aria-label="Change note sort order" title="Sort by date or title">${icon('sort')}</button></div><div class="notes-list" role="list"></div></section><section class="note-editor-pane" aria-label="Note editor"></section></div>`;
  const sidebar = container.querySelector('.notes-sidebar'), list = container.querySelector('.notes-list'), editor = container.querySelector('.note-editor-pane');
  const current = () => vfs.getNote(selectedId);
  function updateNote(patch) {
    updating = true;
    let note;
    try { note = vfs.updateNote(selectedId, patch); }
    finally { updating = false; }
    renderedNote = JSON.stringify(note);
    renderList(); renderSidebar(); renderStatus(); return note;
  }
  function nav(label, glyph, data, count = '', active = false) {
    return `<button class="sidebar-nav${active ? ' active' : ''}" ${data} title="${esc(label)}">${icon(glyph)}<span class="nav-label">${esc(label)}</span>${count !== '' ? `<span class="count">${count}</span>` : ''}</button>`;
  }
  function renderSidebar() {
    const notes = vfs.listNotes();
    sidebar.innerHTML = `<div class="sidebar-brand">${icon('leaf')}<strong>My space</strong><span class="pill">01</span></div>
      ${nav('All notes', 'notes', 'data-filter="all"', notes.length, !Object.keys(filter).length)}
      ${nav('Favorites', 'star', 'data-filter="favorite"', notes.filter(n => n.favorite).length, filter.favorite)}
      <div class="sidebar-section-title">Collections</div>
      ${vfs.getFolders().filter(f => f !== '/Canvas').map(f => nav(f.slice(1), f === '/Journal' ? 'journal' : 'folder', `data-folder="${esc(f)}"`, notes.filter(n => n.folder === f).length, filter.folder === f)).join('')}
      <div class="sidebar-section-title">A few threads</div>
      ${vfs.getAllTags().slice(0,6).map((tag,i) => `<button class="sidebar-nav${filter.tag === tag ? ' active' : ''}" data-tag="${esc(tag)}" title="#${esc(tag)}"><i class="tag-dot" style="background:${['#879b72','#bb946e','#ad9b61','#6e9390','#9b897c','#a3ab8b'][i]}"></i><span class="nav-label">${esc(tag)}</span></button>`).join('')}
      <div class="sidebar-section-title">Keep it light</div>${nav('Recently deleted','trash','data-filter="trash"', '', filter.trash)}
      <div class="sidebar-footer"><div class="sidebar-footer-line">${icon('check')}<span>Just yours. Saved locally.</span></div></div>`;
  }
  function renderList() {
    const notes = vfs.listNotes({ ...filter, query, sort });
    container.querySelector('.note-list-heading h2').textContent = filter.favorite ? 'Favorites' : filter.trash ? 'Recently deleted' : filter.folder ? filter.folder.slice(1) : filter.tag ? `#${filter.tag}` : 'All notes';
    container.querySelector('.list-count').textContent = notes.length;
    list.innerHTML = notes.map(note => `<button class="note-list-item${note.id === selectedId ? ' selected' : ''}" data-note-id="${esc(note.id)}" aria-label="Open note: ${esc(note.title)}" role="listitem"><h3>${esc(note.title)}</h3>${note.favorite ? `<span class="note-favorite-mark">${icon('star')}</span>` : ''}<div class="note-snippet">${esc(stripMarkdown(note.body).slice(0,105)) || 'A fresh page. Start anywhere.'}</div><div class="note-item-meta"><span>${relativeDate(note.updatedAt)}</span><span>${esc(note.folder.slice(1))}</span></div></button>`).join('') || '<div class="empty-state"><p>No thoughts here yet.</p></div>';
  }
  function renderStatus() {
    const note = current(); if (!note) return;
    const footer = editor.querySelector('.editor-status'); if (!footer) return;
    const words = wordCount(note.body);
    const saving = vfs.getStorageStatus?.().pending;
    footer.innerHTML = `<span>${words} words</span><span>·</span><span>${Math.max(1,Math.ceil(words/200))} min read</span><span class="spacer"></span><button data-action="backlinks" title="Show connected notes">${icon('link')} ${vfs.getBacklinks(note.id).length} connections</button><span class="saved-state">${icon(vfs.getStorageError() ? 'info' : 'check')} ${vfs.getStorageError() ? 'Memory only' : saving ? 'Saving…' : 'All changes saved'}</span>`;
  }
  function renderLinks() {
    const panel = editor.querySelector('.backlinks-panel'); if (!panel) return;
    panel.hidden = !backlinks;
    const note = current(); if (!note) return;
    const incoming = vfs.getBacklinks(note.id);
    const outgoing = [...new Set([...note.body.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]))];
    panel.innerHTML = `<div class="backlinks-title"><span>CONNECTED THOUGHTS</span><button data-action="backlinks" aria-label="Close connections">${icon('close','icon-sm')}</button></div>${incoming.length ? incoming.map(n => `<button class="wiki-link" data-note-id="${esc(n.id)}">${icon('back')}${esc(n.title)}</button>`).join('') : '<span class="muted" style="font-size:10px">No incoming links yet.</span>'}${outgoing.map(title => `<button class="wiki-link" data-note-title="${esc(title)}">${icon('arrow')}${esc(title)}</button>`).join('')}`;
  }
  function renderEditor(preserveFocus = false) {
    const active = document.activeElement;
    const focusedField = preserveFocus && editor.contains(active) && active.matches('.note-source,.note-title') ? {
      selector: active.classList.contains('note-source') ? '.note-source' : '.note-title',
      start: active.selectionStart, end: active.selectionEnd, direction: active.selectionDirection,
      scrollTop: active.scrollTop, scrollLeft: active.scrollLeft,
      documentScroll: editor.querySelector('.editor-document')?.scrollTop || 0
    } : null;
    let note = current();
    if (!note) { selectedId = vfs.listNotes(filter)[0]?.id || null; note = current(); }
    if (!note) { editor.innerHTML = `<div class="empty-state" style="margin:auto"><h3>A fresh page awaits.</h3><p>Make room for your next thought.</p><button class="primary-button" data-action="new">${icon('plus')} New note</button></div>`; return; }
    context.setSelectedNote?.(note.id);
    editor.innerHTML = `<div class="editor-topbar"><button class="icon-button note-picker-button" data-action="pick-note" aria-label="Choose a note" title="Choose a note">${icon('list')}</button><div class="note-breadcrumb">${icon('folder')}<select aria-label="Note folder" data-action="folder">${vfs.getFolders().map(f => `<option value="${esc(f)}"${f === note.folder ? ' selected' : ''}>${esc(f.slice(1))}</option>`).join('')}</select>${icon('chevron','icon-sm')}</div><div class="spacer"></div><div class="segmented segment" aria-label="Editor mode">${['write','read','split'].map(m => `<button data-mode="${m}" class="${mode === m ? 'active' : ''}" aria-pressed="${mode === m}">${m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div><button class="icon-button${note.favorite ? ' active' : ''}" data-action="favorite" aria-label="${note.favorite ? 'Remove from favorites' : 'Add to favorites'}" title="Favorite">${icon('star')}</button><button class="icon-button" data-action="export" aria-label="Download note" title="Download Markdown">${icon('download')}</button><button class="icon-button" data-action="${note.deleted ? 'restore' : 'trash'}" aria-label="${note.deleted ? 'Restore note' : 'Move note to trash'}" title="${note.deleted ? 'Restore note' : 'Move to trash'}">${icon(note.deleted ? 'reset' : 'trash')}</button></div>
      <div class="editor-document"><div class="document-header"><div class="document-overline"><span class="eyebrow">${note.id === 'welcome' ? 'A NOTE TO BEGIN WITH' : esc(note.folder.slice(1).toUpperCase()) + ' / PERSONAL COLLECTION'}</span>${icon('leaf')}</div><input class="note-title" aria-label="Note title" value="${esc(note.title)}" maxlength="200" spellcheck="false"><div class="note-meta"><span class="meta-date">${new Date(note.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</span><span class="meta-separator"></span><span>Personal space</span>${note.tags.map(tag => `<button class="note-tag" data-remove-tag="${esc(tag)}" title="Remove tag ${esc(tag)}"># ${esc(tag)}</button>`).join('')}<button class="add-tag" data-action="tag" aria-label="Add tag">+</button></div></div>
      <div class="editor-formatbar"${mode === 'read' ? ' hidden' : ''}>${commands.filter(c => !['italic','callout','divider'].includes(c.id)).map(c => `<button class="icon-button" data-format="${c.id}" aria-label="${c.name}" title="${c.name}">${c.id.startsWith('h') ? c.id.toUpperCase() : icon(c.icon)}</button>`).join('')}<small>/ for more</small></div>
      <div class="editor-body${mode === 'split' ? ' split' : ''}"><textarea class="note-source" aria-label="Note content" spellcheck="true" placeholder="Start anywhere. Type / for a little help."${mode === 'read' ? ' hidden' : ''}></textarea><article class="note-preview markdown-content"${mode === 'write' ? ' hidden' : ''}>${renderMarkdown(note.body)}</article></div></div><div class="backlinks-panel" hidden></div><footer class="editor-status"></footer><div class="slash-menu" hidden></div>`;
    editor.querySelector('.note-source').value = note.body;
    renderedNote = JSON.stringify(note);
    renderStatus(); renderLinks();
    if (focusedField) {
      const input = editor.querySelector(focusedField.selector);
      if (input && !input.hidden) {
        input.focus({ preventScroll: true });
        input.setSelectionRange(focusedField.start, focusedField.end, focusedField.direction);
        input.scrollTop = focusedField.scrollTop; input.scrollLeft = focusedField.scrollLeft;
        editor.querySelector('.editor-document').scrollTop = focusedField.documentScroll;
      }
    }
  }
  function openNote(id) { const note = vfs.getNote(id); if (!note) return; selectedId = id; if (note.deleted) filter = { trash: true }; else if (filter.trash) filter = {}; renderSidebar(); renderList(); renderEditor(); }
  function newNote() {
    updating = true;
    const note = vfs.createNote({ title: 'Untitled note', folder: filter.folder && filter.folder !== '/Trash' ? filter.folder : '/Notes', tags: filter.tag ? [filter.tag] : [] });
    updating = false; selectedId = note.id; query = ''; container.querySelector('[aria-label="Search notes"]').value = ''; filter = {}; mode = 'write';
    renderSidebar(); renderList(); renderEditor();
    editor.querySelector('.note-title').focus(); editor.querySelector('.note-title').select();
  }
  function format(id, fromSlash = false) {
    if (mode === 'read') { mode = 'write'; renderEditor(); }
    const input = editor.querySelector('.note-source'), command = commands.find(c => c.id === id);
    if (!input || !command) return;
    let start = input.selectionStart, end = input.selectionEnd;
    if (fromSlash && input.value[start-1] === '/') start--;
    const selection = input.value.slice(start,end).replace(/^\/$/,'');
    input.setRangeText(command.before + selection + command.after, start, end, 'end');
    const cursor = start + command.before.length;
    input.setSelectionRange(cursor, cursor + selection.length); input.focus();
    updateNote({ body: input.value });
    const preview = editor.querySelector('.note-preview'); if (preview) preview.innerHTML = renderMarkdown(input.value);
    editor.querySelector('.slash-menu').hidden = true;
  }
  container.addEventListener('pointerdown', e => { if (e.target.closest('[data-format]')) e.preventDefault(); }, opts);
  container.addEventListener('click', async e => {
    const target = e.target.closest('button'); if (!target) return;
    if (target.dataset.noteId) { openNote(target.dataset.noteId); return; }
    if (target.dataset.noteTitle) {
      let note = vfs.findNoteByTitle(target.dataset.noteTitle);
      if (!note) note = vfs.createNote({ title: target.dataset.noteTitle });
      openNote(note.id); return;
    }
    if (target.dataset.filter || target.dataset.folder || target.dataset.tag) {
      filter = target.dataset.folder ? { folder: target.dataset.folder } : target.dataset.tag ? { tag: target.dataset.tag } : target.dataset.filter === 'favorite' ? { favorite: true } : target.dataset.filter === 'trash' ? { trash: true } : {};
      const visible = vfs.listNotes({ ...filter, query }); if (!visible.some(n => n.id === selectedId)) selectedId = visible[0]?.id || null;
      renderSidebar(); renderList(); renderEditor(); return;
    }
    if (target.dataset.mode) { mode = target.dataset.mode; renderEditor(); if (mode === 'write') editor.querySelector('.note-source')?.focus(); return; }
    if (target.dataset.format) { format(target.dataset.format, target.hasAttribute('data-slash')); return; }
    if (target.dataset.removeTag) { const n = current(); updateNote({ tags: n.tags.filter(t => t !== target.dataset.removeTag) }); renderEditor(); return; }
    const note = current();
    switch (target.dataset.action) {
      case 'pick-note': { const notes=vfs.listNotes({ ...filter, query }); const id=await dialog({ title:'Find a thought.', message:'Your collection, close at hand.', choices:notes.map(n=>({label:n.title,value:n.id})), confirm:'Open note' }); if(id)openNote(id); break; }
      case 'new': newNote(); break;
      case 'sort': sort = sort === 'updated' ? 'title' : 'updated'; renderList(); notify(`Notes sorted by ${sort === 'updated' ? 'last edited' : 'title'}.`); break;
      case 'favorite': updateNote({ favorite: !note.favorite }); renderEditor(); break;
      case 'trash': updating = true; vfs.deleteNote(note.id); updating = false; notify('Moved to Recently deleted. You can restore it anytime.'); selectedId = vfs.listNotes({ ...filter, query })[0]?.id || null; renderSidebar(); renderList(); renderEditor(); break;
      case 'restore': updating = true; vfs.restoreNote(note.id); updating = false; filter = {}; openNote(note.id); notify('Note restored.'); break;
      case 'export': downloadFile(`${note.title.replace(/[<>:"/\\|?*]/g,'-')}.md`, `# ${note.title}\n\n${note.body}`, 'text/markdown'); notify('Your note is ready to keep.'); break;
      case 'backlinks': backlinks = !backlinks; renderLinks(); break;
      case 'tag': { const value = await dialog({ title: 'Give this thought a thread.', message: 'A short tag makes it easier to find later.', input: '', placeholder: 'e.g. inspiration', confirm: 'Add tag' }); if (value?.trim()) { updateNote({ tags: [...new Set([...note.tags, value.trim().replace(/^#/,'').toLowerCase().slice(0,40)])] }); renderEditor(); } break; }
    }
  }, opts);
  container.addEventListener('input', e => {
    if (e.target.matches('[aria-label="Search notes"]')) { query = e.target.value; renderList(); return; }
    if (e.target.matches('.note-title')) { updateNote({ title: e.target.value }); return; }
    if (e.target.matches('.note-source')) {
      const input = e.target;
      updateNote({ body: input.value });
      editor.querySelector('.note-preview').innerHTML = renderMarkdown(input.value); renderLinks();
      const slash = editor.querySelector('.slash-menu');
      if (input.value[input.selectionStart - 1] === '/' && (input.selectionStart === 1 || /[\s\n]/.test(input.value[input.selectionStart - 2]))) {
        slashIndex = 0; slash.hidden = false;
        slash.innerHTML = `<div class="popover-title">A little structure</div>${commands.map((c,i) => `<button data-format="${c.id}" data-slash class="${i === slashIndex ? 'selected' : ''}">${icon(c.icon)}${c.name}</button>`).join('')}`;
      } else slash.hidden = true;
    }
  }, opts);
  container.addEventListener('change', e => {
    if (e.target.matches('[data-action="folder"]')) { updateNote({ folder: e.target.value }); }
    if (e.target.matches('[data-task-line]')) {
      updateNote({ body: toggleMarkdownTask(current().body, Number(e.target.dataset.taskLine), e.target.checked) });
      editor.querySelector('.note-preview').innerHTML = renderMarkdown(current().body);
      editor.querySelector('.note-source').value = current().body;
    }
  }, opts);
  container.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); newNote(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); notify('All changes are already saved on this device.'); }
    if (e.target.matches('.note-source') && (e.ctrlKey || e.metaKey) && ['b','i'].includes(e.key.toLowerCase())) { e.preventDefault(); format(e.key.toLowerCase() === 'b' ? 'bold' : 'italic'); }
    const slash = editor.querySelector('.slash-menu');
    if (slash && !slash.hidden) {
      if (['ArrowDown','ArrowUp'].includes(e.key)) { e.preventDefault(); slashIndex = (slashIndex + (e.key === 'ArrowDown' ? 1 : -1) + commands.length) % commands.length; slash.querySelectorAll('button').forEach((b,i) => b.classList.toggle('selected', i === slashIndex)); }
      if (e.key === 'Enter') { e.preventDefault(); format(commands[slashIndex].id, true); }
      if (e.key === 'Escape') { e.preventDefault(); slash.hidden = true; }
    }
  }, opts);
  const unsubscribe = vfs.subscribe(event => {
    if (updating) return;
    if (event.type === 'storage') { renderStatus(); return; }
    if (!['notes','folders','reset','import'].includes(event.type)) return;
    renderSidebar(); renderList();
    const noteChanged = JSON.stringify(current()) !== renderedNote;
    if (!current() || event.type === 'import' || (event.type === 'reset' && !event.external) || noteChanged) renderEditor(true);
    else { renderLinks(); renderStatus(); }
  });
  renderSidebar(); renderList(); renderEditor();
  if (context.options.newNote) newNote();
  return { openNote, newNote, openFolder(folder) { filter = { folder }; selectedId = vfs.listNotes(filter)[0]?.id; renderSidebar(); renderList(); renderEditor(); }, destroy() { unsubscribe(); abort.abort(); } };
}
