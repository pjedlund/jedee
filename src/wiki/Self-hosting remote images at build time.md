---
description: "Why hotlinking a third-party image costs privacy, reliability and control, and how jedee fetches and self-hosts every remote cover at build time."
date: 2026-07-31
---

Pointing an `<img>` at a file on someone else's server — hotlinking — is the path of least resistance whenever the content came from elsewhere: an album cover, a book jacket, a film poster, a video thumbnail. It costs nothing to write and has four distinct problems.

- **Privacy.** Every visitor's browser requests that file directly from the third party, handing over an IP address, a `Referer` header, and often cookies. Readers get tracked by a host they never chose to visit.
- **Reliability.** The image vanishes when the other site reorganizes, and the page degrades silently — nothing warns you, because nothing on your side changed.
- **Performance.** An extra DNS lookup and TLS handshake per host, for a file sized to someone else's layout in whatever format they picked.
- **Presentation.** No control over dimensions or format means no responsive `srcset` and no modern format.

On a static site the fix is to move the fetch from the visitor's browser into the build: download the remote file once while building, run it through the same pipeline as local images — resized widths, AVIF and WebP alternatives — and emit an ordinary local `<img>` or `<picture>`. The visitor's browser then requests nothing from the third party, and a disappeared remote image becomes a build-time problem rather than a broken page in front of a reader.

Two consequences worth planning for. The fetch now happens on every build, which makes a persistent build cache close to mandatory — see [[Three things called cache]]. And the build acquires a dependency on hosts it does not control, so it needs to survive one of them being down.

## In jedee

The site shows plenty of images that live on someone else's server — album covers from Apple Music and Bandcamp, book covers, film posters, YouTube thumbnails. **None of them are requested by the visitor's browser.** Eleventy Image fetches, optimizes, and self-hosts each one during the build.

### Two routes, and only one accepts a remote URL

| Route | Remote URL? |
|---|---|
| **HTML Transform** — a plain `<img src="https://…">` in markdown or a layout | ✅ fetched, optimized, self-hosted |
| **`{% image %}` / `{% imageKeys %}` shortcodes** | ❌ **breaks the build** — they prepend `./src`, so a remote URL becomes `./srchttps://…` |

This is the single most important thing to know here, because the shortcodes and the transform otherwise produce near-identical markup. Anything with a remote source — every `cover:` field on reading/watching/jam posts — goes through a plain `<img>`.

Two attributes make that safe in a template:

- **`| safe` on the URL in Nunjucks.** Without it, `&` becomes `&amp;` and a multi-parameter URL 404s — which is a *fatal* build error, not a missing image.
- **`eleventy:optional`** so a dead remote URL degrades to a placeholder instead of failing the build.

### The transform's own attributes, and why `widths` is one worth knowing

The `eleventy:` prefix is the transform's per-image escape hatch generally, not just an error-handling one. `eleventy:widths`, `eleventy:formats` and `eleventy:ignore` each override the plugin's global options for a single `<img>` — which matters because the global options are set once in `eleventy.config.js` and are easy to forget:

```js
eleventyConfig.addPlugin(plugins.eleventyImageTransformPlugin, {
  formats: ['webp', 'jpeg'],
  widths: ['auto'],
  // …
});
```

**`widths: ['auto']` means the original width, whatever that happens to be.** Every plain `<img>` the transform touches therefore emits the source file at full size, so an image the page shows small still ships at the size it was scanned or shot at. The shortcodes don't have this problem — a `{% imageKeys %}` call states its own `widths` — so it only surfaces on the transform route.

The activities feed is the worked example. An activity's race map is a photographed scan up to 4032 px and ~2 MB, and the feed only needs enough to show the shape of a course:

```jinja2
<img eleventy:widths="1200" src="{{ post.data.cover }}" alt="…">
```

Capping there changed the feed's 22 covers from ~2 MB each to a 9.3 MB total, and changed the page not at all — the page renders the same file through `{% imageKeys %}` in `activity.njk`, which asks for `[224, 448, 900, null]` so [[The PhotoSwipe lightbox]] still gets the full scan. **Two routes over one source file can want different sizes**, and each states its own. eleventy-img never upscales, so a cap is a ceiling and not a resize — smaller maps stay at their own width.

