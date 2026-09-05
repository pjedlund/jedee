---
description: "Title-addressed double-bracket links, why resolving them is a build-time job, and how jedee computes backlinks as page data rather than a collection."
date: 2026-07-31
---

A wikilink is a link written as `[[Page Title]]` — naming its target by title rather than by path or URL. The form comes from [WikiWikiWeb](https://wiki.c2.com/), the original wiki, and survives in note-taking tools like Obsidian, Logseq and Roam, where it is the main way notes connect to each other.

The appeal is that it costs almost nothing to write, so links actually get written. The cost is that a wikilink is not a link yet: `[[Anna Karenina]]` names a page, and something has to resolve that name into a real URL. In a note-taking app, the app does it. On a published site a build step has to, which means the build needs a directory of every page's title and URL before it can render any link at all.

Two things follow from that resolution step, on any system that does it:

- **Backlinks come for free.** Once every link has been resolved, you also know every page pointing *at* a given page. Backlinks are a derived index, not a thing anyone maintains.
- **A dead wikilink has to degrade somehow.** A name may match nothing — a typo, a renamed file. The options are to fail the build, render a visibly broken link, or render plain text. Personal sites usually choose plain text, because a wikilink is often written before its target exists.

The convention holding it together is **filename = title**: if a file is named for its title, the identical bracketed string resolves in the editor and in the build with nothing translating between them. That pins filenames to human-readable text, which then has to be reconciled with what a URL ought to look like — see [[Permalinks and Obsidian-friendly filenames]].

## In jedee

Posts link to each other with Obsidian-style `[[double brackets]]` written directly in the body. Because the vault convention is filename = title, the same string is a working link in Obsidian and on the built site. The clean URL comes later, from the permalink setup slugifying the file slug.

**Not Eleventy Excellent.** Vanilla EE ships no wikilinks; `@photogabble/eleventy-plugin-interlinker` and `partials/backlinks.njk` are jedee's own addition, which is why they're freer to modify than EE's core templates.

### Backlinks are computed data, not a collection

The plugin registers a global `eleventyComputed.outboundLinks`. While Eleventy computes each page's data, the plugin reads that page's raw content, finds every wikilink, looks it up in the page directory, and pushes the *current* page onto the *target* page's `backlinks` array:

```js
if (link.exists) {
  if (!link.page.data.backlinks) link.page.data.backlinks = [];
  link.page.data.backlinks.push({url: currentPage.url, title: currentPage.data.title});
}
```

So `backlinks` is a data value that appears on a page when others link to it — `{url, title}` pairs, deduplicated by URL. You never query a collection for it. `partials/backlinks.njk` renders it, wholly inside an `{% if backlinks.length > 0 %}`, so a page with none renders nothing at all. All 16 post-type layouts include it.

The mechanism fills in retroactively and instantly: the first time a long-linked-to page is finally written, every page that ever pointed at it lands in its `backlinks` on the next build, and its list appears fully populated on day one.

### Dead wikilinks render as plain text

⚠ **This changed on 2026-07-31 and the raw source note predates it.** The plugin's own default returns the raw `[[bracketed]]` string for an unresolvable link — and before reaching that default it substitutes `opts.stubUrl` (default `/stubs/`), so a dead link actually rendered as a live anchor to a page that doesn't exist. Both behaviors are wrong for this site, because published posts must never link into the private wiki (see the one-way rule in the LLM wiki section of `AGENTS.md`).

The fix is two coupled settings in `eleventy.config.js`:

```js
eleventyConfig.addPlugin(plugins.interlinker, {
  stubUrl: false,                                          // else href is "/stubs/", never false
  resolvingFns: new Map([['default', resolveOrPlainText]])
});
```

`stubUrl: false` is load-bearing — without it `src/_config/plugins/interlinker-resolver.js` is never reached with `href === false` and the plain-text branch is dead code. The resolver escapes the text and returns it bare; it also checks the href *before* appending an anchor, so `[[Dead Page#section]]` can't produce `href="false#section"`. Covered by `_local/tests/wikilink-dead-link.test.js`.

The plugin's console dead-link report stays on and is the build-time warning that someone added a link they shouldn't have.

⚠ **That was only true from 2026-08-03.** Until then the report carried 13 warnings and all 13 were false positives — code examples and an un-rendered template href, matched because the plugin scans raw source. A report with no true positives catches nothing, and this one was concealing a real one-way-rule breach: this page's own `[[Anna Karenina]]` example was registering as a live link, giving a published post backlinks into the wiki. See [[Link checking]] for the mechanism and the fix.

### Scale, and what the count actually means

⚠ **Counting bracket pairs in the tree overstates this, and earlier figures here did.** The plugin reads a page's **body only** — front matter is never scanned. The Jam front-matter wikilinks (artist, genre) that dominate any file-level count have therefore never been detected, never produced a backlink, and never appeared in the dead-link report. A grep answers a different question than "what does the plugin see".

Recounted 2026-08-03 across the markdown in `src/`: **483 bracket pairs, 219 distinct titles**, of which 16 pairs (11 titles) sit inside code and are now excluded from detection ([[Link checking]]). Neither figure is the number of *live* links, for the front-matter reason above. The number that actually matters is the dead-link report, which is **0** — so the plain-text fallback above is a net with nothing currently falling into it.

See also [[The interlinker's second render pass]] — the same plugin's more dangerous side effect.

Raw sources: `src/_raw/dev-notes/How backlinks work.md`, `src/_raw/dev-notes/How the dead-link report was made usable.md`
