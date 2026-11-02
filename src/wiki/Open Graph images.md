---
description: "Generating per-post social preview images at build time by rendering an SVG template and converting it to JPEG — and why the output is committed to the repo rather than rebuilt on the server."
date: 2026-09-05
updated: 2026-10-27
---

When a link is shared, the receiving platform reads the page's `<head>` for [Open Graph](https://ogp.me/) tags and draws a card from them. `og:image` is the picture on that card. It is fetched by a crawler that runs no JavaScript and does not wait, so the image has to be a real file at a real URL by the time the page is published — which makes it a build-time problem, not a page-time one.

The two common ways to produce one are a rendering service (a serverless function that draws the image on demand, usually with a headless browser) and build-time generation (draw every image while the site builds, ship them as static files). The second is cheaper to run and has no cold start, at the cost of doing the work up front and needing a rebuild whenever a title changes.

Eleventy Excellent takes a third, lighter path within the build-time approach: **the image is an SVG template rendered by the site's template engine, then converted to JPEG.** No headless browser, no canvas library — the "renderer" is Nunjucks writing text nodes into a 1200×630 `<svg>`, and the only real dependency is an image library that can rasterize it.

The catch that shapes the whole design is fonts. An SVG that says `font-family="Source Serif 4"` needs that font installed on the machine doing the rasterizing. A build server does not have it. Rather than ship font files and a text-layout stack, EE generates the images on the author's machine and **commits the JPEGs to the repository**, so the build server only copies files it was handed.

## The pipeline

Three pieces, plus a reset script.

**`src/common/og-images.njk`** paginates one post per page and writes an SVG:

```yaml
pagination:
  data: collections.titleCards
  size: 1
  alias: post
permalink: '/assets/og-images/{{ post.data.title | slugify }}-preview.svg'
```

The template does its line breaking — a `splitlines(22)` filter chops the title into 22-character lines, and a chain of `{% if %}`s picks a vertical starting point from the resulting line count, so a one-line title starts at y=340 and a five-line title at y=170. That is text layout by lookup table, which is what you get without a text engine, and it is why the character count is the tuning knob.

**`src/_config/events/svg-to-jpeg.js`** runs as an Eleventy event after the build, reads the SVGs out of `dist/assets/og-images/`, and converts each one with `@11ty/eleventy-img`:

```js
if (filename.endsWith('.svg') & !existsSync(path.join(ogImagesDir, outputFilename))) {
```

The `!existsSync` guard is the whole caching strategy: an image that already exists is never regenerated. Note the direction — it reads from `dist/` and writes into **`src/assets/og-images/`**, so build output is written back into the source tree, where it gets committed.

**`src/_includes/head/meta-info.njk`** references it, with a fallback:

```njk
content="{%- if ogCard -%}
  {{- meta.url -}}{{- ogCard -}}
{%- elif ogImage -%}
  {{- meta.url -}}{{- ogImage.url -}}
{%- elif layout == 'post' or layout == 'note' -%}
  {{- meta.url -}}/assets/og-images/{{ title | slugify }}-preview.jpeg
{%- else -%}
  {{- meta.url -}}{{- meta.opengraph_default -}}
{%- endif -%}"
```

Eleventy Excellent's version has only the `layout == 'post'` branch and the default; the `ogCard` and `ogImage` branches and `layout == 'note'` are stomme's, covered below.

`npm run clean:og` deletes `src/assets/og-images/` so the next build regenerates everything. It is the only way to refresh an image, because of that `existsSync` guard.

**"The next build" means `npm start`, not `npm run build`.** The event is registered inside `if (process.env.ELEVENTY_RUN_MODE === 'serve')`, so a production build never converts anything — which is the point (the build server has no fonts) but is easy to miss when a `clean:og` is followed by a build that reports success and writes no images.

## In stomme

The event and the conversion script are Eleventy Excellent stock, unmodified. The template and the head are not: the template paginates `collections.titleCards` and carries the site's mark and accent color, and the head picks from four sources (both below). The **fallback image** is stomme's; that and the content around the pipeline are where the findings are.

### A site with no fallback picture

