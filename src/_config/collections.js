import { unwikilink } from './filters/unwikilink.js';
import { slugifyString } from './filters/slugify.js';

/** All relevant pages as a collection for sitemap.xml */
export const showInSitemap = collection => {
  return collection.getFilteredByGlob('./src/**/*.{md,njk}');
};

/** Per-type collections — filter posts by their `category` field, set in each
 * src/posts/<type>/<type>.json. eleventy.config.js loops over POST_TYPES to register each collection. Avoids dragging `category` into the `tags` field (which would pollute the user-facing /tags/ index and force `.11tydata.js` for the data file). */
export const byCategory = cat => collection =>
  collection
    .getFilteredByGlob('./src/posts/**/*.md')
    .filter(item => item.data.category === cat)
    .reverse();

/** Every per-type collection name. Drives `addCollection` registration in
 * eleventy.config.js. Add a new type's category here to register its collection. NB: layout aliases stay explicit in eleventy.config.js — `article` has no article.njk (it uses layout: post), so a generic alias loop would break. */
export const POST_TYPES = ['article', 'note', 'reading', 'jam', 'watching', 'bookmark', 'reply', 'rsvp', 'like', 'repost', 'photo', 'recipe', 'event', 'audio', 'video', 'activity'];

/** All user-facing tags across all posts, excluding system tags. Per-type
 * category names (article, note, …) never enter `tags`; they live in `category` only. Keep this list minimal — only the firehose + EE built-ins. */
const SYSTEM_TAGS = ['posts', 'docs', 'all'];

export const tagList = collection => {
  const tagsSet = new Set();
  collection.getAll().forEach(item => {
    if (!item.data.tags) return;
    item.data.tags.filter(tag => !SYSTEM_TAGS.includes(tag)).forEach(tag => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
};

/** Jam genres as a browsable index, kept deliberately OUT of `tags`.
 * Same reasoning as `byCategory` above: `genre` is its own field, so genre pages
 * live at /jams/genre/ and never enter the user-facing /tags/ index. Values are
 * authored as Obsidian [[wikilinks]] for the graph, so the brackets are stripped
 * here — they must never reach a URL or a label. Grouping is BY SLUG, which
 * collapses the vocabulary's case drift ("Soundtrack" / "soundtrack") onto one
 * page instead of splitting it into two near-empty ones.
 * Returns [{name, slug, items}] sorted by name, newest jam first within a genre. */
export const genreList = collection => {
  const groups = new Map();

  collection.getAll().forEach(item => {
    if (item.data.category !== 'jam' || !item.data.genre) return;

    const values = Array.isArray(item.data.genre) ? item.data.genre : [item.data.genre];

    unwikilink(values).forEach(raw => {
      // unwikilink's pattern needs at least one char between the brackets, so an
      // empty "[[]]" survives it — strip any leftovers so they can't reach a URL.
      const name = typeof raw === 'string' ? raw.replace(/[[\]]/g, '').trim() : '';
      if (!name) return;
      const slug = slugifyString(name);
      if (!slug) return;

      if (!groups.has(slug)) groups.set(slug, {slug, spellings: new Map(), items: []});
      const group = groups.get(slug);
      group.spellings.set(name, (group.spellings.get(name) ?? 0) + 1);
      group.items.push(item);
    });
  });

  return Array.from(groups.values())
    .map(({slug, spellings, items}) => ({
      // Case drift means one genre can arrive spelled several ways. The most
      // common spelling wins the label, ties broken alphabetically — otherwise
      // the label would depend on which jam the build happened to read first.
      name: Array.from(spellings.entries()).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
      )[0][0],
      slug,
      items: items.sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
