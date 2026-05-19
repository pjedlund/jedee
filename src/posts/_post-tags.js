// Shared eleventyComputed.tags helper for post-type folder data files.
// Eleventy's data cascade merges folder `tags: "posts"` (string) with each page's
// `tags: [...]` array into a single array. This helper then appends `data.category`,
// so per-type collections (collections.article, .note, etc.) auto-exist via the
// tag-driven indexing introduced in Phase 1.
//
// Why a helper and not setDataDeepMerge: deep-merge has global side effects across
// every array field (syndication, gallery, recipeIngredient, ...). This stays scoped
// to the tag field where the behavior is wanted.
export const appendCategoryTag = data => {
  const merged = Array.isArray(data.tags) ? [...data.tags] : data.tags ? [data.tags] : [];
  if (data.category && !merged.includes(data.category)) {
    merged.push(data.category);
  }
  return merged;
};
