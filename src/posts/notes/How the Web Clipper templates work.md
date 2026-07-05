---
title: How the Web Clipper templates work
description: A dev note on the Obsidian Web Clipper templates — one JSON template per source that turns a page into a frontmatter-complete post, with excerpts from the Bandcamp, Apple Music, IMDb, and Standard Ebooks templates.
date: 2026-07-05
tags:
  - obsidian
  - indieweb
draft: true
---

Most posts on this site that are about *someone else's* thing — an album, a film, a book, a bookmarked page — are not written by hand. They are clipped: right-click a source page in the browser, and the [Obsidian Web Clipper](https://obsidian.md/clipper) extension writes a frontmatter-complete markdown file into the right `src/posts/<type>/` folder. The unit of configuration is one JSON template per source, git-tracked at `src/_obsidian/clipper/*.json` — twelve today: Bandcamp and Apple Music (jams), Letterboxd and IMDb (watching), Standard Ebooks (reading), a recipe template, and source-agnostic templates for bookmarks, likes, replies, reposts, RSVPs, and notes. The canonical write-up lives in `__project_docs/web-clipper-pattern.html`; this note is the short version.

## Anatomy of a template

{% raw %}

A template is a small JSON object. `src/_obsidian/clipper/bandcamp-clipper.json`, trimmed:

```json
{
  "name": "Bandcamp",
  "behavior": "create",
  "noteContentFormat": "{{schema:@MusicAlbum:track.itemListElement|map:item => ({name: item.item.name, url: item.item.mainEntityOfPage})|template:\"- [${name}](${url})\\n\"}}",
  "properties": [
    { "name": "title",  "value": "{{schema:@MusicAlbum:name}}", "type": "text" },
    { "name": "artist", "value": "{{schema:@MusicAlbum:byArtist.name|wikilink}}", "type": "text" },
    { "name": "genre",  "value": "{{schema:@MusicAlbum:keywords|wikilink}}", "type": "multitext" },
    { "name": "cover",  "value": "{{schema:@MusicAlbum:image}}", "type": "text" },
    { "name": "year",   "value": "{{schema:@MusicAlbum:datePublished|date:\"YYYY\"}}", "type": "number" }
    // … plus draft/date/source and empty manual-fill fields (favoriteTrack, odesliUrl, youtubeSlug)
  ],
  "triggers": ["/bandcamp\\.com/album/"],
  "noteNameFormat": "{{schema:@MusicAlbum:name|safe_name}}",
  "path": "posts/jams/"
}
```

Pointers:

