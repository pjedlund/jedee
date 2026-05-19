/** All relevant pages as a collection for sitemap.xml */
export const showInSitemap = collection => {
  return collection.getFilteredByGlob('./src/**/*.{md,njk}');
};

/** Per-type collections — filter posts by their `category` field, set in each
 *  src/posts/<type>/<type>.json. Explicit registration in eleventy.config.js.
 *  Avoids dragging `category` into the `tags` field (which would pollute the
 *  user-facing /tags/ index and force `.11tydata.js` for the data file). */
const byCategory = cat => collection =>
  collection
    .getFilteredByGlob('./src/posts/**/*.md')
    .filter(item => item.data.category === cat)
    .reverse();

export const article = byCategory('article');
export const note = byCategory('note');
export const reading = byCategory('reading');
export const jam = byCategory('jam');
export const watching = byCategory('watching');

/** All user-facing tags across all posts, excluding system tags. Per-type
 *  category names (article, note, …) never enter `tags`; they live in
 *  `category` only. Keep this list minimal — only the firehose + EE built-ins. */
const SYSTEM_TAGS = ['posts', 'docs', 'all'];

export const tagList = collection => {
  const tagsSet = new Set();
  collection.getAll().forEach(item => {
    if (!item.data.tags) return;
    item.data.tags.filter(tag => !SYSTEM_TAGS.includes(tag)).forEach(tag => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
};
