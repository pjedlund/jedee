/** All relevant pages as a collection for sitemap.xml */
export const showInSitemap = collection => {
  return collection.getFilteredByGlob('./src/**/*.{md,njk}');
};

/** Per-type collections — filter posts by their `category` field, set in each
 *  src/posts/<type>/<type>.json. eleventy.config.js loops over POST_TYPES to
 *  register each collection. Avoids dragging `category` into the `tags` field
 *  (which would pollute the user-facing /tags/ index and force `.11tydata.js`
 *  for the data file). */
export const byCategory = cat => collection =>
  collection
    .getFilteredByGlob('./src/posts/**/*.md')
    .filter(item => item.data.category === cat)
    .reverse();

/** Every per-type collection name. Drives `addCollection` registration in
 *  eleventy.config.js. Add a new type's category here to register its collection.
 *  NB: layout aliases stay explicit in eleventy.config.js — `article` has no
 *  article.njk (it uses layout: post), so a generic alias loop would break. */
export const POST_TYPES = ['article', 'note', 'reading', 'jam', 'watching', 'bookmark', 'reply', 'rsvp', 'like', 'repost', 'photo', 'recipe', 'event'];

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