A site that deletes `opengraph-default.jpg` has no picture to offer on a page without one, so the `og:image` tags and both `twitter:` tags stay off that page (`meta.hasDefaultShareImage`), rather than naming a file that isn't there. A page with a composited card, artwork of the post or a title card keeps them.

### The fallback is not Eleventy Excellent's promo card

Eleventy Excellent's `meta.opengraph_default` points at the starter's shipped `opengraph-default.jpg` — a yellow 11ty card reading "ELEVENTY-EXCELLENT / Opinionated Eleventy 3.0 starter with CUBE CSS…". Given the scoping below, that would be the image on every note, photo, jam, reading entry and response post a site shares: the great majority of its shareable pages would advertise the starter rather than the site. It is the same class of leftover as the orphaned JPEGs, but louder, and nothing in the build could flag it — a valid image at a valid URL is all the pipeline checks.

The replacement is generated by `src/_config/setup/generate-og-default.js` (`npm run og:default`), a sibling of `generate-favicons.js`: name in the theme's display font at the per-post card's 80px/700/−1 treatment, the tagline in its body font, the accent-colored logomark as both a ground and the bottom-right signature beside the domain. The palette is the per-post template's, so a shared page and a shared article read as one set.

<figure class="popout">
  <img eleventy:formats="webp,jpeg" src="/assets/images/template/opengraph-default.jpg" alt="A 1200 by 630 share card: the site's name in large bold type at the left with its tagline beneath in a smaller size, a large pale watermark of the logomark filling the right third, and a small solid logomark at the bottom right beside the domain." width="1200" height="630">
  <figcaption>The card itself — this figure is the shipped file rather than a picture of it, so it cannot go stale.</figcaption>
</figure>

Three things the generator does differently from the per-post template, all of them consequences of the traps below.

**Chrome rasterizes it, not an SVG library**, so the fonts are the theme's woff2 files and no installation is assumed. That inverts the dependency described further down rather than living with it.

**A theme can name font files in its `og` block; those are inlined as `data:` URIs and checked.** A font with no file is a system font. `@font-face` pointed at `file://` paths would leave the card silently set in Georgia and Arial — a `setContent` document has no file origin, so the requests fail and `FontFace.status` comes back `'error'`. The card looks plausible enough that only a check catches it.

**So the generator asserts every named face loaded and throws if not.** This is the one place the silent-fallback failure can be made loud.

The per-post template is aligned to match: Eleventy Excellent's star is replaced by the site's mark at the same size, position and 10%, and the signature logomark takes the accent color — the same value as the breadcrumb logomark. The 80px title over the watermark keeps almost the contrast it has on bare paper, so the overlap on a long title costs nothing.

**An XML comment may not contain a double hyphen**, so a CSS custom property name cannot be written inside one. `<!-- … --color-base-dark … -->` in the SVG template made every card fail to rasterize with `Input file has corrupt header: XML parse error … Comment must not contain '--'`. The template is Nunjucks but the output is XML, and the comment syntax belongs to the output.

**Not `meta.domain`.** That is derived from `meta.url`, which is `http://localhost:8080` unless the environment sets `URL` — so the first card was stamped **localhost**. `author.website` is the canonical address and is what the signature reads. Anything generated on a laptop that wants the live domain has to reach past `meta.url` for it.

**Articles and notes get a generated one.** A `titleCards` collection in `eleventy.config.js` joins the article and note collections, the generator paginates over it, and the head's condition reads `layout == 'post' or layout == 'note'`. The collection and that condition name the same types, so a third type has to be added in both places. Of the sixteen post types, the rest fall back to artwork or to the default card. See [[Anatomy of a post type]] for the other places a type has to be wired, and [[One JSON-LD envelope for sixteen types]] for the sibling problem solved the other way round.

### Artwork beats a generated card, where a type has artwork

Photo, jam, watching and reading go further: a shared photo previews as the photograph, and a shared record, film or book as a card built around its cover. The head picks from four sources, most specific first — the composited card, then the post's artwork, then Eleventy Excellent's generated title card, then the site default.

