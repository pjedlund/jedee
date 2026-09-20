---
description: "The wiki documenting web techniques and how jedee is designed and built."
date: 2026-07-31
---

The wiki documenting web techniques and how jedee is designed and built. Maintained by Claude Code; conventions live in the "LLM wiki" section of AGENTS.md at the repo root. Pages are named after their concept where one exists ("Microformats", "Text wrapping"): general explanation first, then an "In jedee" section. Purely project-internal pages keep descriptive titles and live under "The jedee site itself".

Each entry below says what a page covers and why you would open it. The traps and the measurements live on the pages themselves.

## Web standards & markup

- [[Accessibility]] — WCAG's principles and levels, what automated testing can and cannot catch, and a map of the accessibility work spread across this wiki. Start here.
- [[Microformats]] — the class vocabulary that makes HTML machine-readable, and why those classes must never be treated as styling hooks.
- [[One JSON-LD envelope for sixteen types]] — one include that emits structured data for every post type, driven by front matter.
- [[Per-type feeds]] — giving each kind of post its own Atom and JSON feed, and deciding which kinds do not need one.
- [[Abbreviations]] — the `abbr` element, what a `title` attribute can and cannot be relied on for, and one glossary that serves every wiki page.
- [[The lang attribute]] — marking a page's language and its foreign-language passages, including titles detected at build time.
- [[Web components]] — custom elements built in layers: working HTML and CSS first, JavaScript on top.

## CSS & design

- [[Text wrapping]] — `text-wrap: balance` and `pretty`, and the end of JavaScript widow-fixers.
- [[OpenType features]] — ligatures, small caps, figure styles and stylistic sets, and which of them this site's fonts actually carry.
- [[Typographic conventions]] — Bringhurst's and Butterick's rules for figures, capitals, captions, superscripts, ordinals and subtitles, and what each costs in accessibility.
- [[Line length]] — how many characters a line of text should hold, and why `60ch` is not 60 characters.
- [[The theme toggle]] — one SVG sun masked into a moon, and the inline script that prevents a flash of the wrong theme.
- [[Focus rings and paint containment]] — why an outline drawn outside its element disappears inside anything that clips.
- [[The main menu]] — a disclosure menu whose button is added by script, so the CSS has to detect its absence from the markup alone.
- [[Choreographing CSS animations]] — sequencing a multi-step animation without JavaScript: named step times, `clip-path` wipes, and a caret that tracks the wipe.
- [[Scroll-aware CSS during view transitions]] — a tested finding about what reaches the view-transition pseudo-elements. Not shipped.
- [[Undefined custom properties]] — what a `var()` pointing at nothing actually does, which is not nothing.
- [[Configuring a layout composition]] — setting a layout's published properties instead of redeclaring them, and how far that choice spreads.
- [[Layout breakouts]] — a named-column grid that lets an element step wider than the text column, and the two conditions it needs to work.
- [[Tables]] — markup that reads correctly unstyled, the browser defaults worth overriding, alignment, sticky headers, and what a table wider than the page needs. Ends with this site's activities table.
- [[Tooltips]] — the three kinds of tooltip, and when each one is honest.
- [[Design token sync]] — generating a design tool's tokens from the code that owns them, and what does not survive the trip.

## Images & media

- [[Alt text]] — informative versus decorative, and why `alt=""` is an answer rather than an omission.
- [[Self-hosting remote images at build time]] — pulling a remote cover into the build so no visitor request leaves the site.
- [[Hosting large originals off-repo]] — the deliberate inverse: 157 MB of scans kept in a bucket the build never touches.
- [[The PhotoSwipe lightbox]] — a lightbox loaded only once it is needed, degrading to a plain link without JavaScript.
- [[The YouTube embed]] — a stand-in with a self-hosted thumbnail, so loading a page sends nothing to Google.
- [[The place map]] — a map component on this site's own tiles, with three modes chosen by the markup: single pin, place groups, and a recorded route.

## Publishing & the IndieWeb

