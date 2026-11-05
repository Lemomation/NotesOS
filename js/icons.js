const paths = {
  note: '<path d="M7 3h10l3 3v14H4V3h3Z"/><path d="M14 3v5h6M8 12h8M8 16h6"/>',
  notes: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18M3 7h4M3 12h4M3 17h4M12 8h5M12 12h5M12 16h3"/>',
  canvas: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="13" width="7" height="7" rx="1.5"/><path d="M10 7h6a2 2 0 0 1 2 2v4M7 11v5a1 1 0 0 0 1 1h6"/>',
  folder: '<path d="M3 7V5a1 1 0 0 1 1-1h6l2 3h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/><path d="M3 8h18"/>',
  files: '<path d="M3 7V5a1 1 0 0 1 1-1h6l2 3h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/><path d="M3 8h18"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 4 3-4 3M14 15h3"/>',
  tempo: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 5V2M18 6l2-2M12 9v4l3 2"/>',
  settings: '<path d="m9 3-1 3-3 .5-2 3 2 2v2l-2 2 2 3 3 .5 1 3h5l1-3 3-.5 2-3-2-2v-2l2-2-2-3L15 6l-1-3Z" transform="translate(1 -1) scale(.95)"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  minus: '<path d="M5 12h14"/>',
  maximize: '<path d="M9 3H3v6M15 21h6v-6M3 3l7 7m11 11-7-7"/>',
  restore: '<rect x="4" y="8" width="12" height="12" rx="1"/><path d="M8 8V4h12v12h-4"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  tag: '<path d="M3 3h9l9 9-9 9-9-9V3Z"/><circle cx="8" cy="8" r="1.2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 15v5Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkSquare: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3 3 7-7"/>',
  link: '<path d="m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1" transform="translate(1 -1) scale(.95)"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  arrowDown: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  bold: '<path d="M7 3h6a4.5 4.5 0 0 1 0 9H7m0 0h7a4.5 4.5 0 0 1 0 9H7V3"/>',
  italic: '<path d="M10 3h10M4 21h10M15 3 9 21"/>',
  quote: '<path d="M4 12h5v7H3v-7c0-4 2-6 5-7m10 7h3v7h-6v-7c0-4 2-6 5-7"/>',
  code: '<path d="m7 6-5 6 5 6m10-12 5 6-5 6M14 3l-4 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  moon: '<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
  volume: '<path d="m3 9 5 0 5-4v14l-5-4H3V9Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M3 9h5l5-4v14l-5-4H3V9Zm14 0 5 6m0-6-5 6"/>',
  wifi: '<path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0"/><circle cx="12" cy="20" r=".6"/>',
  battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 10v4"/><path d="M5 10h11v4H5Z" fill="currentColor" stroke="none"/>',
  control: '<path d="M3 7h8m4 0h6M3 17h3m4 0h11"/><circle cx="13" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  pause: '<path d="M7 4h3v16H7zm7 0h3v16h-3z"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
  headphones: '<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v8H5a2 2 0 0 1-2-2v-6Zm18 0h-4v8h2a2 2 0 0 0 2-2v-6Z"/>',
  leaf: '<path d="M20 3C5 1 1 13 7 18S22 15 20 3ZM4 21 16 8"/>',
  pin: '<path d="m8 3 10 0-2 6 4 4v2h-7v6m0-6H5v-2l4-4-1-6Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h1m3 0h1m3 0h1m3 0h.1M6 12h1m3 0h1m3 0h1m3 0h.1M7 16h10"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4M8 21h8"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 4-7 5 8"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  hand: '<path d="M8 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 4-3 6-7 6-4 0-6-3-9-8-1-3 1-4 3-2l1 1Z"/>',
  tidy: '<path d="M3 3v18h18M7 8h5V4H7zm8 0h6V4h-6zM7 17h5v-6H7zm8 0h6v-6h-6z"/>',
  zoom: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10h6M10 7v6"/>',
  journal: '<path d="M4 3h14a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3ZM4 17h16M8 3v10l3-2 3 2V3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
  cloud: '<path d="M6 19a5 5 0 0 1-1-10 7 7 0 0 1 13-2 6 6 0 0 1 1 12H6Z"/>',
  music: '<path d="M9 17V5l12-2v12M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/>',
  sort: '<path d="M4 6h16M4 12h11M4 18h6m9-7v9m-3-3 3 3 3-3"/>'
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.note}</svg>`;
}

export function appIcon(name, size = 48) {
  const common = `width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true"`;
  const body = {
    notes: '<rect x="7" y="4" width="49" height="55" rx="10" fill="#faf3d5" stroke="#bfae7955"/><path d="M17 4h29a10 10 0 0 1 10 10v5H7v-5A10 10 0 0 1 17 4Z" fill="#dcb75c"/><path d="M8 19h47" stroke="#aa842f" stroke-opacity=".3"/><path d="M15 28h32M15 36h32M15 44h24M15 52h18" stroke="#c7bb94" stroke-width="1.2"/><path d="M19 19v39" stroke="#d3948366"/><path d="m36 46 13-27 6 3-14 27-6 4 1-7Z" fill="#555e47"/><path d="m49 19 2-4 6 3-2 4" fill="#d08a65"/><path d="m35 53 1-7 5 3-6 4Z" fill="#d0b68b"/>',
    canvas: '<rect x="5" y="5" width="54" height="54" rx="14" fill="#eff0e4" stroke="#c4c8b4"/><path d="M19 22h20v20H22" stroke="#79907a" stroke-width="2"/><rect x="12" y="13" width="23" height="21" rx="3" fill="#b3c3a1" transform="rotate(-8 23 23)"/><path d="M17 20h13M17 25h9" stroke="#718566"/><rect x="31" y="29" width="22" height="22" rx="3" fill="#d2a082" transform="rotate(8 42 40)"/><path d="m35 42 5-5 6 8" stroke="#f7e0c5" stroke-width="2"/><circle cx="45" cy="36" r="2" fill="#f7e0c5"/>',
    files: '<path d="M5 17a6 6 0 0 1 6-6h17l6 6h19a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H11a6 6 0 0 1-6-6V17Z" fill="#b9c9cb" stroke="#7d9da1"/><path d="M6 27a6 6 0 0 1 6-6h42a5 5 0 0 1 5 5v26a6 6 0 0 1-6 6H11a6 6 0 0 1-6-6L6 27Z" fill="#d2e0df"/><path d="M7 27h50" stroke="#ecf5ee"/><path d="M20 39h5m13 0h5M28 47c3 2 5 2 8 0" stroke="#5d7a7f" stroke-width="2" stroke-linecap="round"/><path d="M33 30v15h-5" stroke="#89a4a3" stroke-width="1.5"/>',
    terminal: '<rect x="5" y="5" width="54" height="54" rx="13" fill="#31392f" stroke="#17271866"/><path d="M6 18h52" stroke="#81937544"/><circle cx="13" cy="12" r="2" fill="#ba8773"/><circle cx="20" cy="12" r="2" fill="#c6b47d"/><circle cx="27" cy="12" r="2" fill="#95ac86"/><path d="m16 28 11 8-11 8" stroke="#e5ecd5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M33 45h13" stroke="#bfccaa" stroke-width="3" stroke-linecap="round"/>',
    tempo: '<rect x="5" y="5" width="54" height="54" rx="14" fill="#d98764" stroke="#ac5f3d55"/><circle cx="32" cy="34" r="19" fill="#f4e8ce" stroke="#b97c5e"/><path d="M27 8h10M32 11v4" stroke="#faebce" stroke-width="3" stroke-linecap="round"/><path d="M32 20v3m14 11h-3M32 48v-3M18 34h3" stroke="#bcaa89"/><path d="M32 24v10l8 6" stroke="#545945" stroke-width="2.8" stroke-linecap="round"/><circle cx="32" cy="34" r="2.5" fill="#b9613d"/>',
    settings: '<rect x="5" y="5" width="54" height="54" rx="14" fill="#deded5" stroke="#afb3a1"/><circle cx="32" cy="32" r="19" fill="#75806e"/><path d="M29 11h6v10h-6zm0 32h6v10h-6zM11 29h10v6H11zm32 0h10v6H43z" fill="#deded5"/><path d="m15 19 4-4 7 7-4 4zm23 23 4-4 7 7-4 4zM15 45l7-7 4 4-7 7zm23-23 7-7 4 4-7 7z" fill="#deded5"/><circle cx="32" cy="32" r="11" fill="#deded5"/><circle cx="32" cy="32" r="6" fill="#a1ab99"/>',
    trash: '<path d="M17 20h30l-3 37H20l-3-37Z" fill="#d5d9cd" stroke="#8b9784"/><path d="M24 28v20M32 28v20M40 28v20" stroke="#9ca891" stroke-width="2"/><path d="M14 18h36M25 16v-5h14v5" stroke="#7e8c73" stroke-width="3" stroke-linecap="round"/>',
  };
  return `<svg ${common}>${body[name] || body.notes}</svg>`;
}

export const appNames = { notes: 'Notes Studio', canvas: 'Canvas', files: 'Files', terminal: 'Terminal', tempo: 'Tempo', settings: 'Settings' };
