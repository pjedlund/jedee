// Builds the /search.json index. Pure functions over collection items, so the whole thing is unit-testable without Eleventy — see tests/search-index.test.js.

// ⚠ Order matters: fenced code and images go before links, or their inner brackets are eaten as link syntax first.
export const stripMarkdown = text => {
  if (!text) return '';
  return String(text)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\{[{%][\s\S]*?[}%]\}/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/!\[\[[^\]]*\]\]/g, ' ')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, ' ')
    .replace(/[*_~>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const excerpt = (text, limit = 140) => {
  const plain = stripMarkdown(text);
  if (plain.length <= limit) return plain;
  const cut = plain.substring(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.substring(0, lastSpace) : cut).trim();
};

// Every key in the `only` map for a type has to match that item's frontmatter, or the item is dropped.
const matchesOnly = (item, rules) =>
  !rules || Object.entries(rules).every(([key, value]) => item.data[key] === value);

// Every text value at a dotted front-matter path (`photo.caption`), lists and nested objects included.
export const fieldText = (data, path) => {
  const collect = value => {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) return value.flatMap(collect);
    if (typeof value === 'object') return value instanceof Date ? [] : Object.values(value).flatMap(collect);
    return [String(value)];
  };
  return collect(path.split('.').reduce((value, key) => value?.[key], data)).join(' ');
};

// `searchTerms:` in front matter adds words the page doesn't say itself (acronyms, nicknames) to the match text only; `fields` (settings.yaml `search.fields`) adds the type's front-matter fields, such as a jam's artist.
const toEntry = (item, fields = []) => {
  const {title = '', description = '', tags = [], searchTerms = ''} = item.data;
  const body = item.data.page?.rawInput ?? '';
  const searchableTags = tags.filter(tag => tag !== 'posts' && tag !== 'searchable');
  return {
    url: item.url,
    title,
    type: item.data.category || 'page',
    date: item.date ? item.date.getTime() : 0,
    text: excerpt(body),
    ...(searchTerms.length && {terms: [searchTerms].flat().join(' ').toLowerCase()}),
    keywords: stripMarkdown(`${title} ${description} ${searchableTags.join(' ')} ${[searchTerms].flat().join(' ')} ${fields.map(path => fieldText(item.data, path)).join(' ')} ${body}`).toLowerCase()
  };
};

export const buildIndex = (collections, {types = [], only = {}, fields = {}} = {}) =>
  types.flatMap(type => (collections[type] || []).filter(item => matchesOnly(item, only[type])).map(item => toEntry(item, fields[type])));