For **photo** the artwork is the whole card, and nothing is generated at all. That is the cheap end of this and worth preferring wherever it works: no committed JPEG, nothing to strand on a retitle, no `existsSync` guard to clear, no font dependency. `src/_config/utils/og-image.js` takes either shape of source — a photo's local `./src/…` path or a remote cover URL — and returns `{url, width, height}` for a 1200px JPEG, or `null` when there is nothing usable, in which case the head falls through to the generated card and then to the default. It is **computed data, not a filter**: Nunjucks cannot await an async filter inside the `{% if %}` that picks the tag's value, and a `<meta>` needs a plain string. It is deliberately *not* shared with `coverZoom`, which computes the same artwork for the lightbox — that one returns `null` below 448px, a rule about whether zooming is worth it that has nothing to say about a social card.

For **jam, watching and reading** the bare cover was correct but small — a square album cover or a portrait poster is a stamp in a feed built for a wide card. `src/_config/setup/generate-og-cards.js` (`npm run og:cards [type] [slug…]`) draws the composited version instead — art on the left, an accent-colored eyebrow naming the kind, title and credit on the right, the signature mark bottom-right. **This one does commit a file per post**, generated on the laptop and carrying every cost in the list. That was a deliberate trade for how much better a wide card reads, made after looking at both side by side, not a default.

The three share one generator rather than three copies, because only two things differ: the eyebrow, and which field becomes the line under the title (artist / director and year / author). A `TYPES` table holds both.

**The art is sized by HEIGHT, not width.** An album cover is square but a film poster and a book cover are portrait, so the fixed 438×438 box the first version used letterboxed both. `height: 438px; width: auto` puts a square at 438×438 and a 2:3 poster at 292×438, and every type sits in the same band with the text column simply gaining room on the portrait ones.

**The output folder keys off the post's `category`, not its posts folder** — `og-images/jam/`, not `jams/`. The two differ for exactly this type (`category: jam`, `src/posts/jams/`), which is the same asymmetry the URL has.

**`og:image:width` and `og:image:height` must follow the actual file**, not a hardcoded 1200×630. A fixed size is wrong for anything non-landscape, and for a platform reading no `twitter:card` the declared ratio is the only thing saying whether to draw a wide card or a small square one.

### The one Twitter tag that had to come back

Eleventy Excellent removed the Twitter-specific tags in v2, and mostly that is right: X reads the `og:` tags for title, description and image, so duplicating them buys nothing. But it does **not** read them for two things, and a social-preview debugger flags the first as a missing required tag.

**`twitter:card` picks the layout.** Without it X draws the small square summary card — the exact outcome the 1200×630 cards exist to avoid, so the whole composited-card effort was invisible on that one platform. It is emitted as `summary_large_image`, dropping to `summary` only for a post with artwork but no composited card whose artwork is square or portrait.

**The threshold for that is 1.2, and the first guess of 1.6 was wrong.** X crops a large card to 2:1, so the question is not "is this image wide" but "would that crop cut the subject away". At 1.6 a 4:3 landscape photo fell to the small card — a photograph, on a post where the photograph *is* the content, shown as a thumbnail beside text. A 4:3 frame cropped to 2:1 still reads; a square album cover cropped to 2:1 loses its top and bottom. 1.2 puts the photograph on the large card and the bare cover on the small one. Worth catching by counting the rendered output rather than reasoning about it — a page on the wrong card is not reported by anything.

**`twitter:image:alt` is the other.** X does not read `og:image:alt`, so without it a screen-reader user on X gets nothing. The alt is hoisted into an `ogImageAlt` variable — the same idiom the file already uses for `metaDescription` — rather than repeating its four branches in two tags.

**An Apple Music cover URL ending `1200x630bb` is not a 1200×630 image.** That segment is a bounding box, and the art is square, so what comes back is 630×630 — which is exactly the case the hardcoded dimensions were lying about. Read the file, don't read the URL.

**The composited cards are generated but `clean:og` does not regenerate them.** `npm run clean:og` rimrafs all of `src/assets/og-images/`, which now includes `jam/`, `watching/` and `reading/` — and the `npm start` that follows only rebuilds the *article* SVG cards. After a `clean:og`, run `npm run og:cards` too or every composited card silently drops back to its bare cover.

