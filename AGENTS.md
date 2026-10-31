This site's own facts are in `SITE.md`, which isn't in the repo.

# AGENTS.md — Project context for jedee

Tool-agnostic. Readable by Cursor, Codex, Gemini, Claude Code, etc. Claude Code's own notes are in a local `CLAUDE.md` that isn't in the repo.

## Project goals

An [indieweb](https://indieweb.org/) website with clean semantic HTML, fast loading times, and four 100 scores in Lighthouse.

## Project Overview

A personal website built with [Eleventy (11ty) v3](https://www.11ty.dev) and the [Eleventy Excellent](https://github.com/madrilene/eleventy-excellent) starter theme, deployed on Netlify. `meta.noindexSite` puts `noindex` on the whole site while it is soft-launched.

## Tech Stack

- **Static site generator:** Eleventy 3.x (ESM; Node 24 via `.nvmrc`)
- **Templating:** Nunjucks (`.njk`), WebC (`.webc`), Markdown
- **CSS:** PostCSS + Tailwind CSS (used to generate CSS custom properties from design tokens — not a utility-class framework)
- **Bundling:** esbuild (JS), PostCSS CLI (CSS)
- **Deployment:** Netlify (build: `npm run build`, publish dir: `dist`)
- **Markdown extensions:** markdown-it with footnotes, wikilinks, attributes, abbr, anchors, emoji, syntax highlight
- **Wikilinks / backlinks:** `@photogabble/eleventy-plugin-interlinker` + `markdown-it-wikilinks-plus`

## Commands

```bash
npm start                  # Dev server (http://localhost:8080)
npm run build              # Production build → dist/
npm run clean              # Remove dist and compiled CSS/JS
npm run clean:og           # Remove pre-generated OG images
npm run colors             # Generate the active theme's colors.json from its colorsBase.json
npm run penpot:tokens      # Generate _local/penpot/penpot-tokens.dtcg.json for Penpot import
npm run figma:tokens       # Generate _local/figma/figma-tokens.dtcg.json for Figma (Tokens Studio)
npm run icons:bounds       # Measure each posts/ icon's outline into src/_data/iconBounds.json (run after adding or changing one)
npm run favicons           # Generate favicons
npm run fallback-font-style  # Generate fallback font CSS
npm run test:a11y          # Accessibility tests with pa11y-ci
npm run test:unit          # Unit tests (node --test, files in tests/)
npm run rebuild            # Rebuild dist/ with drafts and hidden things included (BUILD_DRAFTS=1 SHOW_HIDDEN=1), keeping the image folders
npm run compare            # Compare dist/ with the saved build in _local/baseline/ (add -- --shots to compare pictures too)
```

## Directory Structure

```
src/
  _config/         # Eleventy config modules (collections, filters, plugins, shortcodes, events, setup)
  _data/           # Global data (settings.yaml = identity, profiles, dials; meta.js = site metadata built from it; personal.js = EE's personal.* names filled from settings.yaml)
  _includes/       # Partials, CSS, JS, WebC components, head fragments, schemas, and themes/ (see Themes below)
  _layouts/        # Nunjucks layouts, one per post type + base/page/tags
  _obsidian/       # Obsidian vault tooling (local, except the tracked clipper/ templates)
  _raw/            # Raw import source texts (local only, not site content)
  assets/          # Images, SVGs, OG images
  common/          # Shared pages (pa11y test config, service worker, redirects, etc.)
  feeds/           # Atom / JSON feeds, per type
  pages/           # Static pages (about, per-type indexes, styleguide, etc.)
  posts/           # All content, one folder per post type:
    activities/    # Workouts / races        photos/
    articles/      # Long-form, by year      reading/
    audio/                                   recipes/
    bookmarks/                               replies/
    events/                                  reposts/
    jams/          # incl. thisismyjam/      rsvps/
    likes/                                   videos/
    notes/                                   watching/
  wiki/            # The LLM wiki (see below)
admin/             # Sveltia CMS (index.html, config.yml)
netlify/           # Netlify Functions (micropub, health-export)
tests/             # Unit tests (*.test.js) and the build comparison (compare-builds.mjs)
dist/              # Build output (local only)
_local/            # ALL local-only project material (see below)
```

**What's tracked:** `src/`, `admin/`, `netlify/`, `tests/`, the root config files, `readme.md`, `LICENSE`, and this `AGENTS.md`. That's the whole public repo — the site, its tests and the instructions for building it, nothing else. `AGENTS.md` is public, so keep anything personal out of it; that goes in the local `SITE.md`.

**The comparison:** `npm run compare` checks a build in `dist/` against a saved build in `_local/baseline/` (page addresses, markup, feeds and text files; with `-- --shots`, pictures of 20 sample pages too). `tests/compare-allowed.json` lists the differences that are meant, each with a reason; anything else fails. `_local/baseline/` is not in git, so a fresh clone has to build it first. `npm run rebuild` is the build to compare with: it clears `dist/` except the image folders and builds with drafts and hidden things on.

**What's local only:** everything under `_local/` — `design/` (plans, references), `project_docs/` (the HTML specs), `penpot/`, `generated/` (session handoffs, scratch scripts), `baseline/` and `compare/` (the saved build and the difference pictures from `npm run compare`), plus import scratch (`strava/`, `originals/`, `resources/`). One `.gitignore` rule, `/_local/`, covers all of it. A single leading underscore means local-only.

Also local only, but kept at the root as everyday surface files: `SITE.md` (this site's own facts), `TODO.md`, `LOG.md`, `IDEAS.md`, `ROADMAP.md`, and the AI tool files `CLAUDE.md`, `.mcp.json`, `.claude/`. Don't expect any of these in `git status`, and don't cite them from a tracked file.

A theme's `DESIGN.md` and `_local/penpot/penpot-tokens.dtcg.json` are derived artifacts regenerated by `npm run penpot:tokens`. The markdown body of `DESIGN.md` is hand-authored; only the YAML front matter is rewritten.

## Content Types & Frontmatter

There are **16** post types, one folder each under `src/posts/` (`activities`, `articles`, `audio`, `bookmarks`, `events`, `jams`, `likes`, `notes`, `photos`, `reading`, `recipes`, `replies`, `reposts`, `rsvps`, `videos`, `watching`). Don't add a 17th. The authoritative per-type front matter is the Phase 3 spec, `_local/design/Plan - Phase 3 (10 new post types) - final.md`.

Each folder has a directory data file that sets its defaults (layout, `category`, permalink): `<type>.json` for ten types, and `<type>.11tydata.js` for `jams`, `photos`, `reading`, `recipes`, `videos` and `watching`, which compute values. Every one sets `tags: ["posts"]` only — that firehose tag drives `collections.posts`; per-type collections come from `category` via `byCategory()` in `src/_config/collections.js`, not from tags. Permalinks use `{{ page.fileSlug | slugify }}` (or `slug:` where set). The wiki page "Anatomy of a post type" walks through one end to end.

## Themes

A site's look is a theme: a folder in `src/_includes/themes/`, chosen at build time by `theme:` in `settings.yaml`. A name with no folder stops the build. `src/_config/utils/theme.js` is the one place that knows where the active theme is. `sample` is a neutral theme to copy for a new one.

- `theme.json`: the colours for `<meta theme-color>` and the manifest, which fonts to preload, and an `og` block for the share cards (colours, font names, and font files for the scripts; a font with no `file` is a system font); `meta.js` reads it
- `logo.svg`: the logo, inlined by `{% svg "logo" %}`; its root `fill` and its one `d` are read by the favicon and share-card scripts
- `tokens/*.json`: the design tokens (below)
- `fonts/`: the font files, published at `/assets/fonts/` whichever theme is active; a theme with no fonts has no folder
- `fonts.css`: the `@font-face` rules, in the `fonts` layer
- `theme.css`: the theme's own CSS, in the `theme` layer, which comes last
- `home.njk`: the start page's body, included from `src/_layouts/pageIndex.njk`
- `footer-credit.njk`: the first line of the footer
- `DESIGN.md`: a written summary of the design system

Global data `designTokens` holds the active theme's tokens, one key per file. Templates reach a theme's own files with `{% include "themes/" + meta.theme + "/home.njk" %}`. Tailwind only scans the active theme's templates, and never a `DESIGN.md`, so another theme's classes can't reach the CSS. Eleventy never treats anything in `_includes` as a page.

## Design Tokens

All tokens live in the active theme's `tokens/*.json` and are consumed by the Tailwind config to generate CSS custom properties and utility classes. The values below are the `jedee` theme's.

**Colors** (`colorsBase.json` → `npm run colors` → `colors.json`):
- `palette`: Base family — `darkest` `#495464`, `dark` `#bbbfca`, `light` `#dddee8`, `lightest` `#f4f4f2`. Composed into the semantic accent variables (`--color-accent-orange/blue/green`) in `src/assets/css/global/base/variables.css`. Those three are CSS-only except `accent-orange`, which also has an entry in `semanticColors.json` so the design tools get a swatch for it — `accent-blue`/`accent-green` reach them already as the light_dark colors in `colors.json`.
- `shades_neutral`: Gray `#495464` → generates a 100–900 palette
- `shades_vibrant`: Orange `#EF7E40` → generates a 100–900 palette
- `light_dark`: Red, Blue, Green — each gets a `subdued` variant for dark themes
- `standalone`: gray-250 `#C8CACC` — a single fixed value

**Fonts** (`fonts.json`) — jedee uses Adobe Source fonts, not the upstream Atkinson Hyperlegible:
- `display`: Source Serif 700 (fallback: Source Serif Fallback, serif)
- `base`: Source Sans 3 VF (fallback: Source Sans Fallback, sans-serif)
- `mono`: Source Code Pro (extensive monospace fallbacks)

**Spacing** (`spacing.json`) — Utopia fluid scale (320px → 1552px viewport):
- Fixed steps: `3xs`, `2xs`, `xs`, `s`, `m`, `l`, `xl`, `2xl`, `3xl`
- Fluid pairs: `xs-s`, `s-m`, `m-l`, `l-xl`, `l-2xl`, `xl-2xl`, `2xl-3xl`

**Text sizes** (`textSizes.json`) — Utopia fluid type scale: `step-min-2` through `step-6` (base: 19px @ 320px → 28px @ 1552px)

**Text leading** (`textLeading.json`): `flat` (1), `extrafine` (1.1), `fine` (1.2), `standard` (1.45), `fibonacci` (1.612)

**Text weights** (`textWeights.json`): `regular` (400), `bold` (700), `extra-bold` (900)

**Border radius** (`borderRadius.json`): `small` (0.1875rem), `medium` (0.3rem), `pill` (999px)

**Border width** (`borderWidth.json`): `thin` (1px), behind `--border-thickness`

**Shadows** (`shadows.json`): `panel`, `popup`, `chip`, `thumb`, `thumb-cast`, each with a `-dark` pair

**Semantic and component colors**: `semanticColors.json` (theme-aware roles for the design tools), `buttonColors.json`, `megamenuColors.json`

**Typography** (`typography.json`): composite text styles built from the size, leading and weight tokens

**Viewports** (`viewports.json`): min 320, sm 640, navigation 662, md 1000, max 1552 — the width where the fluid type and space scales stop growing, kept equal to `--wrapper-width` (97rem)

## Site Metadata

Identity and social profiles live in `src/_data/settings.yaml`; `src/_data/meta.js` builds the site-wide config (OG defaults, and the theme colors from the active theme's `theme.json`) from it, and `src/_data/personal.js` maps the same values onto Eleventy Excellent's `personal.*` names. This site's own values (name, email, fediverse handle, profile links, blog description, theme colors) are in `SITE.md`.

## Language and Words

`site:` in `settings.yaml` holds the site's `lang` (for `<html lang>` and the feeds), `locale` (for `og:locale` and the structured data, like `en_US`) and `type` (`Person` or `Organization`, which is what the structured data calls the owner). A settings file with no `site:` block builds as English for a person.

The interface words (labels, headings, accessible names, feed titles) live in `src/_config/words/<lang>.yaml`, one flat `key: text` file per language, read by `src/_data/words.js` into the global data `words`. The chosen language is laid over `en.yaml`, so a word nobody has translated shows in English. Templates write `{{ words.backlinks }}`; a sentence with a name or number in it is a text with `{title}`-style holes, filled with `| replace('{title}', title)`. `meta.js` hands the same words on under Eleventy Excellent's names (`meta.search.placeholder` and so on). A language with no file stops the build, and `tests/words.test.js` checks that every `words.x` a template uses exists in `en.yaml`. Page text in `src/pages/*.md`, `src/posts`, `src/wiki` and `themes/` is content, not interface words, and stays where it is.

## Key Conventions

- **ESM only** — all JS files use `import`/`export`, no CommonJS
- **Markdown wikilinks** are supported: `[[Page Title]]` will create backlinks between notes. See the LLM wiki section below for how they behave across the wiki boundary.
- **Drafts** are excluded from builds via the drafts plugin (`src/posts/articles/-drafts/`)
- **Images** are processed by `@11ty/eleventy-img` with three approaches: (1) **HTML Transform** — processes any `<img>` tag as a post-processing step, supports co-located images; (2) **`image` shortcode** — positional parameters; (3) **`imageKeys` shortcode** — named parameters (easier, order-independent). Default formats are `['avif', 'webp', 'jpeg']`, lazy loaded by default. Shortcodes are defined in `src/_config/shortcodes/image.js`.
- **Tailwind** is used to generate CSS custom properties from design tokens — not a utility class framework. CUBE CSS methodology drives base styles. Do not treat this as a standard Tailwind utility-class project.
- **CSS files** live in `src/assets/css/`. Follow CUBE CSS methodology. The global CSS bundle uses **cascade layers** (reset, compositions, etc.); the "local" per-page/component bundle does not use layers and therefore has higher specificity than global styles regardless of selector specificity.
- **JS source files** live in `src/assets/scripts/bundle/` (readable) — `src/_includes/scripts/` contains the minified build output. Always edit the source, not the minified version.
- **backlinks.njk** is part of the `@photogabble/eleventy-plugin-interlinker` integration, not core Eleventy Excellent — freer to modify than core EE templates.
- **OG images** are pre-generated into `src/assets/og-images/`; `npm run clean:og` clears them
- **Accessibility** is a priority — run `npm run test:a11y` before major changes
- **Design files are downstream mirrors, never sources.** The Penpot file is fed by `npm run penpot:tokens` as below, and the Figma copy by `npm run figma:tokens`; the tokens in the theme's `tokens/*.json` stay canonical and no design app is in the build path.
- **Design tokens sync to Penpot** via `npm run penpot:tokens` → writes `_local/penpot/penpot-tokens.dtcg.json` → manually import in Penpot's Tokens panel. Two traps: border radii export as **px, not rem** (Penpot imports rem fine but its radius *binding* validator rejects it — a bound corner warns "not in any active set"), and import **replaces** same-named sets rather than merging (a Penpot-only token not in the JSON source is dropped on re-import). The same script also regenerates the YAML front matter in the theme's `DESIGN.md` (Anthropic-style design-system spec for AI agents and humans — the markdown body below the second `---` is hand-authored and preserved verbatim). See [_local/penpot/penpot-tokens.md](_local/penpot/penpot-tokens.md) for mapping rules, the `penpot` font-name field convention in `fonts.json`, and the typography composite styles in `typography.json`.

## End-of-session deliverables

The `end-of-session` skill reads this section. Working material (handoffs, plans in progress, scratch scripts) goes in `_local/generated/`; a handoff is `_local/generated/Handoff - <topic>.md`, and superseded ones move to `_local/generated/_archive/`. The usual deliverable is a wiki page through the `wiki-ingest` skill, when the session produced a reusable technique, decision or trap. A durable plan or reference goes in `_local/design/` (`Plan - <topic>.md`, `Reference - <topic>.md`). Never draft a post: posts are the site owner's own writing. Otherwise the deliverable is "neither".

## LLM wiki

A Claude-maintained wiki documenting how jedee is designed and built — the techniques, patterns, and decisions behind the site. It is a real post type with the full site chrome (`src/_layouts/wiki.njk`); whether it reaches the published site is set by one dial (the `wiki` block in `settings.yaml`, below). Public since 2026-09-05 — reachable, but deliberately unfeatured: no feed, no place in the navigation, found by following a link. Design: `_local/design/Plan - LLM wiki (private-first).md`.

### Layout

- `src/wiki/` — the wiki pages. Claude writes and maintains these, the site owner supervises; the `TechArticle` schema states that split. Ordinary tracked files in the jedee repo; they commit with everything else.
- `src/wiki/index.md` — the catalog. Read this FIRST when answering a wiki question; update it on every ingest. One line per page saying what it covers and why you would open it, and nothing else: the findings, traps and measurements belong on the page, not restated here. `_log.md` is the record of what changed when, so the index never carries a copy of it.
- `src/wiki/_log.md` — diary of ingest / query-filed / lint sessions, **newest first**: a new entry goes at the top, directly under the intro paragraph. Format `## [YYYY-MM-DD] ingest | Title`.
- `src/_raw/` — immutable sources: external clips and retired dev notes (in `src/_raw/dev-notes/`). Read, never edit or delete. Also read in place, never edit: `_local/project_docs/` and Lene's upstream EE docs (their local path is in `SITE.md`).
- `src/_data/settings.yaml` → `wiki.visibility` — the visibility dial: `private` never builds the wiki, `local` builds it only in the dev server (never in a production build), `public` builds it everywhere and is how the wiki goes live. `hidden` is reserved and stops the build. Currently `public`.

### Rules

- A post *may* link into the wiki, but rarely should: the wiki is reference material the site does not feature, and a post that keeps pointing at it drags the site back to being about its own construction. Default to no. Wiki pages still `[[link]]` freely to each other and to posts.
- External links are encouraged (a techniques wiki cites its sources): ordinary markdown links like `[CUBE CSS](https://cube.fyi)`. Wikilinks are only for pages inside the vault.
- Scope: **web development only.** The wiki covers making the site — techniques, patterns, decisions. Craft knowledge from the production side of a post (audio gear and recording chains, camera and scanning technique) is out of scope even when the resulting post is published here; it belongs in `LOG.md` and the relevant `_local/design/Plan - …` record. The test before an ingest is whether the knowledge is about making the web thing or about making the thing the page is about.
- Page style: the dev-note voice — factual, reporting tone, code snippets to illustrate each technique. No marketing prose, no first-person flourishes.
- The ⚠ marker is rationed: at most one per page, and a second only on a page long enough to cover two separate systems. It marks something that fails *without saying so* — a build that succeeds while the output is wrong, a declaration that silently does nothing, a test that passes on a path that no longer exists. Not a caveat, not an aside, not a measurement, not "note that". Everything else is ordinary prose, and bold already does the work of drawing the eye. Used more often than that, the marker stops meaning anything. ⚠ in the index is always wrong: the page one click away carries it.
- Page shape: a page is named after its concept, plain noun title like a normal wiki ("Microformats", "Text wrapping"). It opens by explaining the thing in general — what it is, why it exists, sources — then a section headed "In jedee" for how this site uses it, or one line saying it doesn't (that line is what lets the wiki hold general material: web techniques, the case for personal sites, copyright). Purely project-internal pages ("Anatomy of a post type", the archives) keep plain descriptive titles; there is no general concept to lead with. Existing finding-style titles get promoted to concept titles opportunistically, when an ingest touches them — not as a mass rename. Prefer single-word concept names where natural ("Wikilinks", "Microformats"); rename only, no page splits. Create a parent concept page (e.g. "CSS" above "CUBE CSS") only when it would carry real content of its own or already has two-three pages clearly under it — backlinks then populate it for free.
- Page frontmatter: two required keys and one optional — `description` (one plain factual sentence, used for previews and the meta description), `date` (the page's first-seen date, ISO), and `updated` (ISO, only once the page has actually been revised after that date; it feeds `dateModified` in the page's structured data; the meta line shows the git "Revised" date instead, linked to the last commit and hidden when that commit falls on the page's own date). Leave `updated` off a page that has never changed — a date on every page tells a reader nothing. No in-content `# Title` line: the layout renders the title from the filename, and Obsidian shows the filename as the note title anyway.
- No person pages. Cite people with ordinary external links on the citing page.
- When a page covers something inherited from Eleventy Excellent, say which part is EE stock behavior and which part is jedee's own divergence.

### Routines

- **Ingest** (on request: "ingest X" / "ingest the new clips"): read the source, discuss takeaways with the site owner, write or update wiki pages, update `index.md`, append to `_log.md`, commit. Read the clip's `note:` field first if it has one — the site owner's own one-line reason for clipping the page, and the steer for what the wiki page should take from the source. Then fill in its empty `published:` field, from the article itself or its URL — the Clipper can't read it reliably from an arbitrary site, and a technique's age is often the whole story (a 2019 workaround and current practice look identical on the page). Write it ISO, copying the date and not the source's display format: `2024-04-24`, or truncated from the right when that's all the source gives you — `2024-04`, `2024`. All three still sort chronologically as plain text, which a format like "APR 24 2024" does not. Say so on the wiki page when a source is old enough that its advice may have been overtaken. When ingesting a published dev note: after the wiki pages are written and approved, move the note's `.md` from `src/posts/notes/` to `src/_raw/dev-notes/` (it becomes a permanent raw source; its live URL goes away — accepted by design).
- **Query**: read `index.md`, drill into the relevant pages, answer with references to wiki pages and raw sources. If the answer is worth keeping, file it back as a wiki page.
- **Lint** (on request): look for contradictions between pages, stale claims, orphan pages with no inbound links, and concepts mentioned often enough to deserve their own page. Report; fix what the site owner approves.

## Netlify Configuration

`netlify.toml` sets:
- Security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) on all routes
- Cache headers: a year for fonts, a year immutable for `/img/` and `/bundle/` (content-hashed filenames), and revalidate-on-every-load for JS components (stable filenames)
- Cache plugin caches `.cache/` between builds (speeds up Eleventy Fetch + image processing)
