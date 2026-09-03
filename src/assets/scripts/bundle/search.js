// SITE SEARCH — fetches /search.json on first open and filters it in the browser. No search library: a substring scan over ~290 entries is faster than the keystroke that triggered it.

const toggle = document.querySelector('#search-toggle');
const panel = document.querySelector('#search-panel');
const input = document.querySelector('#search-input');
const clear = document.querySelector('#search-clear');
const results = document.querySelector('#search-results');
const more = document.querySelector('#search-more');
const root = document.querySelector('.site-search');
// Copy lives in meta.js and arrives on data attributes, so there is one source of truth for it.
const copy = {more: more.dataset.more, empty: more.dataset.empty};

const LIMIT = 8;
let index = null;
let active = -1;

const loadIndex = async () => {
  if (index) return index;
  try {
    const response = await fetch('/search.json');
    index = (await response.json()).search;
  } catch {
    index = [];
  }
  return index;
};

const iconFor = type => {
  const template = document.querySelector(`[data-search-icon="${type}"]`) || document.querySelector('[data-search-icon="page"]');
  return template ? template.content.cloneNode(true) : document.createDocumentFragment();
};

// Title matches rank above body-only matches; newest first within each group.
const rank = (entries, query) => {
  const titled = entry => entry.title.toLowerCase().includes(query);
  return entries.sort((a, b) => titled(b) - titled(a) || b.date - a.date);
};

const search = query => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return rank(index.filter(entry => terms.every(term => entry.keywords.includes(term))), query.toLowerCase());
};

const row = (entry, position) => {
  const li = document.createElement('li');
  li.className = 'search-result';
  li.id = `search-result-${position}`;
  li.setAttribute('role', 'option');
  li.setAttribute('aria-selected', 'false');

  const link = document.createElement('a');
  link.href = entry.url;
  link.appendChild(iconFor(entry.type));

  const title = document.createElement('span');
  title.className = 'search-result-title';
  title.textContent = entry.title;
  link.appendChild(title);

  // Over half the index has no body at all (jams, orienteering activities) — omit the element rather than render an empty one that leaves a ragged gap.
  if (entry.text) {
    const text = document.createElement('span');
    text.className = 'search-result-text';
    text.textContent = entry.text;
    link.appendChild(text);
  }

  li.appendChild(link);
  return li;
};

const setActive = next => {
  const items = [...results.children];
  if (!items.length) return;
  active = (next + items.length) % items.length;
  items.forEach((item, i) => item.setAttribute('aria-selected', String(i === active)));
  input.setAttribute('aria-activedescendant', items[active].id);
  items[active].scrollIntoView({block: 'nearest'});
};

const render = matches => {
  results.replaceChildren(...matches.slice(0, LIMIT).map(row));
  active = -1;
  input.removeAttribute('aria-activedescendant');
  input.setAttribute('aria-expanded', String(matches.length > 0));

  const extra = matches.length - LIMIT;
  if (!input.value.trim()) more.textContent = '';
  else if (!matches.length) more.textContent = copy.empty;
  else more.textContent = extra > 0 ? `${extra} ${copy.more}` : '';
};

const close = () => {
  toggle.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-expanded', 'false');
};

const open = async () => {
  toggle.setAttribute('aria-expanded', 'true');
  // Close the mega-menu: both panels anchor to the same header row with the same alignment, so open together they sit on top of each other.
  document.querySelector('[data-menu-toggle]')?.setAttribute('aria-expanded', 'false');
  input.focus();
  await loadIndex();
};

toggle.addEventListener('click', () => {
  if (toggle.getAttribute('aria-expanded') === 'true') close();
  else open();
});

input.addEventListener('input', () => {
  clear.hidden = !input.value;
  render(input.value.trim() ? search(input.value) : []);
});

clear.addEventListener('click', () => {
  input.value = '';
  clear.hidden = true;
  render([]);
  input.focus();
});

// Match on event.key, not event.code: `code` is the physical key position and arrives empty from virtual keyboards and some assistive tech.
panel.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setActive(active + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    setActive(active - 1);
  } else if (event.key === 'Enter' && active > -1) {
    event.preventDefault();
    results.children[active].querySelector('a').click();
  } else if (event.key === 'Escape') {
    close();
    toggle.focus();
  }
});

document.addEventListener('click', event => {
  if (!root.contains(event.target)) close();
});
