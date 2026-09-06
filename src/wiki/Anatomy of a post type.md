---
description: "The nine places a new post type must be wired in before it works, and where the sixteen types legitimately diverge."
date: 2026-07-31
---

jedee has **sixteen** post types. Adding one is not a design problem but a wiring problem: there are nine places a type has to appear before it works, and fifteen of the sixteen fill them the same way. This page is the checklist and the places types legitimately diverge.

The sixteen: article, note, reading, watching, jam, photo, recipe, event, bookmark, reply, repost, like, rsvp, audio, video, activity. Fifteen have a written spec in `_local/project_docs/`; **activities has none** — it arrived through a different route (see [[The activities archive]]) and is the type most likely to be the exception below.

## The four-key folder data file

Every type is a folder under `src/posts/` with a data file of the same name, and every one of the sixteen carries these four keys:

```json
{
  "layout": "note",
  "tags": "posts",
  "category": "note",
  "permalink": "/notes/{{ page.fileSlug | slugify }}/index.html"
}
```

**`category` is the type; `tags` is the user's vocabulary.** This split is the load-bearing decision of the whole system. Eleventy's natural instinct is to put the type in `tags` — but `tags` also drives the public `/tags/` index, so a type name in there would publish a `/tags/note/` page nobody asked for. Instead the type lives in `category`, and `tags: "posts"` puts every post into one firehose collection. `collections.js` keeps a `SYSTEM_TAGS` list (`posts`, `docs`, `all`) that `tagList` filters out, so the tag index only ever shows words Johan chose.

This is a **jedee divergence** — Eleventy Excellent ships two types (`articles`, `notes`) and tags them directly.

⚠ **Photo is the one type not configured in JSON.** Fifteen types have a `<type>.json`; photo has `photos.11tydata.js`, an ES module carrying the same four keys plus a fifth:

```js
eleventyComputed: {
  photoExif: async data => (data.photo && data.photo.src ? await extractPhotoExif(data.photo.src) : null)
}
```

It was ported from `photos.json` so EXIF could be read from the file at build time — and `photoExif` is a **top-level** key rather than nested under `photo`, because a computed key that reads its own parent is a self-reference in the data cascade. Worth knowing before writing a script that globs `src/posts/*/*.json` expecting sixteen hits: it finds fifteen.

## Registration: one array, explicit aliases

`src/_config/collections.js` exports the type list and a factory:

```js
export const byCategory = cat => collection =>
  collection.getFilteredByGlob('./src/posts/**/*.md')
    .filter(item => item.data.category === cat)
    .reverse();

export const POST_TYPES = ['article', 'note', 'reading', /* … */ 'activity'];
```

`eleventy.config.js` loops it: `POST_TYPES.forEach(type => eleventyConfig.addCollection(type, byCategory(type)))`.

⚠ **The layout aliases are not looped, and must not be.** `article` is in `POST_TYPES` but there is no `article.njk` — articles use `post.njk`, EE's stock layout name. A generic `addLayoutAlias(t, t + '.njk')` loop would emit a bogus alias for it. All nineteen aliases are written out one per line instead (`eleventy.config.js:45–63` — the sixteen types minus `article`, plus `base`, `page`, `post` and `tags`). The comment in `collections.js` says so; it is the single most repeated warning across the fifteen specs.

## One archive template, fifteen wrappers

`src/_includes/partials/archive-listing.njk` is the whole archive page — heading, intro, masonry, pagination, empty state. A type's archive page in `src/pages/` is frontmatter plus five `{% set %}` lines:

```njk
{% set cardPartial = "card-note.njk" %}
{% set masonryLayout = "33-33-33" %}
{% set collectionToPaginate = collections.note %}
{% set paginationMetaKey = "blog" %}

{% include "partials/archive-listing.njk" %}
```

**Events is the one type that doesn't use it.** `events.njk` partitions the collection into Upcoming and Past with the `filterUpcoming`/`filterPast` date filters, which a single paginated list can't express, so it hand-rolls two `<custom-masonry>` sections. The cost is a copy of the header markup that now has to be kept in step by hand.

⚠ Note what `archive-listing.njk` loops with: `{% asyncEach item in pagination.items %}`, not `{% for %}`. Seven of the card partials call the async `{% image %}` shortcode, and an async shortcode reached through an `{% include %}` inside a plain `{% for %}` is exactly the shape the interlinker silently blanks — see [[The interlinker's second render pass]]. `events.njk` gets away with a plain `{% for %}` only because `card-event.njk` has no image shortcode in it: it fills the card's image slot with a date badge.

## The other five slots

- **Layout** — `src/_layouts/<type>.njk`. All sixteen exist. All sixteen open with `<article class="wrapper flow prose h-entry">`; see [[Microformats]].
- **Card** — `src/_includes/partials/card-<type>.njk`. Eleven types have their own; the five response types share one — see [[The title-less post types]].
- **Feed** — twelve types have one, four deliberately don't. See [[Per-type feeds]].
- **Navigation** — one entry in `src/_data/navigation.js` with a Lucide icon and the collection key for the count. All sixteen are listed. ⚠ Jam is asymmetric: URL `/jams/`, collection key `jam`.
- **Schema** — a `schema:` line in the layout's front matter. See [[One JSON-LD envelope for sixteen types]].

Source: the fifteen per-type specs in `_local/project_docs/`, checked against live code 2026-07-31.
