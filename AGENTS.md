This site's own facts are in `SITE.md`, which isn't in the repo.

# AGENTS.md — Project context for jedee

Tool-agnostic. Readable by Cursor, Codex, Gemini, Claude Code, etc. Claude Code's own notes are in a local `CLAUDE.md` that isn't in the repo.

## Project goals

An [indieweb](https://indieweb.org/) website with clean semantic HTML, fast loading times, and four 100 scores in Lighthouse.

## Project Overview

A personal website built with [Eleventy (11ty) v3](https://www.11ty.dev) and the [Eleventy Excellent](https://github.com/madrilene/eleventy-excellent) starter theme, deployed on Netlify. `meta.noindexSite` puts `noindex` on the whole site while it is soft-launched.

## Tech Stack

- **Static site generator:** Eleventy 3.x (ESM; Node 24 via `.nvmrc`)
- **CSS:** PostCSS + Tailwind CSS (used to generate CSS custom properties from design tokens — not a utility-class framework)
- **Deployment:** Netlify (publish dir: `dist`). Netlify doesn't run `npm run build`: its command in `netlify.toml` clears `dist/` but keeps the image folders, then runs `npm run build:11ty`

## Commands

```bash
npm start                  # Dev server (http://localhost:8080)
npm run build              # Production build → dist/
npm run clean              # Remove dist and compiled CSS/JS
npm run clean:og           # Remove pre-generated OG images
npm run colors             # Generate the active theme's colors.json from its colorsBase.json
npm run penpot:tokens      # Generate _local/penpot/penpot-tokens.dtcg.json for Penpot import
npm run figcraft:tokens    # Update the variables in the FigCraft design file from the tokens (add -- --check to only list the differences)
npm run icons:bounds       # Measure each posts/ icon's outline into src/_data/iconBounds.json (run after adding or changing one)
npm run favicons           # Generate favicons
npm run fallback-font-style  # Generate fallback font CSS
npm run test:a11y          # Accessibility tests with pa11y-ci
npm run test:unit          # Unit tests (node --test, files in tests/)
npm run rebuild            # Rebuild dist/ with drafts and hidden things included (BUILD_DRAFTS=1 SHOW_HIDDEN=1), keeping the image folders
npm run compare            # Compare dist/ with the saved build in _local/baseline/ (add -- --shots to compare pictures too)
npm run bare               # Build a bare page (every switch off, no post types, the sample theme) and print what it weighs and what it asks for
npm run test:skip-link     # Press Tab on the built pages and check the skip link takes focus (run after a build)
npm run design:system      # Rebuild the local design-system bundle in _local/claude-design-system (needs the jedee theme's design-system folder)
npm run mockups            # Re-shoot the wiki's mockup pictures (npm run mockups:check lists the ones that have drifted)
npm run flags              # List the @until comments that expire at a milestone
npm run design:md          # Rewrite the theme's DESIGN.md front matter from the tokens (penpot:tokens runs it too)
npm run og:default         # Make the default share image; og:cards makes the per-post ones
npm run genres:fetch       # Jam genres from MusicBrainz into a cache; genres:apply shows the changes, add -- --write to save
npm run descriptions:fetch # Genre descriptions from Wikipedia into a cache; descriptions:build shows them, add -- --write to save
npm run dev:mem            # The dev server with a memory log, for chasing its leak
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
  pages/           # Static pages (about, per-type indexes, the design system page, etc.)
  posts/           # All content, one folder per post type (see Content Types below)
  wiki/            # The LLM wiki (see below)
  search.json.11ty.js  # The site search index
admin/             # Sveltia CMS (index.html, config.yml)
netlify/           # Netlify Functions (micropub, health-export)
tests/             # Unit tests (*.test.js), their helpers (lib/), the build comparison (compare-builds.mjs and compare-allowed.json), the bare-page report (bare-page.mjs) and site-files.json, the list of files that belong to this site alone
dist/              # Build output (local only)
_local/            # ALL local-only project material (see below)
```

**What's tracked:** `src/`, `admin/`, `netlify/`, `tests/`, the root config files, `readme.md`, `LICENSE`, and this `AGENTS.md`. That's the whole public repo — the site, its tests and the instructions for building it, nothing else. `AGENTS.md` is public, so keep anything personal out of it; that goes in the local `SITE.md`.

**The comparison:** `npm run compare` checks a build in `dist/` against a saved build in `_local/baseline/` (page addresses, markup, feeds and text files; with `-- --shots`, pictures of 20 sample pages too). `tests/compare-allowed.json` lists the differences that are meant, each with a reason; anything else fails. `_local/baseline/` is not in git, so a fresh clone has to build it first. `npm run rebuild` is the build to compare with: it clears `dist/` except the image folders and builds with drafts and hidden things on.

**What's local only:** everything under `_local/` — `generated/` (plans, references, handoffs and drafts; `scripts/` for one-off scripts, `demos/` for test pages and previews, `_archive/` for finished notes), `project_docs/` (the HTML specs), `penpot/`, `claude-design-system/` and `token-panel/` (written or read by npm scripts), `baseline/` and `compare/` (the saved build and the difference pictures from `npm run compare`), `data/` (genre lists), `originals/` (source files only: photos, audio, video, map tiles, logo and icon masters, `.penpot` backups), `strava/` and `resources/` (imports, clips, notes), and `archive/` (retired tools and old material). One `.gitignore` rule, `/_local/`, covers all of it. A single leading underscore means local-only.

Also local only, but kept at the root as everyday surface files: `SITE.md` (this site's own facts), `TODO.md`, `LOG.md`, `IDEAS.md`, and the AI tool files `CLAUDE.md` and `.claude/`. Don't expect any of these in `git status`, and don't cite them from a tracked file.

A theme's `DESIGN.md` and `_local/penpot/penpot-tokens.dtcg.json` are derived artifacts regenerated by `npm run penpot:tokens`. The markdown body of `DESIGN.md` is hand-authored; only the YAML front matter is rewritten.

## Content Types & Frontmatter

There are **16** post types, one folder each under `src/posts/` (`activities`, `articles`, `audio`, `bookmarks`, `events`, `jams`, `likes`, `notes`, `photos`, `reading`, `recipes`, `replies`, `reposts`, `rsvps`, `videos`, `watching`). Don't add a 17th. The authoritative per-type front matter is the Phase 3 spec, `_local/generated/Plan - Phase 3 (10 new post types) - final.md`.

Each folder has a directory data file that sets its defaults (layout, `category`, permalink): `<type>.json` for ten types, and `<type>.11tydata.js` for `jams`, `photos`, `reading`, `recipes`, `videos` and `watching`, which compute values. Every one sets `tags: ["posts"]` only — that firehose tag drives `collections.posts`; per-type collections come from `category` via `byCategory()` in `src/_config/collections.js`, not from tags. Permalinks use `{{ page.fileSlug | slugify }}` (or `slug:` where set). The wiki page "Anatomy of a post type" walks through one end to end.

## Themes

A site's look is a theme: a folder in `src/_includes/themes/`, chosen at build time by `theme:` in `settings.yaml`. A name with no folder stops the build. `src/_config/utils/theme.js` is the one place that knows where the active theme is. `sample` is a neutral theme to copy for a new one.

- `theme.json`: the colors for `<meta theme-color>` and the manifest, which fonts to preload, and an `og` block for the share cards (colors, font names, and font files for the scripts; a font with no `file` is a system font); `meta.js` reads it
- `logo.svg`: the logo, inlined by `{% svg "logo" %}`; its root `fill` and its one `d` are read by the favicon and share-card scripts
- `tokens/*.json`: the design tokens (below)
- `fonts/`: one folder per family; its top-level `.woff2` files are published at `/assets/fonts/<family>/` whichever theme is active, and a `_source/` folder beside them (the originals, for re-subsetting) is not; a theme with no fonts has no folder
- `fonts.css`: the `@font-face` rules, in the `fonts` layer
- `theme.css`: the theme's own CSS, in the `theme` layer, which comes last
- `home.njk`: the start page's body, included from `src/_layouts/pageIndex.njk`
- `footer-credit.njk`: the first line of the footer
- `DESIGN.md`: a written summary of the design system

Global data `designTokens` holds the active theme's tokens, one key per file. Templates reach a theme's own files with `{% include "themes/" + meta.theme + "/home.njk" %}`. Tailwind only scans the active theme's templates, and never a `DESIGN.md`, so another theme's classes can't reach the CSS. Eleventy never treats anything in `_includes` as a page.

## Switches and post types

Every part that used to be always on has a yes/no setting under `switches` in `src/_data/settings.yaml`, on unless set to `false`: `easteregg`, `shortcuts`, `tooltips`, `devGrid`, `themeToggle`, `serviceWorker`, `pullToRefresh`, `webmentions`, `micropub`, `relMe`, `feeds`, `header`, `mainNav`, `breadcrumb` and `footer`. The list is `SWITCHES` in `src/_config/utils/switches.js`, which gives `meta.switches`; a value that isn't true or false stops the build. A new switch goes in that list, in `settings.yaml` and in `admin/config.yml` together, because a Sveltia save writes a missing yes/no field as `false`. Switching a part off removes its markup and its CSS and script; the page's own inline theme script stays, because it also applies the device's light or dark setting. The older flags `hideNav`, `hideFeatured` and `noindexSite` are laptop-only and not in the form; `SHOW_HIDDEN=1` turns the first two off for a test build, which `npm run rebuild` does.

`settings.postTypes` lists the post types the site builds (the category names, such as `note` and `recipe`). A missing value builds all sixteen, `[]` builds none, and a name that isn't a post type stops the build. ⚠ `[]` is a hand edit: the admin form never saves an empty selection, so clearing the form in the CMS puts the site back to all sixteen, not to none. A type left out has no posts, archive page, feeds or menu link, and a Featured or /now pick of it is skipped.

A page's CSS is loaded by what the page uses: the header, footer, menu, prose, buttons, code and the other pieces are each a file in `src/assets/css/local/` that the template using it includes. In dev, saving prose, button or code CSS now costs an Eleventy rebuild, where a file in `src/assets/css/global/` only recompiles the global stylesheet. `npm run bare` is the measure of what is left when everything is off; keep it from growing.

## Starting a new site from a copy

A new site or app starts as a plain copy of this project, re-styled, with the parts it doesn't need deleted by hand. There is no link between copies. This order was tried twice for real (a one-page app with push notifications, and a one-page site in a repo that already had files); a build after each step shows what broke.

0. **Node and Netlify first.** Switch to the Node version in `.nvmrc` (`nvm use`) before any `npm` command: an older npm quietly rewrites `package-lock.json` (it drops the `libc` lines). If the site goes on Netlify, create the project now, so the real address is known in step 2; the name you want may be taken, and the share image in step 3 prints the address.
1. **Copy.** `mkdir ../newsite`, then `git archive HEAD | tar -x -C ../newsite` hands over the files that are in git and nothing else. In the new folder: `git init -b main`, a first commit, `npm ci`.
   - **Into a folder that already has files:** compare `git ls-files` in both with capitals ignored first (⚠ the Mac treats `readme.md` and `README.md` as one file, so a copy overwrites it without a word). Leave `readme.md`, `LICENSE` and `.gitignore` out of the copy (`git archive HEAD | tar -x -C ../there --exclude=readme.md --exclude=LICENSE --exclude=.gitignore`) and join them by hand. ⚠ The Eleventy Excellent (ISC) and Cube Boilerplate (MIT) notices at the end of `LICENSE` must travel with the code: put them in a separate file, such as `credits.txt`. ⚠ Check the folder's `.gitignore` doesn't hide `AGENTS.md`, and write a top-level-only ignore as `/DESIGN.md`, since every theme keeps a `DESIGN.md` in git.
2. **Settings.** Rewrite `src/_data/settings.yaml`: `identity` (`name`, `email`, `website` as a full address, `description`, `tagline`, `ogAlt`), `profiles: {}`, `site`, `postTypes` (`[]` for none), every switch the site doesn't need set to `false` (the older flags `nameReveal`, `viewRepo`, `hideFeatured`, `hideNav` and `noindexSite` sit in the same block), `wiki: {visibility: private}` and `search: {enabled: false}`. Remove `repos` and `analytics`. ⚠ `profiles` and `wiki` must stay even when unused, or the build stops.
3. **The look.** Copy `src/_includes/themes/sample` to a folder named after the site, set `theme:`, delete `themes/jedee`, and change "sample" to the new name in its `DESIGN.md`. Put the logo in the theme's `logo.svg` (keep `viewBox="0 0 100 100"`, a `fill` on the `<svg>` tag and a path with `d="…"`). A logo that isn't square has to be redrawn into that box: scale its path coordinates to fit the longer side and centre the shorter one, and keep the original in a separate file. Then run `npm run favicons` and `npm run og:default` straight away: until then the copy carries the old site's icons and share image, which are in git.
4. **Delete the old site's content.** These, most of them listed in `tests/site-files.json`: `src/posts`, `src/wiki`, `src/assets/og-images`, the picture folders, `netlify/functions/health-export.js`, `src/_data/jamSocial.json`, `src/_data/genreDescriptions.json`, `src/_data/navigation.js`, and the pages in `src/pages` except `index.njk` and `offline.md`. ⚠ Empty `src/_data/featured.yaml` to `posts: []`; deleting it stops the build. ⚠ Pick files to delete from `git ls-files`, never from `ls`, which on the Mac pads names with spaces so a "keep these" filter misses.
5. **Delete what a switch leaves behind.** A switch removes a part from the pages, not its files from the build. If the site doesn't use them: `admin/` (or it publishes a CMS page that points at this repo), `netlify/functions/micropub.js`, `src/assets/audio`, `video` and `map`, the files in `src/assets/scripts/components/` (each is published on every build), `src/_obsidian`, `src/assets/obsidian`, `src/common/carbon.njk` and `llms.njk`, and the fixed line in `src/common/_redirects.njk`.
6. **Rewrite what names the old site.** `src/common/humans.njk` (its "Developer" line takes the site's name), `tests.pa11y.customPaths` in `src/_data/meta.js` (⚠ a page that doesn't exist passes the accessibility test), `package.json` (name, description, repository, scripts for deleted parts and their setup files), `readme.md`, `LICENSE`, `.env-sample`, and this file; keep or rewrite its "End-of-session deliverables" section, since the `end-of-session` skill reads it. Check `offline.md` and `404.md`: their email comes from the settings, so they may need nothing.
7. **For an app.** Under `pwa:` set `workerPath`, `keepCaches`, `push` and `precache`. The page is `src/pages/index.njk` with `layout: base`; its script goes in `src/assets/scripts/components/`. Rules that the page and a function share go in one file directly in `src/assets/scripts/` (not in `components/`, where every file is published): the page script imports it and the build writes it in, and a function in `netlify/functions/` imports it by path. Functions answer under `/api/`, which the worker never caches. Keys go in `.env` and Netlify, never in git. To see the worker at work locally, build, run `npx netlify dev --dir dist` and open `http://<any-name>.localhost:8888`; the worker steps aside on plain `localhost`.
8. **Tests.** These tests are about this project with all its parts, and most fail once parts are deleted. Keep `tests/lib/` (`temp-site.mjs` builds the site in a temp folder, `worker.mjs` runs a built worker in a made-up browser), delete the tests for parts that are gone, and write a few for the new site. Make each new test fail once on purpose before trusting it. `npm run bare` measures the active theme once `sample` is gone.
9. **Netlify.** `netlify link` ties the folder to the project from step 0. Connecting the GitHub repo is done on Netlify's page (Project configuration → Build & deploy → Link repository), with Base directory empty: the build command, the `dist` publish folder and the headers come from `netlify.toml`, and the Node version from `.nvmrc`. After that every push to `main` deploys.
10. **Later, or never.** The templates, CSS and scripts of switched-off parts stay in `src/` and cost nothing on the page, as do the few library files `eleventy.config.js` copies in. Delete them a few at a time with a build between.

## Design Tokens

All tokens live in the active theme's `tokens/*.json` and are consumed by the Tailwind config to generate CSS custom properties and utility classes. The values below are the `jedee` theme's.

**Colors** (`colorsBase.json` → `npm run colors` → `colors.json`):
- `palette`: Base family — `darkest` `#495464`, `dark` `#bbbfca`, `light` `#dddee8`, `lightest` `#f4f4f2`. Composed into the semantic accent variables (`--color-accent-orange/blue/green`) in `src/assets/css/global/base/variables.css`. Those three are CSS-only except `accent-orange`, which also has an entry in `semanticColors.json` so the design tools get a swatch for it — `accent-blue`/`accent-green` reach them already as the light_dark colors in `colors.json`.
The other token files (fonts, spacing, text sizes, leading, weights, radius, border width, shadows, semantic/button/megamenu colors, typography) hold their values directly; read them there.

**Viewports** (`viewports.json`): `max` is the width where the fluid type and space scales stop growing, kept equal to `--wrapper-width` (97rem)

## Site Metadata

Identity and social profiles live in `src/_data/settings.yaml`; `src/_data/meta.js` builds the site-wide config (OG defaults, and the theme colors from the active theme's `theme.json`) from it, and `src/_data/personal.js` maps the same values onto Eleventy Excellent's `personal.*` names. This site's own values (name, email, fediverse handle, profile links, blog description, theme colors) are in `SITE.md`.

## Language and Words

`site:` in `settings.yaml` holds the site's `lang` (for `<html lang>` and the feeds), `locale` (for `og:locale` and the structured data, like `en_US`) and `type` (`Person` or `Organization`, which is what the structured data calls the owner). A settings file with no `site:` block builds as English for a person.

The interface words (labels, headings, accessible names, feed titles) live in `src/_config/words/<lang>.yaml`, one flat `key: text` file per language, read by `src/_data/words.js` into the global data `words`. The chosen language is laid over `en.yaml`, so a word nobody has translated shows in English. Templates write `{{ words.backlinks }}`; a sentence with a name or number in it is a text with `{title}`-style holes, filled with `| replace('{title}', title)`. `meta.js` hands the same words on under Eleventy Excellent's names (`meta.search.placeholder` and so on). A language with no file stops the build, and `tests/words.test.js` checks that every `words.x` a template uses exists in `en.yaml`. A site's own wording and facts (first-person text, its wiki's name, its feed descriptions) go in the active theme's `words.yaml`, laid over the language file (English, then the site's language, then the theme); keep the language files neutral. Dates follow `site.lang` through the matching `dayjs/locale`, and `dateLong` in the words sets the long date's shape. Page text in `src/pages/*.md`, `src/posts`, `src/wiki` and `themes/` is content, not interface words, and stays where it is.

## Key Conventions

- **ESM only** — all JS files use `import`/`export`, no CommonJS
- **Markdown wikilinks** are supported: `[[Page Title]]` will create backlinks between notes. See the LLM wiki section below for how they behave across the wiki boundary.
- **Drafts** are excluded from builds via the drafts plugin (`src/posts/articles/-drafts/`)
- **Images** are processed by `@11ty/eleventy-img` with three approaches: (1) **HTML Transform** — processes any `<img>` tag as a post-processing step, supports co-located images; (2) **`image` shortcode** — positional parameters; (3) **`imageKeys` shortcode** — named parameters (easier, order-independent). Default formats are `['avif', 'webp', 'jpeg']`, lazy loaded by default. Shortcodes are defined in `src/_config/shortcodes/image.js`.
- **Tailwind** is used to generate CSS custom properties from design tokens — not a utility class framework. CUBE CSS methodology drives base styles. Do not treat this as a standard Tailwind utility-class project.
- **CSS files** live in `src/assets/css/`. Follow CUBE CSS methodology. The global CSS bundle uses **cascade layers** (reset, compositions, etc.); a file in the "local" per-page/component bundle uses no layer, and so beats global styles regardless of selector specificity, unless it wraps itself in `@layer blocks { … }`, as the header, menu, footer and other pieces moved out of the global CSS do: `global.css` declares the layer order first, so those keep their place among the blocks.
- **JS source files** live in `src/assets/scripts/bundle/` (readable) — `src/_includes/scripts/` contains the minified build output. Always edit the source, not the minified version.
- **backlinks.njk** is part of the `@photogabble/eleventy-plugin-interlinker` integration, not core Eleventy Excellent — freer to modify than core EE templates.
- **OG images** are pre-generated into `src/assets/og-images/`; `npm run clean:og` clears them
- **Accessibility** is a priority — run `npm run test:a11y` before major changes
- **Design files are downstream mirrors, never sources.** The design file is in FigCraft since 2026-11-17 (`_local/originals/figcraft/jedee website.figcraft`), fed by `npm run figcraft:tokens`; the Penpot file is a frozen backup. The tokens in the theme's `tokens/*.json` stay canonical and no design app is in the build path.
- **Design tokens sync to FigCraft** via `npm run figcraft:tokens`: it opens a copy of the file in a second FigCraft window over its control port, sets the "jedee website" variables' Light and Dark values from the tokens (one set since 2026-11-18), prints each difference (changed, missing, FigCraft-only), and copies the file back only if nobody saved it meanwhile. `-- --check` lists the differences without writing. Links between tokens (`{color.text}`) stay links. Letter spacing, `type.*` and `shadow.*` are left alone: FigCraft uses the site's measured tracking, and keeps type and shadows as text and effect styles. ⚠ Close the file in FigCraft before running, or reopen it after: a window still holding the old version refuses to save over the new one.
- **Design tokens sync to Penpot** (frozen since 2026-11-18) via `npm run penpot:tokens` → writes `_local/penpot/penpot-tokens.dtcg.json` → manually import in Penpot's Tokens panel. Two traps: border radii export as **px, not rem** (Penpot imports rem fine but its radius *binding* validator rejects it — a bound corner warns "not in any active set"), and import **replaces** same-named sets rather than merging (a Penpot-only token not in the JSON source is dropped on re-import). The same script also regenerates the YAML front matter in the theme's `DESIGN.md` (Anthropic-style design-system spec for AI agents and humans — the markdown body below the second `---` is hand-authored and preserved verbatim). See [_local/penpot/penpot-tokens.md](_local/penpot/penpot-tokens.md) for mapping rules, the `penpot` font-name field convention in `fonts.json`, and the typography composite styles in `typography.json`.

## End-of-session deliverables

The `end-of-session` skill reads this section. Plans, references and handoffs all go in `_local/generated/` (`Plan - <topic>.md`, `Reference - <topic>.md`, `Handoff - <topic>.md`); scratch scripts go in `_local/generated/scripts/`, test pages in `_local/generated/demos/`. A finished handoff or plan moves to `_local/generated/_archive/`, but ⚠ only once nothing cites it: grep TODO, AGENTS, the skills, memory and `src/` for its name first, since durable records like the Phase 3 spec share the folder. The usual deliverable is a wiki page through the `wiki-ingest` skill, when the session produced a reusable technique, decision or trap. Never draft a post: posts are the site owner's own writing. Otherwise the deliverable is "neither".

## LLM wiki

A Claude-maintained wiki documenting how jedee is designed and built — the techniques, patterns, and decisions behind the site. It is a real post type with the full site chrome (`src/_layouts/wiki.njk`); whether it reaches the published site is set by one dial (the `wiki` block in `settings.yaml`, below). Public since 2026-09-05 — reachable, but deliberately unfeatured: no feed, no place in the navigation, found by following a link. Design: `_local/generated/Plan - LLM wiki (private-first).md`.

### Layout

- `src/wiki/` — the wiki pages. Claude writes and maintains these, the site owner supervises; the `TechArticle` schema states that split. Ordinary tracked files in the jedee repo; they commit with everything else.
- `src/wiki/index.md` — the catalog. Read this FIRST when answering a wiki question; update it on every ingest. One line per page saying what it covers and why you would open it, and nothing else: the findings, traps and measurements belong on the page, not restated here. `_log.md` is the record of what changed when, so the index never carries a copy of it.
- `src/wiki/_log.md` — diary of ingest / query-filed / lint sessions, **newest first**: a new entry goes at the top, directly under the intro paragraph. Format `## [YYYY-MM-DD] ingest | Title`.
- `src/_raw/` — immutable sources: external clips and retired dev notes (in `src/_raw/dev-notes/`). Read, never edit or delete. Also read in place, never edit: `_local/project_docs/` and Lene's upstream EE docs (their local path is in `SITE.md`).
- `src/_data/settings.yaml` → `wiki.visibility` — the visibility dial: `private` never builds the wiki, `local` builds it only in the dev server (never in a production build), `public` builds it everywhere and is how the wiki goes live. `hidden` is reserved and stops the build. Currently `public`.

### Rules

- A post *may* link into the wiki, but rarely should: the wiki is reference material the site does not feature, and a post that keeps pointing at it drags the site back to being about its own construction. Default to no. Wiki pages still `[[link]]` freely to each other and to posts.
- External links are encouraged (a techniques wiki cites its sources): ordinary markdown links like `[CUBE CSS](https://cube.fyi)`. Wikilinks are only for pages inside the vault.
- Link a term on its first mention only; later mentions are plain text. A bare address such as schema.org follows this by itself (`linkify_first_only` in `src/_config/plugins/markdown.js`); a hand-written link repeated further down does not, so a lint looks for it.
- Scope: **web development only.** The wiki covers making the site — techniques, patterns, decisions. Craft knowledge from the production side of a post (audio gear and recording chains, camera and scanning technique) is out of scope even when the resulting post is published here; it belongs in `LOG.md` and the relevant `_local/generated/Plan - …` record. The test before an ingest is whether the knowledge is about making the web thing or about making the thing the page is about.
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
