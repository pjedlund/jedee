/**
 * Keep only the posts that carry map coordinates (lat + lon in frontmatter). Newest first (collections come date-ascending). Used by the place-map overview (partials/place-map-activities.njk) — Nunjucks' selectattr can't reach nested paths like "data.lat", hence a filter.
 */
export const located = (posts) => posts.filter((p) => p.data.lat && p.data.lon).reverse();
