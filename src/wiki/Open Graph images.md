---
description: "Generating per-post social preview images at build time by rendering an SVG template and converting it to JPEG — and why the output is committed to the repo rather than rebuilt on the server."
date: 2026-09-05
---

When a link is shared, the receiving platform reads the page's `<head>` for [Open Graph](https://ogp.me/) tags and draws a card from them. `og:image` is the picture on that card. It is fetched by a crawler that runs no JavaScript and does not wait, so the image has to be a real file at a real URL by the time the page is published — which makes it a build-time problem, not a page-time one.

The two common ways to produce one are a rendering service (a serverless function that draws the image on demand, usually with a headless browser) and build-time generation (draw every image while the site builds, ship them as static files). The second is cheaper to run and has no cold start, at the cost of doing the work up front and needing a rebuild whenever a title changes.

Eleventy Excellent takes a third, lighter path within the build-time approach: **the image is an SVG template rendered by the site's own template engine, then converted to JPEG.** No headless browser, no canvas library — the "renderer" is Nunjucks writing text nodes into a 1200×630 `<svg>`, and the only real dependency is an image library that can rasterize it.

The catch that shapes the whole design is fonts. An SVG that says `font-family="Source Serif 4"` needs that font installed on the machine doing the rasterizing. A build server does not have it. Rather than ship font files and a text-layout stack, EE generates the images on the author's machine and **commits the JPEGs to the repository**, so the build server only copies files it was handed.

## The pipeline

Three pieces, plus a reset script.

**`src/common/og-images.njk`** paginates one post per page and writes an SVG:

```yaml
pagination:
  data: collections.article
  size: 1
  alias: post
permalink: '/assets/og-images/{{ post.data.title | slugify }}-preview.svg'
```

The template does its own line breaking — a `splitlines(22)` filter chops the title into 22-character lines, and a chain of `{% if %}`s picks a vertical starting point from the resulting line count, so a one-line title starts at y=340 and a five-line title at y=170. That is text layout by lookup table, which is what you get without a text engine, and it is why the character count is the tuning knob.

**`src/_config/events/svg-to-jpeg.js`** runs as an Eleventy event after the build, reads the SVGs out of `dist/assets/og-images/`, and converts each one with `@11ty/eleventy-img`:

```js
if (filename.endsWith('.svg') & !existsSync(path.join(ogImagesDir, outputFilename))) {
```

The `!existsSync` guard is the whole caching strategy: an image that already exists is never regenerated. Note the direction — it reads from `dist/` and writes into **`src/assets/og-images/`**, so build output is written back into the source tree, where it gets committed.

**`src/_includes/head/meta-info.njk`** references it, with a fallback:

```njk
content="{%- if layout == 'post' -%}
  {{- meta.url -}}/assets/og-images/{{ title | slugify }}-preview.jpeg
{%- else -%}
  {{- meta.url -}}{{- meta.opengraph_default -}}
{%- endif -%}"
```

`npm run clean:og` deletes `src/assets/og-images/` so the next build regenerates everything. It is the only way to refresh an image, because of that `existsSync` guard.

## In jedee

The pipeline is Eleventy Excellent stock, unmodified — template, event, fallback and script. What has diverged is the content around it, and that is where the findings are.

⚠ **Only articles get one.** Both the generator (`data: collections.article`) and the reference (`layout == 'post'`) are scoped to articles, and `articles` is the only post type whose data file sets `layout: post` — every other type has its own layout name (`note`, `photo`, `audio`, `activity`, `bookmark`, and so on). So every note, photo, jam, reading entry and response post shares one static fallback image, `meta.opengraph_default`. On vanilla EE, where articles and notes are nearly the whole site, that is a small gap; on a site with sixteen post types it means the generated-image feature covers a small minority of the pages people actually share. Widening it is not a template edit — it needs a second pagination source and a different condition in the head. See [[Anatomy of a post type]] for the other places a type has to be wired, and [[One JSON-LD envelope for sixteen types]] for the sibling problem solved the other way round.

⚠ **Nothing ever deletes an image.** The `existsSync` guard only ever adds, so a retitled or deleted article leaves its JPEG behind — committed, shipped in the build, referenced by nothing. When this page was written the folder held 17 JPEGs against 13 article files, seven of them belonging to Eleventy Excellent demo articles long since deleted. A `npm run clean:og` has run since: as of 2026-09-06 it holds **6 JPEGs against 5 article files**, with one orphan left (`what-is-web-accessibility-preview.jpeg`). The mechanism is unchanged — only the backlog was cleared, and it will accumulate again.

⚠ **The filename is derived from the title, so retitling strands the old image.** `{{ title | slugify }}` is the key on both sides. Change a published title and the next build writes a new JPEG under the new slug while the old one stays committed forever; the page itself is fine, because the head is computed from the same title. This is the same shape as the deleted-article orphans, and `clean:og` is the answer to both.

⚠ **The font dependency is silent.** The SVG names `Source Serif 4` and `Source Sans 3`, and the front matter says so in a comment. A machine without them rasterizes the title in whatever the fallback is, producing a valid JPEG that is simply wrong — and once written, the `existsSync` guard means it is never retried. Worth an eye on the output after any font change; the same "generated set that is committed rather than rebuilt" arrangement as [[Favicons]], with the same consequence that a bad generation persists until deliberately cleared.

One code observation, EE stock and not currently causing trouble: the conversion loop is `files.forEach(async function …)`, so the `await` inside it does not hold up the enclosing `svgToJpeg()`, which resolves before the images are written. It works because the Eleventy process outlives the event, but it is not a loop that can be relied on to have finished when it returns.

Raw source: `src/_raw/dev-notes/How the Open Graph images are generated.md`