- **`properties[]` becomes the YAML frontmatter**, one object per field. The `type` (`text`, `multitext`, `number`, `date`, `checkbox`) decides how the value serializes: `multitext` writes a YAML list *and splits the captured value on commas*, so a description on `multitext` shatters into a list at every comma. Scalars stay `text`; `multitext` is reserved for genuinely multi-value fields like `genre` and `cast`.
- **`path` decides the post type.** The file lands in `posts/jams/`, and `category`, `layout`, and `permalink` are inherited from that folder's directory data file — the template never has to emit them.
- **`triggers` auto-select the template.** Three forms: a literal URL prefix (IMDb uses `https://www.imdb.com/title/`), a regex that must be wrapped in forward slashes (Bandcamp's per-artist subdomains need one — an unwrapped regex is silently read as a prefix and never matches), or a schema.org type (`recipe-clipper.json` triggers on `schema:@Recipe`). An empty `triggers: []` means manual pick from the menu, which is how `bookmark-clipper.json` works.
- **`noteNameFormat` is the filename — title only, through `|safe_name`.** The filename is both the Obsidian wikilink target and the Eleventy slug, so no author or year suffix; `safe_name` only strips filesystem-illegal characters.
- **`noteContentFormat` is the note body.** Usually empty; Bandcamp maps the album's tracklist into a markdown link list, and the recipe template writes ingredients and instructions as body lists.
- **`cover` is a remote URL as plain `text`.** The build's Image HTML transform fetches and self-hosts it; the clipper's job ends at writing the URL.

{% endraw %}

## Reading the page: JSON-LD first, selectors as fallback

{% raw %}

The workhorse is `{{schema:…}}`, which reads the page's schema.org JSON-LD — and *only* JSON-LD. A source that publishes its metadata as RDFa or microdata leaves every `{{schema:}}` field empty, with no error. Standard Ebooks is exactly that case (RDFa, no `<script type="application/ld+json">`), so `standard-ebooks-clipper.json` is built on CSS selectors and meta tags instead:

```json
{ "name": "title",      "value": "{{selector:article.ebook h1}}", "type": "text" },
{ "name": "translator", "value": "{{selector:[property=\"schema:translator\"] meta[property=\"schema:name\"]?content}}", "type": "multitext" },
{ "name": "cover",      "value": "{{meta:property:og:image}}", "type": "text" },
{ "name": "wordCount",  "value": "{{meta:property:schema:wordCount}}", "type": "number" }
```

So the first step of authoring any template is checking the rendered DOM of a real source page to see which format it actually serves. The source-agnostic templates skip structured data entirely: `bookmark-clipper.json` uses only page variables and Open Graph tags, and derives the site root from the page URL with filters — `{{url|split:"/"|slice:0,3|join:"/"}}` becomes `sourceUrl`.

{% endraw %}

## Per-source quirks

{% raw %}

Every site's structured data has a dialect, and the templates encode the workarounds:

- **Bandcamp hides the genre in `keywords`.** Its `MusicAlbum` JSON-LD has no usable top-level `genre`, so the template reads `{{schema:@MusicAlbum:keywords|wikilink}}` — a string array that mixes real genres with location tags like city names. Those get pruned by hand in Obsidian (every clip arrives as `draft: true`, so there is a review step anyway).
- **Apple Music wraps the artist in an array and pads the genre.** Where Bandcamp's `byArtist` is a bare object (`byArtist.name`), Apple's is an array of `MusicGroup`, so `apple-music-clipper.json` reads `{{schema:@MusicAlbum:byArtist[0].name|wikilink}}`. Its `genre` array is real but injects a generic `"Music"` entry alongside the actual genres — another hand-prune. And because the page's meta description is SEO boilerplate ("Listen to X by Y on Apple Music…"), the template deliberately leaves `description` empty.
- **IMDb is one template for film, series, and episode.** Every IMDb title page serves exactly one JSON-LD entity whose `@type` is `Movie`, `TVSeries`, or `TVEpisode`, so `imdb-clipper.json` uses *unscoped* lookups (`{{schema:name}}`, no `@Type` prefix) that resolve against whichever type the page is. Cast comes from `{{schema:actor[*].name|slice:0,5|wikilink}}` — IMDb's key is `actor`, not Letterboxd's `actors`. The plot field uses `{{schema:description}}` rather than the page variable `{{description}}`, because the JSON-LD description is the synopsis alone while the meta description carries a "Directed by… With…" prefix. One verified limitation: a `TVEpisode`'s JSON-LD does not link back to its series — no `partOfSeries`, no season, no episode number.

{% endraw %}

## Two copies, and where the field types actually live

Each template exists twice: the git-tracked repo export is the source of truth, and the live copy inside the extension is what actually runs at clip time. Editing one does not update the other, so the discipline is re-export after any extension edit and re-import after any repo edit — a drifted export shows up in `git diff`.

One thing re-importing cannot fix: a property's *type*. The JSON's `type` field only seeds a name the extension has never seen; once a name is registered in the Clipper's own Properties registry (and again in the vault's `src/.obsidian/types.json`), the template value is ignored for it. A field stuck as a list has to be changed in those two places, not in the JSON.

This is the plain mechanics behind the earlier note on what the metadata hunt felt like: [[Every site hides its metadata differently]].