### Bundling was considered and declined — twice

The settled strategy is: **remote URL in `cover:`, plain `<img>`, build self-hosts.** Do not resurrect a `normalize-posts.js` / `colocate-cover.js` / `coverSource:` apparatus to copy covers into the repo — it was never built, and the build already does the job.

The second refusal (25 May 2026) has a reason worth keeping: **the Obsidian Web Clipper cannot download a `cover:` image.** It writes front matter and body text, and the local-images plugin pulls down *body* images only, never a front-matter cover. So "always bundled" would mean reviving the dropped script or adding a manual step to every clip — to buy something the build already delivers. The authoring tool set the shape of the convention, the same way it did for [[Per-type feeds]]; see [[Web Clipper templates]] for the tool itself and [[The authoring tool decides the data model]] for the pattern.

**The escape hatch, when a cover must be permanent.** `dist/` is gitignored, so covers are refetched every build and the *repo* is not an archive of them — only the deployed site is. For any single post worth keeping forever, download the cover into `src/assets/images/reading/` and point `cover:` at that local path. It renders through the identical plain-`<img>` (the transform handles local paths too), gets committed, and adds no machinery. `The Kingdom of God is Within You.md` is the one post using it today.

### Two details that bite later

- **The cover's microformats class is type-specific, and usually absent.** On reading, watching and jam the cover is decorative — the mf2 target lives in a separate hidden `<data class="u-read-of">` and friends. On photo and recipe the image *is* the subject, so it carries `u-photo`. Copying a cover block between types and bringing the class along is a data error, not a cosmetic one — see [[Microformats]].
- **A placeholder is invisible on a detail page.** `eleventy:optional` produces an image with no intrinsic width or height, so a dead cover leaves no box at all. Cards escape this because `custom-card[data-poster] img` sets an `aspect-ratio`; the detail page would need a `min-block-size` to reserve space.

⚠ No explicit cache duration is set on the image transform, so eleventy-fetch's default applies. Setting one would buy resilience against re-fetching and link-rot; it's a deferred nicety, not a gap.

### When it can't be a plain `<img>`: use a filter

Sometimes the URL has to be computed rather than written. YouTube posters are the worked example — the id is in frontmatter and the thumbnail URL is derived from it. The natural home would be inside the WebC component, but **WebC's `webc:setup` cannot run `async` code or `import()`**: its evaluator wraps setup in an async function, so a top-level `import` is a syntax error, and an `async` function or one containing `import()` comes back "not a function". You also can't `await` inside a WebC attribute expression.

So the async work moves into a Nunjucks filter, and the finished URL is passed in as an attribute:

```js
export const youtubePoster = async slug => {
  const remote = `https://i.ytimg.com/vi/${slug}/hqdefault.jpg`;
  try {
    const metadata = await Image(remote, {widths: [480], formats: ['jpeg'], /* … */});
    return metadata.jpeg.at(-1).url;
  } catch {
    return remote;
  }
};
```

```jinja2
<custom-youtube @slug="{{ youtubeSlug }}" @poster="{{ youtubeSlug | youtubePoster }}" @label="{{ title }}"></custom-youtube>
```

**Pattern to reuse: do build-time async work in a filter and hand the result to the component as an attribute.** Because markdown here runs through Nunjucks, the same filter works in a raw markdown embed too.

### Two habits worth keeping

- **Always `try`/`catch` a build-time fetch and degrade to the remote URL.** One flaky third-party host shouldn't be able to fail a deploy.
- **Pick the size variant that always exists**, not the best one. YouTube's `maxresdefault` is crisper but 404s on older videos; `hqdefault` exists for every video and gets covered into the frame. A missing image on some posts is worse than a slightly softer one everywhere.

⚠ `netlify-plugin-cache` keeps eleventy-fetch's `.cache` warm between deploys. Removing it makes every deploy re-fetch every remote image.

See also [[The YouTube embed]] and [[Hosting large originals off-repo]] — the opposite case, where a file deliberately stays *out* of the build.

Raw sources: `src/_raw/dev-notes/How the YouTube embed loads.md`, `src/_raw/dev-notes/How the photo originals are hosted.md`
