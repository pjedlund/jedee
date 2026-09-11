import fs from 'node:fs';
import { unwikilink } from './filters/unwikilink.js';
import { slugifyString } from './filters/slugify.js';
import { load as yamlLoad } from 'js-yaml';

/** Posts picked in Sveltia, in their order. Each pick is { type: <folder in src/posts>, post: <path inside it, no .md> }, as Sveltia saves it. */
export const resolvePicks = (items, picks = []) => {
  const byPath = new Map(items.map(item => [item.inputPath, item]));
  return (picks ?? []).flatMap(({ type, post }) => {
    const inputPath = `./src/posts/${type}/${post}.md`;
    // ⚠ A pick that doesn't exist stops the build, so a renamed post can't drop off a page silently.
    if (!fs.existsSync(inputPath)) throw new Error(`Picked post not found: ${inputPath} (featured.yaml or now.md)`);
    return byPath.get(inputPath) ?? []; // a draft is left out of production builds, like everywhere else
  });
};

/** The Featured list, src/_data/featured.yaml → posts (Sveltia: Featured). Read from the file: collections are built outside the data cascade. */
export const featured = collection =>
  resolvePicks(collection.getAll(), yamlLoad(fs.readFileSync('./src/_data/featured.yaml', 'utf8'))?.posts);

/** All relevant pages as a collection for sitemap.xml */
export const showInSitemap = collection => {
  return collection.getFilteredByGlob('./src/**/*.{md,njk}');
};

/** Per-type collections — filter posts by the `category` field (set in each src/posts/<type>/<type>.json). Kept out of `tags` so it never pollutes the /tags/ index. */
export const byCategory = cat => collection =>
  collection
    .getFilteredByGlob('./src/posts/**/*.md')
    .filter(item => item.data.category === cat)
    .reverse();

/** Every per-type collection name; add a type here to register its collection. Layout aliases stay explicit in eleventy.config.js — `article` uses layout: post (no article.njk), so an alias loop would break. */
export const POST_TYPES = ['article', 'note', 'reading', 'jam', 'watching', 'bookmark', 'reply', 'rsvp', 'like', 'repost', 'photo', 'recipe', 'event', 'audio', 'video', 'activity'];

/** All user-facing tags, excluding system tags. Per-type category names live in `category`, never in `tags`. Keep SYSTEM_TAGS minimal — firehose + EE built-ins only. */
const SYSTEM_TAGS = ['posts', 'docs', 'all', 'searchable'];

export const tagList = collection => {
  const tagsSet = new Set();
  collection.getAll().forEach(item => {
    if (!item.data.tags) return;
    item.data.tags.filter(tag => !SYSTEM_TAGS.includes(tag)).forEach(tag => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
};

/** Jam genres as a browsable index, kept out of `tags` (like `byCategory`): `genre` is its own field, so pages live at /jams/genres/, never in /tags/.
 * Values are authored as [[wikilinks]] for the graph — brackets are stripped here and must never reach a URL or label.
 * Grouping is BY SLUG, collapsing case drift ("Soundtrack"/"soundtrack") onto one page. Returns [{name, slug, items}] sorted by name, newest jam first within a genre. */
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
