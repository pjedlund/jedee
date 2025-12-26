/** All posts to show on index as a collection. */
export const getAllPosts = collection => {
  return collection.getFilteredByGlob('./src/articles/**/*.md').reverse();
};

/** All articles as a collection. */
export const getAllArticles = collection => {
  return collection.getFilteredByGlob('./src/articles/**/*.md').reverse();
};

/** All notes as a collection. */
export const getAllNotes = collection => {
  return collection.getFilteredByGlob('./src/notes/**/*.md').reverse();
};

/** All reading as a collection. */
export const getAllReading = collection => {
  return collection.getFilteredByGlob('./src/reading/**/*.md').reverse();
};

/** All listening as a collection. */
export const getAllListening = collection => {
  return collection.getFilteredByGlob('./src/listening/**/*.md').reverse();
};

/** All relevant pages as a collection for sitemap.xml */
export const showInSitemap = collection => {
  return collection.getFilteredByGlob('./src/**/*.{md,njk}');
};

/** All tags from all posts as a collection - excluding custom collections */
export const tagList = collection => {
  const tagsSet = new Set();
  collection.getAll().forEach(item => {
    if (!item.data.tags) return;
    item.data.tags.filter(tag => !['notes', 'posts', 'reading', 'docs', 'all'].includes(tag)).forEach(tag => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
};