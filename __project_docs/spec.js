// ── Auto table of contents ── builds links from the <h2>s in <main>.
(function () {
  const main = document.querySelector('main');
  const toc = document.getElementById('toc');
  if (!main || !toc) return;
  const heads = main.querySelectorAll('h2');
  if (!heads.length) return;
  const slug = s => s.toLowerCase()
    .replace(/&amp;|&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const ol = document.createElement('ol');
  heads.forEach(h => {
    if (!h.id) h.id = slug(h.textContent);
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    ol.appendChild(li);
  });
  const label = document.createElement('p');
  label.className = 'toc-label';
  label.textContent = 'On this page';
  toc.appendChild(label);
  toc.appendChild(ol);
})();

(function() {
  const DOC_KEY = document.body.dataset.docKey || 'spec';
  const STORE_KEY = 'jedee_annotations';

  // ── Storage ──
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveAll(data) { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  function loadDoc() { return loadAll()[DOC_KEY] || []; }
  function saveDoc(anns) {
    const all = loadAll();
    if (anns.length === 0) delete all[DOC_KEY];
    else all[DOC_KEY] = anns;
    saveAll(all);
  }

  // ── Fuzzy text anchor ──
  function getContext(range) {
    const selected = range.toString();
    const container = range.commonAncestorContainer;
    const full = (container.textContent || container.innerText || '');
    const start = full.indexOf(selected);
    if (start === -1) return null;
    return {
      text: selected,
      before: full.slice(Math.max(0, start - 30), start),
      after: full.slice(start + selected.length, start + selected.length + 30)
    };
  }

  // ── Rendering ──
  function findAndWrap(ann, index) {
    const main = document.querySelector('main');
    if (!main) return;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.textContent.indexOf(ann.anchor.text);
      if (idx === -1) continue;
      const before10 = ann.anchor.before.slice(-10);
      const after10 = ann.anchor.after.slice(0, 10);
      const nodeText = node.textContent;
      const contextOk = (!before10 || nodeText.slice(Math.max(0,idx-10), idx).includes(before10.slice(-4)))
                     || (!after10  || nodeText.slice(idx + ann.anchor.text.length, idx + ann.anchor.text.length + 10).includes(after10.slice(0,4)));
      if (!contextOk && ann.anchor.before && ann.anchor.after) continue;

      const before = node.textContent.slice(0, idx);
      const after = node.textContent.slice(idx + ann.anchor.text.length);
      const mark = document.createElement('mark');
      mark.className = 'annotation';
      mark.dataset.index = index;
      mark.textContent = ann.anchor.text;
      const afterNode = document.createTextNode(after);
      node.textContent = before;
      node.parentNode.insertBefore(mark, node.nextSibling);
      node.parentNode.insertBefore(afterNode, mark.nextSibling);
      attachTooltip(mark, ann, index);
      break;
    }
  }

  function renderAll() {
    document.querySelectorAll('mark.annotation').forEach(m => {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    const anns = loadDoc();
    anns.forEach((ann, i) => findAndWrap(ann, i));
    updateBar();
  }

  // ── Tooltip ──
  const tooltip = document.getElementById('ann-tooltip');

  function attachTooltip(mark, ann, index) {
    mark.addEventListener('mouseenter', e => {
      tooltip.textContent = ann.comment;
      tooltip.style.display = 'block';
      positionTooltip(e);
    });
    mark.addEventListener('mousemove', positionTooltip);
    mark.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    mark.addEventListener('click', e => {
      e.stopPropagation();
      showDeleteConfirm(index, mark);
    });
  }

  function positionTooltip(e) {
    const pad = 12;
    let x = e.clientX + pad;
    let y = e.clientY - tooltip.offsetHeight - pad;
    if (x + tooltip.offsetWidth > window.innerWidth - pad) x = e.clientX - tooltip.offsetWidth - pad;
    if (y < pad) y = e.clientY + pad;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  // ── Delete confirm ──
  function showDeleteConfirm(index, mark) {
    const anns = loadDoc();
    const comment = anns[index] ? anns[index].comment : '';
    if (confirm('Delete this annotation?\n\n"' + comment + '"')) {
      anns.splice(index, 1);
      saveDoc(anns);
      renderAll();
    }
  }

  // ── Popover ──
  const popover = document.getElementById('ann-popover');
  const annText = document.getElementById('ann-text');
  const annQuote = document.getElementById('ann-quote');
  let pendingAnchor = null;
  let pendingRange = null;

  document.getElementById('ann-save').addEventListener('click', () => {
    const comment = annText.value.trim();
    if (!comment || !pendingAnchor) { hidePopover(); return; }
    const anns = loadDoc();
    anns.push({ anchor: pendingAnchor, comment, created: new Date().toISOString() });
    saveDoc(anns);
    hidePopover();
    renderAll();
  });

  document.getElementById('ann-cancel').addEventListener('click', hidePopover);

  annText.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) document.getElementById('ann-save').click();
    if (e.key === 'Escape') hidePopover();
  });

  function hidePopover() {
    popover.style.display = 'none';
    annText.value = '';
    pendingAnchor = null;
    if (pendingRange) { window.getSelection().removeAllRanges(); pendingRange = null; }
  }

  function showPopover(x, y, anchor, range) {
    pendingAnchor = anchor;
    pendingRange = range;
    annQuote.textContent = '"' + anchor.text.slice(0, 120) + (anchor.text.length > 120 ? '…' : '') + '"';
    popover.style.display = 'block';
    let px = x, py = y + 12;
    if (px + popover.offsetWidth > window.innerWidth - 16) px = window.innerWidth - popover.offsetWidth - 16;
    if (py + popover.offsetHeight > window.innerHeight - 16) py = y - popover.offsetHeight - 12;
    popover.style.left = px + 'px';
    popover.style.top = py + 'px';
    setTimeout(() => annText.focus(), 50);
  }

  // ── Selection listener ──
  document.addEventListener('mouseup', e => {
    if (popover.contains(e.target)) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text.length < 3) return;
    const main = document.querySelector('main');
    if (!main) return;
    const range = sel.getRangeAt(0);
    if (!main.contains(range.commonAncestorContainer)) return;
    const anchor = getContext(range);
    if (!anchor) return;
    showPopover(e.clientX, e.clientY, anchor, range);
  });

  document.addEventListener('mousedown', e => {
    if (!popover.contains(e.target)) hidePopover();
  });

  // ── Export / clear bar ──
  const bar = document.getElementById('ann-bar');

  function updateBar() {
    const anns = loadDoc();
    bar.style.display = anns.length > 0 ? 'flex' : 'none';
  }

  document.getElementById('ann-export').addEventListener('click', () => {
    const anns = loadDoc();
    if (!anns.length) return;
    const lines = ['# Annotations — ' + DOC_KEY, ''];
    anns.forEach((a, i) => {
      lines.push('## ' + (i+1) + '. ' + a.created.slice(0,10));
      lines.push('> ' + a.anchor.text);
      lines.push('');
      lines.push(a.comment);
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      const btn = document.getElementById('ann-export');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    });
  });

  document.getElementById('ann-clear').addEventListener('click', () => {
    if (confirm('Delete all annotations on this page?')) {
      saveDoc([]);
      renderAll();
    }
  });

  // ── Init ──
  renderAll();
})();