⚠ **A composited card goes stale in silence.** Nothing re-runs the generator, so changing a cover URL or a title leaves the old card in place — and a *retitled* post is worse, because the slug moves and `ogCard` stops finding the file, dropping it to the bare cover with no error. Re-run `npm run og:cards` after either.

**The generator uses the site's `slugifyString`, not a copy of it.** The filename is the key on both sides — the head builds the same slug the permalink does — and a hand-rolled mirror drifts the moment a title contains a colon or an ampersand, which many song titles do. This is the same class of coupling as the article cards' `{{ title | slugify }}`, just with the failure made visible: a mismatch here falls back rather than 404s.

**The cover is inlined as a `data:` URI, like the fonts.** A `setContent` document has no origin, so a `file://` or remote `src` fails silently and ships a card with a blank square where the art should be. The run asserts both faces *and* the artwork actually loaded before it shoots, and skips a jam whose cover is unreachable rather than aborting the rest.

**Chrome doing the rendering buys real line-breaking.** The title is clamped to three lines by CSS, so a long jam title wraps and fits, where the SVG template would have needed another entry in its `splitlines(22)` lookup table.

**eleventy-img's reported height floors where sharp rounds**, so a source with a non-integer ratio declares one pixel short of the file it serves — a wide panorama reports 1200×428 for a 1200×429 JPEG. Harmless on a preview card, but the same numbers would be wrong for layout, and the metadata is the only thing available at computed-data time because a deferred image is not on disk yet to measure.

**`og:description` was the other half of the fix.** It fell through to the site-wide description — true, and useless beside a picture of a record. `autoDescription` (in `src/_config/utils/og-card.js`) composes the line the card itself cannot show, per type, from fields the posts already carry, and sits *below* an authored `description:` in the head's chain so it never overrides one:

- **jam** — artist, year, genres. `Sample Song` becomes "Sample Artist (2001) · rock, instrumental". Fires whenever a jam has no authored description. The album is dropped when it merely repeats the title.
- **watching** — the `plot` field, which beats anything composable.
- **reading** — "A book by Example Author". The author's name by itself reads as a caption rather than a sentence, which is why the prefix is there.

Worth knowing before adding a fourth: the fallback fires only where posts lack an authored description. Any type can opt in by computing an `autoDescription`.

**Coverage**: a jam, film, book or photo with a cover carries its card, and `/jams/genres/` takes the default. Notes get the generated title card (see above), and video and recipe use their artwork through the same `ogImage` helper: a recipe's dish photo, a self-hosted video's poster, and a YouTube video's thumbnail. The YouTube poster the player shows is `hqdefault`, which is 4:3 with black bars above and below a 16:9 video, so the share card tries `maxresdefault` first and falls back to `hqdefault` when a video has none. A PeerTube video has no poster to use and keeps the default card. The alt text for a video still reads "Still from" and the title, through an `ogAlt` key in its data file. Activities and the five response types are deliberately left on the default — nobody shares an activity, and for a response the platform's preview of the *target* page is the more useful card.

**Nothing ever deletes an image.** The `existsSync` guard only ever adds, so a retitled or deleted article leaves its JPEG behind — committed, shipped in the build, referenced by nothing. A `clean:og` clears the backlog, and it will accumulate again.

**The filename is derived from the title, so retitling strands the old image.** `{{ title | slugify }}` is the key on both sides. Change a published title and the next build writes a new JPEG under the new slug while the old one stays committed forever; the page itself is fine, because the head is computed from the same title. This is the same shape as the deleted-article orphans, and `clean:og` is the answer to both.

**The font dependency is silent.** The SVG names the theme's display and body families (`og.display.family` and `og.body.family` in the theme's `theme.json`). A machine without them rasterizes the title in whatever the fallback is, producing a valid JPEG that is simply wrong — and once written, the `existsSync` guard means it is never retried. Worth an eye on the output after any font change; the same "generated set that is committed rather than rebuilt" arrangement as [[Favicons]], with the same consequence that a bad generation persists until deliberately cleared.

One code observation, EE stock and not currently causing trouble: the conversion loop is `files.forEach(async function …)`, so the `await` inside it does not hold up the enclosing `svgToJpeg()`, which resolves before the images are written. It works because the Eleventy process outlives the event, but it is not a loop that can be relied on to have finished when it returns.
