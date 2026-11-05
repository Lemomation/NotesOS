import { escapeHTML } from './utils.js';

export function inlineMarkdown(source) {
  const tokens = [];
  const token = html => `\u0000${tokens.push(html) - 1}\u0000`;
  let text = String(source).replace(/\u0000/g, '');
  text = text.replace(/`([^`]+)`/g, (_, code) => token(`<code>${escapeHTML(code)}</code>`));
  text = text.replace(/\[\[([^\]]+)\]\]/g, (_, title) => token(`<button class="wiki-link" data-note-title="${escapeHTML(title)}">${escapeHTML(title)}</button>`));
  text = text.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, url) => /^(https?:\/\/|mailto:)/i.test(url) ? token(`<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`) : escapeHTML(label));
  text = escapeHTML(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/~~([^~]+)~~/g, '<s>$1</s>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)] || '');
}

export function renderMarkdown(source) {
  const lines = String(source).replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let list = '', quote = false;
  const closeList = () => { if (list) html.push(`</${list}>`); list = ''; };
  const closeQuote = () => { if (quote) html.push('</blockquote>'); quote = false; };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      closeList(); closeQuote();
      const language = line.trim().slice(3);
      const code = [];
      while (++index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index]);
      html.push(`<pre><span class="code-language">${escapeHTML(language || 'text')}</span><code>${escapeHTML(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (!line.trim()) { closeList(); closeQuote(); continue; }
    if (/^\|.+\|\s*$/.test(line) && index + 1 < lines.length && /^\|?[\s:|\-]+\|/.test(lines[index + 1])) {
      closeList(); closeQuote();
      const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      html.push(`<div class="table-scroll"><table><thead><tr>${cells(line).map(c => `<th>${inlineMarkdown(c)}</th>`).join('')}</tr></thead><tbody>`);
      index += 2;
      while (index < lines.length && /^\|/.test(lines[index])) { html.push(`<tr>${cells(lines[index]).map(c => `<td>${inlineMarkdown(c)}</td>`).join('')}</tr>`); index++; }
      index--;
      html.push('</tbody></table></div>');
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { closeList(); closeQuote(); const level = Math.min(heading[1].length + 1, 6); html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); continue; }
    if (/^\s*([-*_])\1\1+\s*$/.test(line)) { closeList(); closeQuote(); html.push('<hr>'); continue; }
    if (/^>\s?/.test(line)) {
      closeList();
      if (!quote) { html.push('<blockquote>'); quote = true; }
      html.push(`<p>${inlineMarkdown(line.replace(/^>\s?/, '').replace(/^\[!\w+\]\s*/, ''))}</p>`);
      continue;
    }
    closeQuote();
    const task = /^\s*[-*]\s+\[([ xX])\]\s*(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (task || bullet || ordered) {
      const type = ordered ? 'ol' : 'ul';
      if (list !== type) { closeList(); list = type; html.push(`<${type}>`); }
      if (task) html.push(`<li class="task-item${task[1] !== ' ' ? ' done' : ''}"><input type="checkbox" data-task-line="${index}" aria-label="${escapeHTML(task[2])}" ${task[1] !== ' ' ? 'checked' : ''}><span>${inlineMarkdown(task[2])}</span></li>`);
      else html.push(`<li>${inlineMarkdown((bullet || ordered)[1])}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeList(); closeQuote();
  return html.join('\n');
}

export function toggleMarkdownTask(source, lineNumber, checked) {
  const lines = source.split('\n');
  if (/^\s*[-*]\s+\[[ xX]\]/.test(lines[lineNumber] || '')) lines[lineNumber] = lines[lineNumber].replace(/\[[ xX]\]/, checked ? '[x]' : '[ ]');
  return lines.join('\n');
}