- [[Webmentions]] — receiving replies and likes on a static site: a hosted endpoint, a build-time fetch, and backfeed from social platforms.
- [[Web Clipper templates]] — clipping a source page straight into a post with its front matter already filled in.
- [[The authoring tool decides the data model]] — flat front matter where a spec wanted nesting is usually the tool's limit, not unfinished work. Find out what writes a field before designing it.
- [[The IndieWeb]] — the movement, its principles, its seven building blocks, and the criticism from inside it about how hard it is to join.
- [[Micropub]] — the publishing API that gives a static site an editor without giving up the static build.
- [[Sveltia CMS]] — a git-based editor at `/admin/` for changing posts from a phone, and what it does to a file when it saves one.

## The open web

- [[Personal websites]] — the case for publishing at an address you control, its vocabulary, and the two separate arguments it usually runs together.

## Build & delivery

- [[Three things called cache]] — the build cache, the browser cache and the service-worker cache, and why this site busts cache by inlining rather than by hashed filenames.
- [[The service worker's three strategies]] — network-first pages, cache-first assets, and a cache that clears itself on every deploy, in about 25 lines.
- [[Prefetching]] — fetching the next page before the click with speculation rules, and the script libraries that predate them.
- [[Progressive web apps]] — what makes a site installable, and how little changes when someone installs it.
- [[The accessibility test]] — the generated pa11y config and the test-only build, and what a green run does and does not cover.
- [[Link checking]] — why scanning source for links finds things that were never links, and what an all-false-positive report costs.
- [[Watch loops]] — a build that watches a folder it also writes into, and the other ways a rebuild retriggers itself.
- [[The dev server's memory]] — telling a JavaScript heap leak from native memory and from a one-off spike.
- [[Syntax highlighting]] — coloring code blocks at build time, the palette behind it, and why inline code is treated differently.
- [[Favicons]] — the six-file set, and the rule the differences follow from: whether the destination frames the icon for you.
- [[Timestamps without a time zone]] — a datetime with no offset resolves silently and wrongly. How to settle one against a spec-defined field or a physical artefact.
- [[Tailwind]] — Tailwind used as a compiler that turns design tokens into custom properties, not as a utility framework.
- [[Open Graph images]] — four sources of a sharing card, most specific first, and how the composited ones are drawn and kept current.
- [[Layout shift]] — what CLS measures, why the element that moves is rarely the one at fault, and how to measure it without fooling yourself.
- [[Font subsetting]] — shipping only the characters a site needs, and how to find the ones you have missed.
- [[is-land]] — holding JavaScript back until a condition is met, around markup that already works without it.
- [[WebC]] — Eleventy's single-file component format, which expands a tag into HTML at build time and then gets out of the way.
- [[Themes and starters]] — why an Eleventy project is a site rather than a theme, and what that means when a new release of the starter lands.

## The jedee site itself

- [[What jedee kept from Eleventy Excellent]] — the stock-versus-fork inventory: what is untouched, what was extended, what was deleted, and what was left behind with nothing referencing it.
- [[Anatomy of a post type]] — the nine places a new post type has to be wired. Start here for the post-type system.
- [[Permalinks and Obsidian-friendly filenames]] — Title Case filenames for wikilinks, kebab-case addresses for the web.
- [[The title-less post types]] — the note and the five response types: no title by construction, and one shared card between them.
- [[Wikilinks]] — `[[bracket]]` links, how backlinks are computed rather than collected, and what a dead link renders as.
- [[The interlinker's second render pass]] — the plugin re-renders every page mid-build. Read this before wrapping any include in a condition.
- [[The activities archive]] — 180 workout posts built backward from a Strava export, and how the archive is topped up since.
- [[Rebuilding an archive from the Wayback Machine]] — reconstructing a dead service from its dump plus archived crawls, and presenting recovered reactions honestly.
- [[Site search]] — a JSON index written at build time, fetched once and filtered in the browser, with no search library.

## Recent additions

Every ingest, enrich and lint session is recorded in [[_log|the wiki log]], newest first.
