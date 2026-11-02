A site's facts go in its `SITE.md`, which isn't in the repo.

# AGENTS.md — Project context for stomme

Tool-agnostic. Readable by Cursor, Codex, Gemini, Claude Code, etc. Notes for one tool go in a local `CLAUDE.md` that isn't in the repo.

## Project goals

A shared base for small [indieweb](https://indieweb.org/) websites, with clean semantic HTML, fast loading times, and four 100 scores in Lighthouse. Stomme's `main` holds the shared files and no posts.

## Project Overview

A boilerplate built with [Eleventy (11ty) v3](https://www.11ty.dev) on the [Eleventy Excellent](https://github.com/madrilene/eleventy-excellent) starter theme, deployed on Netlify. The chain runs Eleventy Excellent → stomme → each site. `settings.theme` chooses the look; `sample` is the neutral theme a new site starts from.

## Merging stomme into a site

- ⚠ A site's first merge from stomme is always `git merge --allow-unrelated-histories -s ours upstream/main`, never plain. Stomme contains Eleventy Excellent 4.9.1 in its history, so a plain first merge starts a real merge against that old version and stops on conflicts. The `-s ours` merge joins the histories and changes no file. Later merges are ordinary ones.
- When stomme changes `src/_data/settings.yaml`, a site keeps its file and adds any new line by hand. The merge conflict in that file is expected: take the site's version, then read stomme's for what is new.
- Stomme keeps no remote for Lene's repo, on purpose. Her releases are fetched by address, `git fetch https://github.com/madrilene/eleventy-excellent --tags`, then merged by tag. Never add her repo as a remote, so neither git nor `gh` can aim at it from a stomme clone.
- `npm run compare:upstream` lists every shared file in a site that differs from `upstream/main` as last fetched, and exits non-zero if any do. When `upstream` isn't stomme, as in stomme itself, it says so and exits 0.

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
npm run favicons           # Generate favicons from the active theme's logo
npm run og:default         # Draw the fallback share picture from the active theme
npm run fallback-font-style  # Generate fallback font CSS
npm run test:a11y          # Accessibility tests with pa11y-ci
npm run test:unit          # Unit tests (node --test, files in tests/)
npm run rebuild            # Rebuild dist/ with drafts and hidden things included (BUILD_DRAFTS=1 SHOW_HIDDEN=1), keeping the image folders
npm run compare            # Compare dist/ with the saved build in _local/baseline/ (add -- --shots to compare pictures too)
npm run compare:upstream   # In a site: list the shared files that differ from stomme
npm run bare               # Build a bare page (every switch off, no post types, the sample theme, no default share picture) and print what it weighs and what it asks for
npm run test:skip-link     # Press Tab on the built pages and check the skip link takes focus (run after a build)
npm run design:system      # Rebuild the local design-system bundle in _local/claude-design-system (needs a theme with a design-system folder)
npm run mockups            # Re-shoot the wiki's mockup pictures (npm run mockups:check lists the ones that have drifted)
npm run flags              # List the @until comments that expire at a milestone
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
    jams/                                    rsvps/
    likes/                                   videos/
    notes/                                   watching/
  wiki/            # The LLM wiki (see below)
admin/             # Sveltia CMS (index.html, config.yml)
netlify/           # Netlify Functions (micropub)
tests/             # Unit tests (*.test.js), the build comparison (compare-builds.mjs and compare-allowed.json), the bare-page report (bare-page.mjs), compare-upstream.mjs, and site-files.json, the list of files that belong to a site rather than to the shared base
dist/              # Build output (local only)
_local/            # ALL local-only project material (see below)
```

**What's tracked:** `src/`, `admin/`, `netlify/`, `tests/`, the root config files, `readme.md`, `LICENSE`, and this `AGENTS.md`. That's the whole public repo — the shared files, their tests and the instructions for building them, nothing else. `AGENTS.md` is public, so keep anything personal out of it.

**Site files and shared files:** `tests/site-files.json` is the definition. A file belongs to one site if a pattern matches it, and is shared if none does; `isSiteFile()` in `tests/lib/site-files.mjs` reads it. A site adds its theme folder and image folders to its copy of the list.

**Personal details:** `tests/no-personal-details.test.js` fails if a shared file holds a word from `_local/personal-words.json`. That list is local only, so on a fresh clone the test skips and says why.

**The comparison:** `npm run compare` checks a build in `dist/` against a saved build in `_local/baseline/` (page addresses, markup, feeds and text files; with `-- --shots`, pictures of the pages in `tests/compare-sample.json` too, a list that belongs to each site). `tests/compare-allowed.json` lists the differences that are meant, each with a reason; anything else fails. `_local/baseline/` is not in git, so a fresh clone has to build it first. `npm run rebuild` is the build to compare with: it clears `dist/` except the image folders and builds with drafts and hidden things on.

**What's local only:** everything under `_local/`, such as `generated/` (session handoffs, scratch scripts), `design/` (plans, references), `penpot/`, and `baseline/` and `compare/` (the saved build and the difference pictures from `npm run compare`). One `.gitignore` rule, `/_local/`, covers all of it. A single leading underscore means local-only.

Also local only, but kept at the root as everyday surface files: `SITE.md`, `TODO.md`, `LOG.md`, `IDEAS.md`, `ROADMAP.md`, and the AI tool files `CLAUDE.md`, `.mcp.json`, `.claude/`. Don't expect any of these in `git status`, and don't cite them from a tracked file.

A theme's `DESIGN.md` and `_local/penpot/penpot-tokens.dtcg.json` are derived artifacts regenerated by `npm run penpot:tokens`. The markdown body of `DESIGN.md` is hand-authored; only the YAML front matter is rewritten.

## Content Types & Frontmatter

There are **16** post types, one folder each under `src/posts/` (`activities`, `articles`, `audio`, `bookmarks`, `events`, `jams`, `likes`, `notes`, `photos`, `reading`, `recipes`, `replies`, `reposts`, `rsvps`, `videos`, `watching`). Don't add a 17th.

Each folder has a directory data file that sets its defaults (layout, `category`, permalink): `<type>.json` for ten types, and `<type>.11tydata.js` for `jams`, `photos`, `reading`, `recipes`, `videos` and `watching`, which compute values. Every one sets `tags: ["posts"]` only — that firehose tag drives `collections.posts`; per-type collections come from `category` via `byCategory()` in `src/_config/collections.js`, not from tags. Permalinks use `{{ page.fileSlug | slugify }}` (or `slug:` where set). The wiki page "Anatomy of a post type" walks through one end to end.

## Themes

A site's look is a theme: a folder in `src/_includes/themes/`, chosen at build time by `theme:` in `settings.yaml`. A missing `theme:`, or a name with no folder, stops the build. `src/_config/utils/theme.js` is the one place that knows where the active theme is. `sample` is a neutral theme to copy for a new one.

- `theme.json`: the colors for `<meta theme-color>` and the manifest, which fonts to preload, and an `og` block for the share cards (colors, font names, and font files for the scripts; a font with no `file` is a system font); `meta.js` reads it
- `logo.svg`: the logo, inlined by `{% svg "logo" %}`; its root `fill` and its one `d` are read by the favicon and share-card scripts
- `tokens/*.json`: the design tokens (below)
- `fonts/`: the font files, published at `/assets/fonts/` whichever theme is active; a theme with no fonts has no folder
- `fonts.css`: the `@font-face` rules, in the `fonts` layer
- `theme.css`: CSS that belongs to the theme, in the `theme` layer, which comes last
- `home.njk`: the start page's body, included from `src/_layouts/pageIndex.njk`
- `footer-credit.njk`: the first line of the footer
- `DESIGN.md`: a written summary of the design system

Global data `designTokens` holds the active theme's tokens, one key per file. Templates reach a theme's files with `{% include "themes/" + meta.theme + "/home.njk" %}`. Tailwind only scans the active theme's templates, and never a `DESIGN.md`, so another theme's classes can't reach the CSS. Eleventy never treats anything in `_includes` as a page.

## Switches and post types

Every part that used to be always on has a yes/no setting under `switches` in `src/_data/settings.yaml`, on unless set to `false`: `easteregg`, `shortcuts`, `tooltips`, `devGrid`, `themeToggle`, `serviceWorker`, `webmentions`, `micropub`, `relMe`, `feeds`, `header`, `mainNav`, `breadcrumb` and `footer`. The list is `SWITCHES` in `src/_config/utils/switches.js`, which gives `meta.switches`; a value that isn't true or false stops the build. A new switch goes in that list, in `settings.yaml` and in `admin/config.yml` together, because a Sveltia save writes a missing yes/no field as `false`. Switching a part off removes its markup and its CSS and script; the page's inline theme script stays, because it also applies the device's light or dark setting. The older flags `hideNav`, `hideFeatured` and `noindexSite` are laptop-only and not in the form; `SHOW_HIDDEN=1` turns the first two off for a test build, which `npm run rebuild` does.

`settings.postTypes` lists the post types the site builds (the category names, such as `note` and `recipe`). A missing value builds all sixteen, `[]` builds none, and a name that isn't a post type stops the build. ⚠ `[]` is a hand edit: the admin form never saves an empty selection, so clearing the form in the CMS puts the site back to all sixteen, not to none. A type left out has no posts, archive page, feeds or menu link, and a Featured or /now pick of it is skipped.

A page's CSS is loaded by what the page uses: the header, footer, menu, prose, buttons, code and the other pieces are each a file in `src/assets/css/local/` that the template using it includes. In dev, saving prose, button or code CSS now costs an Eleventy rebuild, where a file in `src/assets/css/global/` only recompiles the global stylesheet. `npm run bare` is the measure of what is left when everything is off; keep it from growing. Three things leave a page by what it holds rather than by a switch: `is-land.min.js` and the speculation rules go when the finished page has no island or no link on the site (`src/_config/plugins/finished-page.js`, which must stay after the WebC plugin), and the share-image tags go when neither the page nor the site has a picture to name.

## Design Tokens

All tokens live in the active theme's `tokens/*.json` and are consumed by the Tailwind config to generate CSS custom properties and utility classes.

- **Colors**: `colorsBase.json` → `npm run colors` → `colors.json`. `shades_neutral` and `shades_vibrant` each generate a 100–900 palette, `light_dark` colors each get a `subdued` variant for dark themes, and `standalone` values stay as they are. The semantic accent variables are composed in `src/assets/css/global/base/variables.css`.
- **Fonts** (`fonts.json`): `display`, `base` and `mono`. The `sample` theme uses system fonts.
- **Spacing** (`spacing.json`): a Utopia fluid scale. Fixed steps `3xs`, `2xs`, `xs`, `s`, `m`, `l`, `xl`, `2xl`, `3xl`, and fluid pairs `xs-s`, `s-m`, `m-l`, `l-xl`, `l-2xl`, `xl-2xl`, `2xl-3xl`.
- **Text sizes** (`textSizes.json`): a Utopia fluid type scale, `step-min-2` through `step-6`.
- **Text leading** (`textLeading.json`), **text weights** (`textWeights.json`), **border radius** (`borderRadius.json`), **border width** (`borderWidth.json`, behind `--border-thickness`) and **shadows** (`shadows.json`, each with a `-dark` pair).
- **Semantic and component colors**: `semanticColors.json` (theme-aware roles for the design tools), `buttonColors.json`, `megamenuColors.json`.
- **Typography** (`typography.json`): composite text styles built from the size, leading and weight tokens.
- **Viewports** (`viewports.json`): the `max` width is where the fluid type and space scales stop growing, kept equal to `--wrapper-width`.

## Site Metadata

Identity and social profiles live in `src/_data/settings.yaml`; `src/_data/meta.js` builds the site-wide config (OG defaults, and the theme colors from the active theme's `theme.json`) from it, and `src/_data/personal.js` maps the same values onto Eleventy Excellent's `personal.*` names. `maps` in `settings.yaml` holds the address of the map tiles and the area they cover; with no tiles, `<place-map>` shows no map, and the build says so. `a11yPaths` in `settings.yaml` lists the pages `npm run test:a11y` checks, and `[]` checks every page; with no such key it checks a short list of pages every site has.

## Language and Words

`site:` in `settings.yaml` holds the site's `lang` (for `<html lang>` and the feeds), `locale` (for `og:locale` and the structured data, like `en_US`) and `type` (`Person` or `Organization`, which is what the structured data calls whoever the site is for). A settings file with no `site:` block builds as English for a person.

The interface words (labels, headings, accessible names, feed titles) live in `src/_config/words/<lang>.yaml`, one flat `key: text` file per language, read by `src/_data/words.js` into the global data `words`. The chosen language is laid over `en.yaml`, so a word nobody has translated shows in English. Templates write `{{ words.backlinks }}`; a sentence with a name or number in it is a text with `{title}`-style holes, filled with `| replace('{title}', title)`. `meta.js` hands the same words on under Eleventy Excellent's names (`meta.search.placeholder` and so on). A language with no file stops the build, and `tests/words.test.js` checks that every `words.x` a template uses exists in `en.yaml`. Wording and facts that belong to one site (first-person text, its wiki's name, its feed descriptions) go in the active theme's `words.yaml`, laid over the language file (English, then the site's language, then the theme); keep the language files neutral. Dates follow `site.lang` through the matching `dayjs/locale`, and `dateLong` in the words sets the long date's shape. Page text in `src/pages/*.md`, `src/posts`, `src/wiki` and `themes/` is content, not interface words, and stays where it is.

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
- **Design files are downstream mirrors, never sources.** The Penpot file is fed by `npm run penpot:tokens` as below, and the Figma copy by `npm run figma:tokens`; the tokens in the theme's `tokens/*.json` stay canonical and no design app is in the build path.
- **Design tokens sync to Penpot** via `npm run penpot:tokens` → writes `_local/penpot/penpot-tokens.dtcg.json` → manually import in Penpot's Tokens panel. Two traps: border radii export as **px, not rem** (Penpot imports rem fine but its radius *binding* validator rejects it — a bound corner warns "not in any active set"), and import **replaces** same-named sets rather than merging (a Penpot-only token not in the JSON source is dropped on re-import). The same script also regenerates the YAML front matter in the theme's `DESIGN.md` (Anthropic-style design-system spec for AI agents and humans — the markdown body below the second `---` is hand-authored and preserved verbatim).

## End-of-session deliverables

The `end-of-session` skill reads this section. Working material (handoffs, plans in progress, scratch scripts) goes in `_local/generated/`; a handoff is `_local/generated/Handoff - <topic>.md`, and superseded ones move to `_local/generated/_archive/`. The usual deliverable is a wiki page through the `wiki-ingest` skill, when the session produced a reusable technique, decision or trap. A durable plan or reference goes in `_local/design/` (`Plan - <topic>.md`, `Reference - <topic>.md`). Never draft a post: posts are written by the person whose site it is. Otherwise the deliverable is "neither".

## LLM wiki

A Claude-maintained wiki documenting how this codebase is designed and built — the techniques, patterns, and decisions behind it. It is a real post type with the full site chrome (`src/_layouts/wiki.njk`); whether it reaches the published site is set by one dial (the `wiki` block in `settings.yaml`, below). A site that has no wiki pages keeps only the folder's data file and mockup scripts.

### Layout

- `src/wiki/` — the wiki pages. Claude writes and maintains these, the site's editor supervises; the `TechArticle` schema states that split. Ordinary tracked files; they commit with everything else.
- `src/wiki/index.md` — the catalog. Read this FIRST when answering a wiki question; update it on every ingest. One line per page saying what it covers and why you would open it, and nothing else: the findings, traps and measurements belong on the page, not restated here. `_log.md` is the record of what changed when, so the index never carries a copy of it.
- `src/wiki/_log.md` — diary of ingest / query-filed / lint sessions, **newest first**: a new entry goes at the top, directly under the intro paragraph. Format `## [YYYY-MM-DD] ingest | Title`.
- `tests/wiki-links.test.js` — fails when a wiki page that is not a site file links to a page that is not in `src/wiki/`. A dead wikilink renders as plain text with no error, so this test is the only check.
- `src/_raw/` — immutable sources: external clips and retired dev notes (in `src/_raw/dev-notes/`). Read, never edit or delete.
- `src/_data/settings.yaml` → `wiki.visibility` — the visibility dial: `private` never builds the wiki, `local` builds it only in the dev server (never in a production build), `public` builds it everywhere and is how the wiki goes live. `hidden` is reserved and stops the build.

### Rules

- A post *may* link into the wiki, but rarely should: the wiki is reference material the site does not feature, and a post that keeps pointing at it drags the site back to being about how it is built. Default to no. Wiki pages still `[[link]]` freely to each other and to posts.
- External links are encouraged (a techniques wiki cites its sources): ordinary markdown links like `[CUBE CSS](https://cube.fyi)`. Wikilinks are only for pages inside the vault.
- Scope: **web development only.** The wiki covers making the site — techniques, patterns, decisions. Craft knowledge from the production side of a post (audio gear and recording chains, camera and scanning technique) is out of scope even when the resulting post is published here; it belongs in `LOG.md` and a plan in `_local/design/`. The test before an ingest is whether the knowledge is about making the web thing or about making the thing the page is about.
- Page style: the dev-note voice — factual, reporting tone, code snippets to illustrate each technique. No marketing prose, no first-person flourishes.
- The ⚠ marker is rationed: at most one per page, and a second only on a page long enough to cover two separate systems. It marks something that fails *without saying so* — a build that succeeds while the output is wrong, a declaration that silently does nothing, a test that passes on a path that no longer exists. Not a caveat, not an aside, not a measurement, not "note that". Everything else is ordinary prose, and bold already does the work of drawing the eye. Used more often than that, the marker stops meaning anything. ⚠ in the index is always wrong: the page one click away carries it.
- Page shape: a page is named after its concept, plain noun title like a normal wiki ("Microformats", "Text wrapping"). It opens by explaining the thing in general — what it is, why it exists, sources — then a section for how this codebase uses it, or one line saying it doesn't (that line is what lets the wiki hold general material: web techniques, the case for personal sites, copyright). Purely project-internal pages ("Anatomy of a post type", the archives) keep plain descriptive titles; there is no general concept to lead with. Existing finding-style titles get promoted to concept titles opportunistically, when an ingest touches them — not as a mass rename. Prefer single-word concept names where natural ("Wikilinks", "Microformats"); rename only, no page splits. Create a parent concept page (e.g. "CSS" above "CUBE CSS") only when it would carry real content or already has two-three pages clearly under it — backlinks then populate it for free.
- Page frontmatter: two required keys and one optional — `description` (one plain factual sentence, used for previews and the meta description), `date` (the page's first-seen date, ISO), and `updated` (ISO, only once the page has actually been revised after that date; it feeds `dateModified` in the page's structured data; the meta line shows the git "Revised" date instead, linked to the last commit and hidden when that commit falls on the page's date). Leave `updated` off a page that has never changed — a date on every page tells a reader nothing. No in-content `# Title` line: the layout renders the title from the filename, and Obsidian shows the filename as the note title anyway.
- No person pages. Cite people with ordinary external links on the citing page.
- When a page covers something inherited from Eleventy Excellent, say which part is EE stock behavior and which part differs here.

### Routines

- **Ingest** (on request: "ingest X" / "ingest the new clips"): read the source, discuss takeaways with the site's editor, write or update wiki pages, update `index.md`, append to `_log.md`, commit. Read the clip's `note:` field first if it has one — the editor's one-line reason for clipping the page, and the steer for what the wiki page should take from the source. Then fill in its empty `published:` field, from the article itself or its URL — the Clipper can't read it reliably from an arbitrary site, and a technique's age is often the whole story (a 2019 workaround and current practice look identical on the page). Write it ISO, copying the date and not the source's display format: `2024-04-24`, or truncated from the right when that's all the source gives you — `2024-04`, `2024`. All three still sort chronologically as plain text, which a format like "APR 24 2024" does not. Say so on the wiki page when a source is old enough that its advice may have been overtaken. When ingesting a published dev note: after the wiki pages are written and approved, move the note's `.md` from `src/posts/notes/` to `src/_raw/dev-notes/` (it becomes a permanent raw source; its live URL goes away — accepted by design).
- **Query**: read `index.md`, drill into the relevant pages, answer with references to wiki pages and raw sources. If the answer is worth keeping, file it back as a wiki page.
- **Lint** (on request): look for contradictions between pages, stale claims, orphan pages with no inbound links, and concepts mentioned often enough to deserve a page. Report; fix what the site's editor approves.

## Netlify Configuration

`netlify.toml` sets:
- Security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) on all routes
- Cache headers: a year for fonts, a year immutable for `/img/` and `/bundle/` (content-hashed filenames), and revalidate-on-every-load for JS components (stable filenames)
- Cache plugin caches `.cache/` between builds (speeds up Eleventy Fetch + image processing)
