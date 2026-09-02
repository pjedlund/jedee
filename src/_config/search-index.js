// Builds the /search.json index. Pure functions over collection items, so the whole thing is unit-testable without Eleventy — see _local/tests/search-index.test.js.

// ⚠ Order matters: fenced code and images go before links, or their inner brackets are eaten as link syntax first.
export const stripMarkdown = text => {
  if (!text) return '';
  return String(text)
    .replace(/<!--[\s\S]*?-->/g, ' ')
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

export const excerpt = (text, limit = 140) => stripMarkdown(text).substring(0, limit).trim();

// Every key in the `only` map for a type has to match that item's frontmatter, or the item is dropped.
const matchesOnly = (item, rules) =>
  !rules || Object.entries(rules).every(([key, value]) => item.data[key] === value);

const toEntry = item => {
  const {title = '', description = '', tags = []} = item.data;
  const body = item.data.page?.rawInput ?? '';
  const searchableTags = tags.filter(tag => tag !== 'posts' && tag !== 'searchable');
  return {
    url: item.url,
    title,
    type: item.data.category || 'page',
    date: item.date ? item.date.getTime() : 0,
    text: excerpt(body),
    keywords: stripMarkdown(`${title} ${description} ${searchableTags.join(' ')} ${body}`).toLowerCase()
  };
};

export const buildIndex = (collections, {types, only = {}}) =>
  types.flatMap(type => (collections[type] || []).filter(item => matchesOnly(item, only[type])).map(toEntry));
