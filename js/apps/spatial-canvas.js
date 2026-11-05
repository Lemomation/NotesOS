import { icon } from '../icons.js';
import { escapeHTML as esc, uid, clamp, stripMarkdown } from '../utils.js';

export function mountCanvasApp(container, context) {
  const { vfs, dialog, notify, openApp } = context;
  const abort = new AbortController(), opts = { signal: abort.signal };
  let { nodes, edges, view } = vfs.getCanvas();
  view = { x: 0, y: 0, zoom: .65, ...view };
  if (context.options.compact) view = { x: 6, y: 2, zoom: .52 };
  let selected = null, selectedEdge = null, saving = false, spaceHeld = false, connectionFrom = null;
  container.innerHTML = `<div class="canvas-app"><div class="canvas-toolbar"><span class="canvas-board-title">A place for loose ideas</span><button class="secondary-button" data-action="sticky" aria-label="Add sticky note">${icon('plus')} Sticky</button><button class="secondary-button" data-action="link-note" aria-label="Link an existing note">${icon('link')} Link note</button><span class="spacer"></span><button class="icon-button" data-action="tidy" aria-label="Tidy canvas" title="Tidy up">${icon('tidy')}</button><button class="icon-button" data-action="remove" aria-label="Remove selected canvas item" title="Remove selected">${icon('trash')}</button></div><div class="canvas-viewport" tabindex="0" aria-label="Canvas board. Drag to pan, scroll to zoom."><div class="canvas-world"><svg class="canvas-edges" aria-hidden="true"></svg><div class="canvas-nodes"></div></div><div class="canvas-selection-tools" hidden></div><svg class="canvas-minimap" viewBox="0 0 120 80" aria-hidden="true"></svg><span class="canvas-caption">ROOM FOR CONNECTIONS</span><div class="canvas-footer"><button class="icon-button" data-action="zoom-out" aria-label="Zoom out">${icon('minus')}</button><button class="canvas-zoom-text" data-action="fit" title="Fit all cards" aria-label="Fit canvas"></button><button class="icon-button" data-action="zoom-in" aria-label="Zoom in">${icon('plus')}</button><button class="icon-button" data-action="reset-view" aria-label="Reset canvas view" title="Reset view">${icon('maximize')}</button></div></div></div>`;
  const app = container.querySelector('.canvas-app'), viewport = container.querySelector('.canvas-viewport'), world = container.querySelector('.canvas-world'), nodeLayer = container.querySelector('.canvas-nodes'), svg = container.querySelector('.canvas-edges');
  function save() { saving = true; vfs.saveCanvas(nodes,edges,view); saving = false; }
  function paintView() { world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`; viewport.style.backgroundSize = `${20*view.zoom}px ${20*view.zoom}px`; viewport.style.backgroundPosition = `${view.x}px ${view.y}px`; container.querySelector('.canvas-zoom-text').textContent = `${Math.round(view.zoom * 100)}%`; renderMinimap(); }
  function nodeHeight(id) { return nodeLayer.querySelector(`[data-node="${id}"]`)?.offsetHeight || 170; }
  function pathBetween(from, to) {
    const start = { x: from.x + 218, y: from.y + nodeHeight(from.id)/2 }, end = { x: to.x, y: to.y + nodeHeight(to.id)/2 };
    const distance = Math.max(50, Math.abs(end.x - start.x) * .55);
    return `M${start.x},${start.y} C${start.x+distance},${start.y} ${end.x-distance},${end.y} ${end.x},${end.y}`;
  }
  function renderEdges() {
    svg.innerHTML = edges.map(edge => {
      const from = nodes.find(n => n.id === edge.from), to = nodes.find(n => n.id === edge.to);
      return from && to ? `<path class="canvas-edge${selectedEdge === edge.id ? ' selected' : ''}" data-edge="${esc(edge.id)}" d="${pathBetween(from,to)}"/>` : '';
    }).join('');
  }
  function renderMinimap() {
    const maxX = Math.max(700, ...nodes.map(n => n.x + 240)), maxY = Math.max(500, ...nodes.map(n => n.y + 180));
    container.querySelector('.canvas-minimap').innerHTML = nodes.map(n => `<rect x="${n.x/maxX*110+4}" y="${n.y/maxY*70+4}" width="${218/maxX*110}" height="${140/maxY*70}" fill="${n.color === 'terracotta' ? '#caa68b' : n.color === 'ochre' ? '#d4c082' : '#b6c0a2'}" rx="1"/>`).join('');
  }
  function renderTools() {
    const tools = container.querySelector('.canvas-selection-tools');
    const node = nodes.find(n => n.id === selected); tools.hidden = !node;
    if (!node) return;
    tools.innerHTML = `${['paper','sage','ochre','terracotta','ink'].map((c,i) => `<button class="color-dot${node.color === c ? ' active' : ''}" data-color="${c}" style="background:${['#faf8e9','#dbe2c9','#eee0b5','#ecd2bc','#4b5744'][i]}" aria-label="Color ${c}" title="${c}"></button>`).join('')}<button class="icon-button" data-action="edit-card" aria-label="Edit selected card">${icon('edit')}</button>`;
  }
  function renderNodes() {
    nodeLayer.innerHTML = nodes.map(node => {
      const note = node.type === 'note' ? vfs.getNote(node.noteId) : null;
      const title = note?.title || node.title || 'An untitled thought';
      const body = note ? stripMarkdown(note.body).slice(0,100) : node.body || '';
      return `<article class="canvas-node${selected === node.id ? ' selected' : ''}" data-node="${esc(node.id)}" data-color="${esc(node.color || 'paper')}" style="left:${Number(node.x)||0}px;top:${Number(node.y)||0}px" tabindex="0" aria-label="Canvas card: ${esc(title)}"><div class="canvas-node-label">${icon(node.type === 'note' ? 'note' : 'pin')}${node.type === 'note' ? note?.deleted ? 'NOTE IN TRASH' : 'LINKED THOUGHT' : 'A LOOSE IDEA'}</div><h3>${esc(title)}</h3><p>${esc(body)}</p><div class="canvas-node-footer"><span>${node.type === 'note' ? 'DOUBLE-CLICK TO OPEN' : 'DOUBLE-CLICK TO EDIT'}</span>${icon('arrow')}</div><button class="node-port in" data-port="in" aria-label="Connect to ${esc(title)}" title="Connect to this card"></button><button class="node-port out" data-port="out" aria-label="Connect from ${esc(title)}" title="Connect this card to another"></button></article>`;
    }).join('');
    renderEdges(); renderTools(); renderMinimap();
  }
  function select(id, edgeId = null) { selected = id; selectedEdge = edgeId; nodeLayer.querySelectorAll('.canvas-node').forEach(el => el.classList.toggle('selected', el.dataset.node === id)); renderTools(); renderEdges(); }
  function zoom(delta, at) {
    const rect = viewport.getBoundingClientRect(); const point = at || { x: rect.width/2, y: rect.height/2 };
    const value = clamp(view.zoom + delta, .35, 1.8); const ratio = value/view.zoom;
    view.x = point.x - (point.x-view.x)*ratio; view.y = point.y - (point.y-view.y)*ratio; view.zoom = value; paintView(); save();
  }
  function fit() {
    if (!nodes.length) { view = { x: 0,y: 0,zoom: 1 }; paintView(); return; }
    const left = Math.min(...nodes.map(n => n.x))-30, top = Math.min(...nodes.map(n => n.y))-30;
    const right = Math.max(...nodes.map(n => n.x+218))+30, bottom = Math.max(...nodes.map(n => n.y+nodeHeight(n.id)))+30;
    const zoomValue = clamp(Math.min(viewport.clientWidth/(right-left),viewport.clientHeight/(bottom-top)),.35,1.3);
    view = { x: -left*zoomValue + Math.max(0,(viewport.clientWidth-(right-left)*zoomValue)/2), y: -top*zoomValue + Math.max(0,(viewport.clientHeight-(bottom-top)*zoomValue)/2), zoom: zoomValue }; paintView(); save();
  }
  async function editCard(id) {
    const node = nodes.find(n => n.id === id); if (!node) return;
    if (node.type === 'note') { openApp('notes',{ noteId: node.noteId }); return; }
    const title = await dialog({ title: 'A thought worth keeping.', message: 'Give this card a title.', input: node.title || '', confirm: 'Next' });
    if (title === null) return;
    const body = await dialog({ title: 'A little more detail.', message: 'Add the thought behind the title.', input: node.body || '', multiline: true, confirm: 'Save card' });
    if (body === null) return;
    node.title = title || 'An untitled thought'; node.body = body; renderNodes(); save();
  }
  function addConnection(from,to) {
    if (!from || !to || from === to) return;
    if (!edges.some(e => e.from === from && e.to === to)) { edges.push({ id: uid(), from, to }); save(); renderEdges(); notify('Two thoughts, connected.'); }
  }
  container.addEventListener('click', async e => {
    const button = e.target.closest('button'); if (!button) return;
    if (button.dataset.port) {
      const id = button.closest('[data-node]').dataset.node;
      if (button.dataset.port === 'out') { connectionFrom = id; app.classList.add('connecting'); notify('Choose the left connector of another card.'); }
      else if (connectionFrom) { addConnection(connectionFrom,id); connectionFrom = null; app.classList.remove('connecting'); }
      return;
    }
    if (button.dataset.color) { const node = nodes.find(n => n.id === selected); if (node) { node.color = button.dataset.color; renderNodes(); save(); } return; }
    switch (button.dataset.action) {
      case 'sticky': { const node = { id: uid(), type: 'sticky', title: 'A new possibility', body: 'Double-click to make it yours.', x: (60-view.x)/view.zoom, y: (60-view.y)/view.zoom, color: 'sage' }; nodes.push(node); selected = node.id; renderNodes(); save(); break; }
      case 'link-note': {
        const notes = vfs.listNotes();
        const value = await dialog({ title: 'Connect a thought.', message: 'Choose a note to keep on your canvas.', choices: notes.map(n => ({ label: n.title, value: n.id })), confirm: 'Add to canvas' });
        if (value) { nodes.push({ id: uid(), type:'note', noteId: value, x:(85-view.x)/view.zoom, y:(85-view.y)/view.zoom, color:'paper' }); renderNodes(); save(); }
        break;
      }
      case 'tidy': nodes.forEach((n,i) => { n.x = 50 + (i%2)*285; n.y = 45 + Math.floor(i/2)*240; }); renderNodes(); fit(); break;
      case 'remove': removeSelected(); break;
      case 'edit-card': editCard(selected); break;
      case 'zoom-in': zoom(.1); break;
      case 'zoom-out': zoom(-.1); break;
      case 'fit': fit(); break;
      case 'reset-view': view = { x:0,y:0,zoom:1 }; paintView(); save(); break;
    }
  }, opts);
  function removeSelected() {
    if (!selected && !selectedEdge) { notify('Select a card or connection first.'); return; }
    if (selected) { nodes = nodes.filter(n => n.id !== selected); edges = edges.filter(e => e.from !== selected && e.to !== selected); }
    else edges = edges.filter(e => e.id !== selectedEdge);
    select(null); renderNodes(); save();
  }
  viewport.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('.canvas-footer,.canvas-selection-tools')) return;
    const nodeElement = e.target.closest('[data-node]'), port = e.target.closest('[data-port]'), edgeElement = e.target.closest('[data-edge]');
    if (edgeElement) { select(null,edgeElement.dataset.edge); e.stopPropagation(); return; }
    if (port) {
      if (port.dataset.port !== 'out') return;
      const from = nodeElement.dataset.node;
      let moved = false;
      app.classList.add('connecting');
      const move = event => {
        moved = true;
        const rect = viewport.getBoundingClientRect();
        const node = nodes.find(n => n.id === from);
        const sx = node.x+218, sy = node.y+nodeHeight(from)/2;
        const ex = (event.clientX-rect.x-view.x)/view.zoom, ey = (event.clientY-rect.y-view.y)/view.zoom;
        let path = svg.querySelector('.canvas-edge-preview');
        if (!path) { path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('class','canvas-edge-preview'); svg.append(path); }
        path.setAttribute('d',`M${sx},${sy}C${sx+80},${sy} ${ex-80},${ey} ${ex},${ey}`);
      };
      const end = event => {
        document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',end); document.removeEventListener('pointercancel',cancel);
        svg.querySelector('.canvas-edge-preview')?.remove();
        if (moved) { const target = document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-node]'); if (target) addConnection(from,target.dataset.node); connectionFrom = null; app.classList.remove('connecting'); }
      };
      const cancel = () => { document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',end); svg.querySelector('.canvas-edge-preview')?.remove(); connectionFrom = null; app.classList.remove('connecting'); };
      document.addEventListener('pointermove',move,opts); document.addEventListener('pointerup',end,opts); document.addEventListener('pointercancel',cancel,{...opts,once:true}); return;
    }
    e.preventDefault(); viewport.focus();
    const node = nodeElement && !spaceHeld ? nodes.find(n => n.id === nodeElement.dataset.node) : null;
    if (node) select(node.id); else { select(null); viewport.classList.add('panning'); }
    const start = { x:e.clientX,y:e.clientY,nx:node?.x,ny:node?.y,vx:view.x,vy:view.y };
    const captureTarget = nodeElement || viewport;
    captureTarget.setPointerCapture(e.pointerId);
    const move = event => {
      const dx = event.clientX-start.x, dy = event.clientY-start.y;
      if (node) { node.x = start.nx+dx/view.zoom; node.y = start.ny+dy/view.zoom; nodeElement.style.left=node.x+'px'; nodeElement.style.top=node.y+'px'; renderEdges(); }
      else { view.x=start.vx+dx; view.y=start.vy+dy; paintView(); }
    };
    const end = () => { viewport.removeEventListener('pointermove',move); viewport.removeEventListener('pointerup',end); viewport.removeEventListener('pointercancel',end); viewport.classList.remove('panning'); try { captureTarget.releasePointerCapture(e.pointerId); } catch {} renderMinimap(); save(); };
    viewport.addEventListener('pointermove',move,opts); viewport.addEventListener('pointerup',end,opts); viewport.addEventListener('pointercancel',end,opts);
  }, opts);
  viewport.addEventListener('dblclick',e => { const node = e.target.closest('[data-node]'); if (node && !e.target.closest('[data-port]')) editCard(node.dataset.node); },opts);
  viewport.addEventListener('wheel',e => { e.preventDefault(); const rect=viewport.getBoundingClientRect(); if (e.shiftKey) { view.x-=e.deltaY; view.y-=e.deltaX; paintView(); save(); } else zoom(e.deltaY>0?-.045:.045,{x:e.clientX-rect.x,y:e.clientY-rect.y}); },{...opts,passive:false});
  viewport.addEventListener('keydown',e => { if (e.code==='Space') { spaceHeld=true;e.preventDefault(); } if (['Delete','Backspace'].includes(e.key)) { e.preventDefault();removeSelected(); } if (e.key==='Escape') { select(null);connectionFrom=null;app.classList.remove('connecting'); } if (e.key==='Enter'&&selected) editCard(selected); },opts);
  document.addEventListener('keyup',e=>{if(e.code==='Space') spaceHeld=false;},opts);
  const unsubscribe=vfs.subscribe(event=>{if(saving)return;if(event.type==='canvas'||event.type==='reset'){({nodes,edges,view}=vfs.getCanvas());paintView();renderNodes();}else if(event.type==='notes')renderNodes();});
  renderNodes();paintView();
  return { destroy(){unsubscribe();abort.abort();} };
}
