/** All relevant pages as a collection for sitemap.xml */
export const showInSitemap = collection => {
  return collection.getFilteredByGlob('./src/**/*.{md,njk}');
};

/** All user-facing tags across all posts, excluding system tags (the firehose tag,
 *  per-type tags, and other framework-internal groupings). */
const SYSTEM_TAGS = ['notes', 'posts', 'reading', 'docs', 'all', 'article', 'note', 'listening', 'watching'];

export const tagList = collection => {
  const tagsSet = new Set();
  collection.getAll().forEach(item => {
    if (!item.data.tags) return;
    item.data.tags.filter(tag => !SYSTEM_TAGS.includes(tag)).forEach(tag => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
};
