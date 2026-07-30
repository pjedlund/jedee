---
session_date: 2026-05-17
review_date: 2026-05-18
topic: jedee-base-reboot — Obsidian-first, IndieKit-removed redesign
predecessor: _generated/indiee-template-plan.md (superseded — see §0)
status: approved — §1–§3 user-approved 2026-05-17; §4–§13 reviewed 2026-05-18 with redirects logged in §14
next_action: invoke superpowers:writing-plans to break Phase 1 into commit-level steps
---

> **Copied into JEDEE 2026-07-30 as reference, not as a JEDEE plan.** This spec belongs to the **indiee** template project (`/Users/johanedlund/Projects/__backup/indiee-phase-1`), where it was written on 2026-05-17. The frontmatter above — `status: approved`, `next_action` — describes *indiee's* state at the time, not JEDEE's. Nothing here is committed to for JEDEE. It's kept because **§5 (Wiki layer)** and **§6 (AI substrate)** are the fullest existing design for the Karpathy-style LLM wiki, and they're the starting point for the JEDEE brainstorm parked in `IDEAS.md` ("Web Clipper as an LLM wiki-ingestion point"). The other sections describe indiee's own reboot and are background only. Two companions sit beside it in this folder: `Reference - indiee LLM wiki brainstorm handoff (2026-05-17).md` (the session that produced this spec — the questions closed, and the one left open) and `Reference - Karpathy LLM wiki concept.md` (the upstream pattern this was built from).

# Spec — JEDEE-base reboot + Obsidian-first redesign

## §0 — Supersession notice

This spec supersedes the following sections of [indiee-template-plan.md](./indiee-template-plan.md):

| Plan section | Status after this spec |
|---|---|
| §1 Vision & Philosophy | Replaced by §1 below — "Obsidian-first non-developer template" framing |
| §2 Stack & Architecture | Replaced by §1 below — IndieKit removed, `@benjifs/micropub` library + per-host adapters |
| §3 Repository Structure | Replaced by §2 below — `src/` IS the vault, new `_raw/`, `_obsidian/`, `wiki/` folders |
| §4 Content Types & Templates | Replaced by §3 below — 16 types (3 new: recipe, checkin, quotation), 9/7 default split |
| §5 Indiekit Integration | **Removed entirely.** Replaced by §7 below — `@benjifs/micropub` opt-in feature flag |
| §6 PWA Setup | Carried forward unchanged (vendored `workbox-build.generateSW`) |
| §7 Design System Surface | Carried forward unchanged (JEDEE DTCG token system, ported in Phase D) |
| §8 Build Order | Replaced by §10 below — Approach B: reboot PR + incremental feature PRs |
| §9 Decisions Made | D1, D4, D7, D9 marked obsolete; rest carry forward |
| §10 Out of Scope (v1) | Replaced by §12 below — IndieKit-as-hosted-service removed from non-goals |
| §11 Future Tasks | Carried forward, ROADMAP.md remains canonical for v1.1+ milestones |

The plan file gets a top-of-file pointer back at this spec; full archive lives in `_generated/archive/` (not created in this session).

ROADMAP.md M11 wording also needs revision — see §11 below for the new text. Not edited in this session; lands as part of Phase 1 reboot PR.

---

## §1 — Vision & Architecture

### Revised vision

indiee is a fully-wired Eleventy template for **non-developers** who want an IndieWeb site they can run from a browser. The default authoring path is **Obsidian + Obsidian Git + Obsidian Web Clipper**. The vault doubles as a Karpathy-style LLM wiki substrate: `src/_raw/` is the immutable raw-source layer, `src/wiki/` (feature-flagged) is the LLM-maintained published knowledge graph, and `AGENTS.md` at repo root is the schema file that lets any agent runtime (Claude Code, Cursor, Aider, Cline) reason about the vault.

### Three governing principles (supersede plan §1 framing)

1. **Obsidian-first, agent-legible, tooling-agnostic.** The repo ships convention (`_raw/`, `_wiki/`, vault layout, frontmatter) and configuration (`.obsidian/` with 6 plugins, Templater templates, Web Clipper templates), but does *not* ship a specific AI agent runtime. Users layer Claude Code or Cursor on top; the convention works with all of them.
2. **IndieKit removed; Micropub becomes opt-in.** Obsidian Git is the headline publish flow. IndieAuth via indielogin.com is always-on (zero code, pure markup). Micropub is opt-in via `features.micropub: false`, implemented via `@benjifs/micropub` library + per-host adapters.
3. **Feature-flag everything.** Post types, wiki publishing, Micropub server, footer activity widget — all toggled in `features.yaml`. Default state ships a sensible non-developer starting point; flags add depth on demand.

### Architecture stack

| Layer | Choice | Rationale |
|---|---|---|
| Site generator | Eleventy 3.x | Inherited from JEDEE/EE |
| Structural base | JEDEE clone, scrubbed of personal content | JEDEE is the structural authority per memory note |
| Authoring (default) | Obsidian + Obsidian Git + Obsidian Web Clipper | Non-developer mission |
| Authoring (alt) | Direct `.md` edit + git, plus Micropub clients via opt-in flag | IndieWeb protocol citizenship |
| IndieAuth | indielogin.com (hosted, zero code) | Free, maintained by Aaron Parecki |
| Micropub | `@benjifs/micropub` library + per-host adapters, opt-in | Host-agnostic (Netlify / Cloudflare Pages / Vercel) |
| Webmention | webmention.io polling via `@11ty/eleventy-fetch` | Unchanged from plan §5 |
| PWA | Vendored `workbox-build.generateSW` via `eleventy.after` | Unchanged from plan §6 |
| Design tokens | JEDEE's DTCG-conformant system, 11 token files, 3 surfaces | Already ported in Phase D |
| AI substrate | `AGENTS.md` + `_raw/` + `.gitignore` patterns for agent state | Tooling-agnostic Karpathy pattern |

---

## §2 — Repository Structure

### Top-level layout

```
indiee/
├── eleventy.config.js
├── package.json                # @benjifs/micropub + @benjifs/github-store added; @indiekit/* gone
├── netlify.toml
├── vercel.json
├── netlify/functions/micropub.js    # ~10 lines, gated by features.micropub
├── functions/micropub.js            # Cloudflare Pages adapter, same shape
├── api/micropub.js                  # Vercel adapter, same shape
├── AGENTS.md                   # NEW — Karpathy schema file, agent-legible
├── CLAUDE.md                   # NEW — Claude Code-specific, delegates to AGENTS.md
├── ROADMAP.md                  # revised M11 wording (see §11)
├── readme.md                   # reframed: Obsidian + Web Clipper headline
├── CHANGELOG.md
├── DESIGN.md                   # generated by build-design-md.js (unchanged)
├── tokens/                     # DTCG export surface (unchanged)
├── _generated/                 # gitignored; specs, handoffs, working plan
└── src/                        # = the Obsidian vault root
```

### `src/` — the vault

```
src/
├── .obsidian/                  # vault config; 6 plugins; scrubbed of Johan-specifics
│   ├── app.json
│   ├── community-plugins.json
│   ├── plugins/
│   │   ├── obsidian-git/
│   │   ├── templater-obsidian/
│   │   ├── frontmatter-modified-date/
│   │   ├── obsidian-filename-heading-sync/
│   │   ├── obsidian-local-images-plus/
│   │   └── periodic-notes/
│   └── workspace.json          # reset to default layout
│
├── _config/                    # Eleventy config (modular per EE convention)
├── _data/
│   ├── meta.js
│   ├── personal.yaml           # template defaults; user fills in
│   ├── navigation.js
│   ├── features.yaml           # NEW shape — see §8
│   ├── webmentions.js
│   ├── builtwith.json
│   └── designTokens/           # 11 DTCG token files (from JEDEE port)
│
├── _includes/
│   ├── css/
│   ├── head/
│   │   ├── meta-info.njk
│   │   ├── preloads.njk
│   │   ├── indieweb.njk        # indiee re-layer
│   │   └── pwa.njk             # indiee re-layer
│   ├── partials/
│   │   ├── header.njk
│   │   ├── footer.njk          # uses recent-activity.njk when flag on
│   │   ├── h-card.njk          # indiee
│   │   ├── webmentions.njk     # indiee
│   │   ├── backlinks.njk       # JEDEE port (now also serves wiki layer)
│   │   ├── feed-atom.njk
│   │   ├── feed-json.njk
│   │   ├── archive-list.njk
│   │   ├── recent-activity.njk # NEW — used by Now page + footer
│   │   ├── respond-on-your-site.njk
│   │   └── …
│   ├── schemas/                # 7 schema.org JSON-LD templates (indiee)
│   ├── scripts/
│   └── webc/                   # 6 WebC components from EE (unchanged)
│
├── _layouts/                   # ONLY 4 — Johan-specific layouts dropped
│   ├── base.njk
│   ├── page.njk
│   ├── post.njk                # single layout, all 16 post types (JEDEE-authority memory)
│   └── wiki.njk                # NEW — /wiki/ entries (gated by features.wiki)
│
├── _obsidian/                  # Obsidian-only scaffolding (Eleventy skips _*)
│   ├── _templates/             # 7 Templater templates
│   │   ├── note.md
│   │   ├── article.md
│   │   ├── photo.md
│   │   ├── audio.md
│   │   ├── event.md
│   │   ├── wiki.md
│   │   └── daily-note.md
│   └── clipper/                # 9 Web Clipper template JSON files
│       ├── bookmark.json
│       ├── like.json
│       ├── reply.json
│       ├── repost.json
│       ├── rsvp.json
│       ├── read.json
│       ├── watch.json
│       ├── jam.json
│       └── raw.json
│
├── _raw/                       # Karpathy raw layer (Eleventy skips _*)
│   ├── .gitkeep
│   └── assets/                 # paste/clip images via local-images-plus
│
├── assets/                     # CSS, fonts, images, scripts, svg
│   ├── css/
│   │   ├── global/
│   │   │   ├── base/
│   │   │   ├── blocks/         # includes webmentions.css, install-prompt.css
│   │   │   ├── compositions/   # cover, frame, reel, switcher (indiee adds)
│   │   │   └── utilities/
│   │   ├── components/         # JEDEE addition
│   │   └── local/
│   ├── fonts/source-serif/     # Source Serif 4 (JEDEE Phase D)
│   ├── fonts/source-sans/      # Source Sans 3 (JEDEE Phase D)
│   ├── fonts/source-code-pro/  # Source Code Pro (JEDEE Phase D)
│   ├── images/
│   │   ├── favicon/            # template defaults (indiee branding)
│   │   └── og-images/
│   ├── scripts/
│   └── svg/
│
├── common/                     # site-wide outputs at root
│   ├── 404.md
│   ├── feed-atom.njk
│   ├── feed-json.njk
│   ├── feeds/                  # per-post-type feeds
│   ├── humans.njk
│   ├── og-images.njk
│   ├── site-manifest.njk
│   └── pa11y.njk
│
├── docs/                       # indiee user docs (auto-rendered by /get-started/)
│   ├── post-types.md           # all 16, µf2 mapping + clipper hints
│   ├── vault.md                # Obsidian-as-vault, frontmatter conventions
│   ├── ai-wiki.md              # how to layer Claude Code / Cursor / Aider
│   ├── micropub.md             # how to enable + env vars + adapter selection
│   ├── webmentions.md
│   ├── pwa.md
│   ├── design-tokens.md
│   ├── clipper.md              # Web Clipper template import walkthrough
│   ├── wiki.md                 # how to use src/wiki/, what gets published
│   └── what-add.md             # inverted from what-delete.md (M11 framing)
│
├── pages/
│   ├── home.md
│   ├── about.md
│   ├── now.md                  # NEW — dynamic; uses recent-activity partial
│   ├── colophon.md
│   ├── offline.md
│   ├── tags.njk
│   ├── archives.njk
│   └── get-started.md          # EE-inherited; renders src/docs/ collection
│
├── posts/                      # all 16 post types
│   ├── notes/                  # default-on
│   ├── articles/               # default-on
│   ├── photos/                 # default-on
│   ├── replies/                # default-on
│   ├── likes/                  # default-on
│   ├── bookmarks/              # default-on
│   ├── watches/                # default-on
│   ├── reads/                  # default-on
│   ├── jams/                   # default-on
│   ├── audio/                  # default-off
│   ├── reposts/                # default-off
│   ├── events/                 # default-off
│   ├── rsvps/                  # default-off
│   ├── recipes/                # default-off — NEW
│   ├── checkins/               # default-off — NEW
│   └── quotations/             # default-off — NEW
│
└── wiki/                       # NEW — published wiki layer (features.wiki gates)
    ├── _index.md               # entry point (LLM-maintained when wiki is on)
    └── .gitkeep
```

### Key structural changes vs. plan §3

- `src/` IS the vault. `src/.obsidian/` is committed (scrubbed of Johan-specifics).
- `src/_obsidian/` holds non-Obsidian-config scaffolding (Templater + Web Clipper templates). Eleventy skips underscore-prefix.
- `src/_raw/` is a top-level convention (not under `posts/`). Karpathy raw layer.
- `src/wiki/` is top-level alongside `src/posts/`. Two parallel content systems.
- Three Micropub adapter files at repo root in the platform-conventional locations.
- `AGENTS.md` + `CLAUDE.md` at repo root.
- `indiekit.config.js` removed entirely.
- `src/docs/indiekit.md` replaced by `src/docs/micropub.md`.
- `src/docs/what-delete.md` → `src/docs/what-add.md`.
- 16 post-type folders (recipe, checkin, quotation added).
- Only 4 layouts (Johan-specific `listening.njk`, `note.njk`, `pageIndex.njk`, `reading.njk` dropped).

---

## §3 — Post Types Catalog

### The 16 types

| Type | Default | µf2 root | Primary authoring | Key type-specific fields |
|---|---|---|---|---|
| **note** | on | h-entry | Templater | name?, content |
| **article** | on | h-entry | Templater | name, summary, content |
| **photo** | on | h-entry | Templater | photo, photoWidth, photoHeight |
| **reply** | on | h-entry | Web Clipper | in-reply-to, content |
| **like** | on | h-entry | Web Clipper | like-of |
| **bookmark** | on | h-entry | Web Clipper | bookmark-of, name, summary |
| **watch** | on | h-entry / h-review¹ | Web Clipper | watch-of, rating? |
| **read** | on | h-entry / h-review¹ | Web Clipper | read-of, rating? |
| **jam** | on | h-entry | Web Clipper | listen-of |
| **audio** | off | h-entry | Templater | name, audio[], duration |
| **repost** | off | h-entry | Web Clipper | repost-of, content? |
| **event** | off | h-event | Templater | name, start, end, location |
| **rsvp** | off | h-entry | Web Clipper | in-reply-to (event url), rsvp |
| **recipe** | off | **h-recipe** | Templater + Web Clipper² | name, ingredient[], instructions[], yield, duration, summary |
| **checkin** | off | h-entry + nested h-card | Web Clipper | checkin (h-card: name, latitude, longitude, locality, region, country-name), syndication |
| **quotation** | off | **h-cite** | Web Clipper | quotation-of (h-cite: author, name, url), content |

¹ Watch and Read upgrade to `h-review` automatically when a `rating` frontmatter key is present.
² Recipe is the only type with two authoring origins: Web Clipper for "I clipped this from a website"; Templater for "I'm writing my own from scratch."

### Decisions made vs. plan §4

- **Repost kept** as distinct type. Not folded into reply.
- **RSVP demoted to default-off.** Conference speakers / HWC types flip it on.
- **Audio demoted to default-off.** Differentiation from Jam: Audio = own uploaded media file; Jam = "listening to someone else's track."
- **Watch + Read promoted to default-on.** Letterboxd / Goodreads refugees are core audience.
- **Recipe / Checkin / Quotation added.** All ship sample posts in `src/posts/<type>/` marked `draft: true`.

### Web Clipper URL pattern matching (M14 work, lands Phase 2e)

| Source URL pattern | Auto-routes to type | Auto-fills |
|---|---|---|
| letterboxd.com/film/* | watch | watch-of, name, year, poster |
| imdb.com/title/* | watch | watch-of, name, year |
| themoviedb.org/movie/* | watch | watch-of, name, year, poster |
| goodreads.com/book/* | read | read-of, name (h-cite: author) |
| openlibrary.org/works/* | read | read-of, name (h-cite: author) |
| bandcamp.com/track/* | jam | listen-of, name (h-cite: artist) |
| last.fm/music/*/_/track | jam | listen-of, name (h-cite: artist) |
| *.mastodon.* / *.social/@*/* | reply *or* repost | in-reply-to / repost-of |
| (any URL, default) | bookmark | bookmark-of, name, summary |
| (any URL, user-chosen) | raw | (lands in `src/_raw/`) |

### Per-post-type feeds

Every type (default-on or off) gets `/posts/<type>/feed.xml` and `/posts/<type>/feed.json`. Default-off types build feeds only when their flag flips on.

### Shared frontmatter contract (all types)

```yaml
---
title: ""              # Eleventy + µf2 p-name; required for some types, optional for others
date: 2026-05-17       # µf2 dt-published
modified: 2026-05-17   # auto-bumped by frontmatter-modified-date plugin
type: note             # MUST match folder name
draft: true            # default-true for new posts; flip to publish
tags: []               # µf2 p-category
syndication: []        # u-syndication targets
location: ""           # optional context; required for checkins

# Featured image (optional, types with prose bodies — article/note/reply/etc.)
image: ""              # absolute path (EE convention)
alt: ""                # WCAG alt text — REQUIRED whenever image is set
credit: ""             # optional attribution

# Multi-image gallery (any type; uses EE's <dialog>-based lightbox)
gallery:
  - image: ""
    alt: ""            # required per image
    caption: ""        # optional context (NOT a substitute for alt)
---
```

Photo post type uses `photo:` (not `image:`) — matches the µf2-property-name-as-frontmatter-key pattern (mirrors `watch-of`, `read-of`, `listen-of`, `bookmark-of`, `like-of`, `repost-of`, `in-reply-to`).

### §3a — Accessibility considerations

1. **Alt text is structurally enforced for image-bearing types.**
   - `photo:` and `gallery[].image` — `alt` is **required**. Build fails (or warns loudly) if `photo:` is set without `alt:`.
   - `image:` (featured image on other types) — `alt:` required when `image` is set. Empty string acceptable for purely decorative images, but the field must be present.
   - Implementation: `_config/filters/validate-image.js` runs during the build event chain, raises with a clear "post X is missing required alt:" message.

2. **Caption ≠ alt.** Sample posts and Templater templates make this distinction explicit so non-developers don't duplicate one as the other.

3. **Web Clipper templates clip source alt by default.** All 9 templates extract the `alt` attribute from clipped `<img>` tags. If the source page lacks alt, the template prompts the user before saving.

4. **µf2 markup invisible to readers stays visible to screen readers.** Hidden microformat data uses `<data class="p-foo" value="...">` for machine-only content; never inside `visually-hidden` containers that mislead AT users.

5. **Webmentions: visual order = DOM order.** No `flex-direction: row-reverse`.

6. **Pa11y wiring extended for the 16 types.** `meta.js → tests.pa11y.customPaths` includes the archive page for each default-on type. Default-off types' archives don't build in production. `pa11yIgnore` per-template for known µf2-triggered false positives.

7. **Heading hierarchy.** Title = h1. Body sections start at h2. Templater templates pre-place an h2 placeholder.

8. **Skip link, lazy loading, native dialog, focus management** — all inherited from EE base.njk + drawer-nav + gallery patterns.

9. **Now page is screen-reader-friendly.** Recent-activity partial renders a real `<ul>`/`<li>`, not styled-flexbox-grid-pretending-to-be-a-list. Each item has post title, post type as explicit text label (not just icon), and date. Optional icons are decorative (`aria-hidden="true"`).

---

## §4 — Vault layer

### `.obsidian/` shipped config

The vault config is committed to `src/.obsidian/` after scrubbing JEDEE's Johan-specifics (open tabs, personal tags, Johan-shaped hotkeys, vault-nickname plugin output).

**The 6 plugins:**

1. **Obsidian Git** — auto-commit + push. Default config: commit every 10 minutes if there are changes, push on commit. The publish flow.
2. **Templater** — post-type templates. Default config: templates folder = `src/_obsidian/_templates/`. Trigger on file creation in `src/posts/<type>/` to apply the matching template.
3. **frontmatter-modified-date** — auto-update `modified:` field on save. Format: ISO 8601.
4. **obsidian-filename-heading-sync** — keep H1 ↔ filename. Supports the `nice-permalinks` kebab-case URL pattern.
5. **obsidian-local-images-plus** — paste/clip images land in `src/_raw/assets/`. Auto-rename to kebab-case.
6. **Periodic Notes** — daily notes. Default config: daily-note folder = `src/posts/notes/`, daily-note template = `src/_obsidian/_templates/daily-note.md`.

**Workspace defaults:**
- Single editor pane open on `README.md` or `src/pages/home.md`.
- File explorer in left sidebar.
- Search + tags in right sidebar.
- No custom hotkeys beyond plugin defaults.
- Default theme (no AnuPpuccin / Atom / Obsidianite from JEDEE).
- Default appearance settings (no custom CSS snippets unless we ship some — none planned).

### Templater templates (7)

Stored at `src/_obsidian/_templates/`. Each is a `.md` file with Templater syntax + YAML frontmatter scaffold.

- **note.md** — minimal frontmatter, body starts with `<% tp.file.cursor() %>`.
- **article.md** — frontmatter with title/summary prompts; body starts with `## ` placeholder (h2 to satisfy heading hierarchy a11y).
- **photo.md** — frontmatter prompts for `photo:` path + `alt:` (alt required, validated at build time).
- **audio.md** — frontmatter prompts for audio file path + duration.
- **event.md** — h-event frontmatter (name, start, end, location).
- **wiki.md** — wiki-layer page. Frontmatter: `title`, `created`, `tags`, `links: []` (for explicit cross-references the LLM can update).
- **daily-note.md** — Periodic Notes integration. Frontmatter: `date`, `type: note`. Body: prompt-style placeholders ("what happened today", "what I'm grateful for", optional).

### Web Clipper templates (9)

Stored at `src/_obsidian/clipper/` as `.json` files in Obsidian Web Clipper's native export format.

- **bookmark.json** — any URL → `src/posts/bookmarks/`. Fills `bookmark-of`, `name`, `summary`.
- **like.json** — any URL → `src/posts/likes/`. Fills `like-of`.
- **reply.json** — Mastodon-shaped URL → `src/posts/replies/`. Fills `in-reply-to`, prompts for `content`.
- **repost.json** — Mastodon-shaped URL → `src/posts/reposts/`. Fills `repost-of`.
- **rsvp.json** — event URL → `src/posts/rsvps/`. Fills `in-reply-to`, prompts for `rsvp` value (yes/no/maybe/interested).
- **read.json** — Goodreads/OpenLibrary URL → `src/posts/reads/`. Fills `read-of` (h-cite with author).
- **watch.json** — Letterboxd/IMDB/TMDB URL → `src/posts/watches/`. Fills `watch-of`.
- **jam.json** — Bandcamp/Last.fm URL → `src/posts/jams/`. Fills `listen-of`.
- **raw.json** — any URL → `src/_raw/<slug>.md`. Full article extraction, image downloads to `src/_raw/assets/`. Karpathy ingest landing.

### Setup helper script

`npm run setup:obsidian` — prints `obsidian://web-clipper/import?url=https://<deploy>/clipper/<name>.json` lines for each of the 9 templates, so a non-developer doesn't have to manually navigate to 9 JSON files. Reads `meta.url` from `_data/meta.js`.

---

## §5 — Wiki layer

### The Karpathy three-layer pattern

| Layer | Path | Purpose | Who writes |
|---|---|---|---|
| Raw | `src/_raw/` | Immutable source material (clipped articles, transcripts, research notes) | Web Clipper, user manually, LLM never modifies |
| Wiki | `src/wiki/` | LLM-maintained interlinked pages (summaries, entity pages, concept pages, comparisons) | LLM (with user oversight) |
| Schema | `AGENTS.md` (repo root) | Instructions for the LLM on how to ingest, maintain, lint | User + LLM co-evolve |

### Raw layer (`src/_raw/`)

Always available. Eleventy skips underscore-prefix → never published. Default state ships with `.gitkeep` and a `src/_raw/assets/` subfolder for local-images-plus output. Sample content: one demo `src/_raw/welcome-to-raw.md` file explaining the Karpathy pattern.

### Wiki layer (`src/wiki/`)

Feature-flagged via `features.wiki: false` by default.

When `features.wiki: true`:
- `src/wiki/*.md` builds to `/wiki/<slug>/`.
- `_layouts/wiki.njk` renders the page with backlinks block at the bottom (port of JEDEE's `_includes/partials/backlinks.njk`).
- Wikilinks resolve cross-vault: `[[Some Post Title]]` works between `src/posts/*` and `src/wiki/*`.
- `/wiki/` index page lists all wiki entries (chronological or alphabetical, configurable).
- Wiki entries appear in main nav as a top-level "Wiki" item (gated by the flag).

When `features.wiki: false`:
- `src/wiki/` folder still exists but builds to nothing.
- Wikilinks pointing into wiki pages from posts resolve to the post body (broken link warning at build time, configurable).
- No `/wiki/` URLs in sitemap, no nav entry.

### What does NOT ship

- **Graph view.** The interactive-JS-graph-on-the-public-site is a Tolstoy-research differentiator. indiee gets backlinks (server-side render only) but no graph viz.
- **Dataview queries.** Mentioned in Karpathy doc but optional; users who install Dataview plugin separately get its benefit, but indiee doesn't ship Dataview-aware templates.
- **`qmd` search engine.** Mentioned in Karpathy doc as optional CLI; out of scope for v1. Users who want it install separately.

### Wikilink resolver

Already shipped via JEDEE Phase B port (commit `cfbe3f2 feat(posts): wikilinks + clean slugs for Obsidian-sourced filenames`). The reboot preserves this. The resolver handles:
- `[[Title]]` → resolves to a post or wiki page with matching `title:` frontmatter
- Kebab-case URL generation: `[[Alexandra Tolstaya]]` → `/wiki/alexandra-tolstaya/`
- Cross-folder resolution: post body can link to wiki page and vice versa

### Sample wiki page

Ships `src/wiki/index.md` (no underscore — Eleventy publishes it as `/wiki/`) as the canonical wiki landing. Contains:
- Brief explainer of what the wiki is
- Pointer to `AGENTS.md` for "how the LLM maintains this"
- Empty `## Recent additions` section the LLM populates over time
- Empty `## Topics` section organized by category (per Karpathy's catalog pattern)

The LLM-maintained chronological log lives at `src/wiki/_log.md` (underscore-prefix = Eleventy-skipped, LLM-internal scratch — see §6 workflow).

---

## §6 — AI substrate

### `AGENTS.md` at repo root

Provider-neutral schema file. Tells any agent runtime where the vault lives and what conventions to follow. **Layout + conventions only — workflows (ingest/query/lint) live in `src/docs/ai-wiki.md` so users can edit them without touching the schema file.**

Content outline (thin version):

```markdown
# AGENTS.md

## Project overview
indiee is an Obsidian-first IndieWeb site template. The repo doubles as a
Karpathy-style LLM wiki vault.

## Vault layout
- `src/posts/<type>/` — published posts, 16 types (see src/docs/post-types.md)
- `src/wiki/` — published wiki (feature-flagged, see features.yaml)
- `src/wiki/_log.md` — LLM-internal chronological log (Eleventy-skipped)
- `src/_raw/` — immutable raw source material; the LLM reads but never modifies
- `src/_obsidian/_templates/` — Templater templates the user invokes from Obsidian
- `src/pages/`, `src/docs/` — static template content

## Conventions
- Frontmatter: see src/docs/post-types.md for type-specific fields
- Wikilinks: `[[Title]]` resolves cross-vault between posts and wiki
- All images need alt text (build fails without)
- Drafts: `draft: true` in frontmatter

## Don't
- Don't modify `src/_raw/` (immutable source)
- Don't write to `src/posts/<type>/` without user approval (those are user-authored posts)
- Don't bypass the alt-text validation
- Don't add Dataview queries (not shipped)
- Don't add wikilinks from `src/wiki/*` into `src/posts/*` without user approval —
  wikilinks within `src/wiki/*` are fine (the wiki is the LLM's working surface).

## Workflows
See `src/docs/ai-wiki.md` for ingest / query / lint workflow recipes. Workflows
are user-editable docs, not schema — adapt them to your agent and your habits.
```

### `CLAUDE.md` at repo root

Claude Code-specific. ~10 lines. Delegates everything to AGENTS.md to avoid duplication. Format:

```markdown
# CLAUDE.md

This project follows the conventions documented in [AGENTS.md](./AGENTS.md). Read
that first for vault layout and conventions. See src/docs/ai-wiki.md for
ingest/query/lint workflow recipes.

Claude Code specific:
- Always run `npm run build` before claiming a publish-related change works
- Image validation runs at build time; if it fails, fix alt text rather than
  bypassing the validator
```

### `.gitignore` additions

For agent state that should never enter the published site repo:

```gitignore
# Agent runtime state
.claude/
.cursor/
.aider*
.aider*/
.continue/

# Wiki working files (LLM scratch)
src/wiki/.cache/
src/wiki/_drafts/

# Karpathy raw assets — local images via local-images-plus
# (assets ARE committed; this is intentional — sources should be reproducible)
# But cache files from clipping aren't:
src/_raw/.tmp/
```

`_generated/` is already gitignored per existing convention.

### `src/docs/ai-wiki.md`

User-facing doc explaining how to layer an agent runtime on top of indiee. **Holds the workflow recipes (ingest / query / lint) so users can edit them without touching `AGENTS.md`.**

```markdown
# AI wiki — how to use it

indiee ships AGENTS.md and a vault structure agents can reason about. It does
NOT ship a specific agent runtime — you choose your own.

## Recommended setups
### Claude Code (Anthropic)
1. `npm install -g @anthropic-ai/claude-code`
2. `cd <your-indiee-clone> && claude`
3. AGENTS.md and CLAUDE.md are auto-loaded.

### Cursor (Anysphere)
1. Install Cursor
2. Open the folder
3. Cursor reads AGENTS.md.

### Aider, Cline, OpenCode
Same pattern — they all read AGENTS.md.

## The Karpathy workflows (defaults — edit to taste)

### Ingest
When you drop a source in `src/_raw/`:
1. Read the source
2. Summarize key takeaways with you
3. Write a summary to `src/wiki/<slug>.md` (or update existing)
4. Update related wiki pages
5. Add an entry to `src/wiki/_log.md` (chronological log)
6. Update `src/wiki/index.md` (catalog)

### Query
When you ask a question:
1. Read `src/wiki/index.md` first
2. Drill into relevant pages
3. Answer with citations to wiki pages and raw sources

### Lint
Periodically:
- Check for contradictions across wiki pages
- Flag stale claims
- Find orphan pages (no inbound wikilinks)
- Suggest missing pages (concepts mentioned but lacking own page)

These workflows are defaults. The contract that survives — vault layout,
frontmatter conventions, the "don't" list — lives in AGENTS.md.
```

---

## §7 — Auth & Micropub

### IndieAuth (always-on)

Zero server code. Pure markup in `_includes/head/indieweb.njk`:

```html
<link rel="me" href="{{ personal.platforms.github }}">
<link rel="me" href="{{ personal.platforms.mastodon }}">
<!-- … other rel=me links from personal.yaml -->

<link rel="authorization_endpoint" href="{{ config.authorizationEndpoint or 'https://indielogin.com/auth' }}">
<link rel="token_endpoint" href="{{ config.tokenEndpoint or 'https://tokens.indieauth.com/token' }}">
{% if features.micropub %}
<link rel="micropub" href="{{ config.micropubPath or '/api/micropub' }}">
{% endif %}
<link rel="webmention" href="https://webmention.io/{{ meta.url | webmention_domain }}/webmention">
```

The three `config.*` keys (`authorizationEndpoint`, `tokenEndpoint`, `micropubPath`) ship in PR 2f — see §8 + §10. **In Phase 1 the markup hardcodes the defaults**; PR 2f adds the override-via-config plumbing.

User's `h-card` in `partials/h-card.njk` includes the rel-me links so the auth flow has identity-proof targets.

### Micropub (opt-in via `features.micropub: false`)

**Library**: `@benjifs/micropub` (npm package; host-agnostic).
**Storage**: `@benjifs/github-store` (commits posts to repo via GitHub API).

Three adapter files, each ~10 lines:

**netlify/functions/micropub.js**
```js
import MicropubEndpoint from '@benjifs/micropub'
import GitHubStore from '@benjifs/github-store'

const { ME, TOKEN_ENDPOINT, GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO } = process.env

const micropub = new MicropubEndpoint({
  store: new GitHubStore({ token: GITHUB_TOKEN, user: GITHUB_USER, repo: GITHUB_REPO }),
  me: ME,
  tokenEndpoint: TOKEN_ENDPOINT,
  contentDir: 'src/posts',
  mediaDir: 'src/assets/images',
  translateProps: true,
})

export const handler = async (event) => {
  const req = new Request(event.rawUrl, { method: event.httpMethod, headers: event.headers, body: event.body })
  return micropub.micropubHandler(req)
}
```

**functions/micropub.js** (Cloudflare Pages)
```js
import MicropubEndpoint from '@benjifs/micropub'
import GitHubStore from '@benjifs/github-store'

export const onRequest = async (context) => {
  const { ME, TOKEN_ENDPOINT, GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO } = context.env
  const micropub = new MicropubEndpoint({
    store: new GitHubStore({ token: GITHUB_TOKEN, user: GITHUB_USER, repo: GITHUB_REPO }),
    me: ME, tokenEndpoint: TOKEN_ENDPOINT,
    contentDir: 'src/posts', mediaDir: 'src/assets/images', translateProps: true,
  })
  return micropub.micropubHandler(context.request)
}
```

**api/micropub.js** (Vercel)
```js
import MicropubEndpoint from '@benjifs/micropub'
import GitHubStore from '@benjifs/github-store'

const { ME, TOKEN_ENDPOINT, GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO } = process.env

const micropub = new MicropubEndpoint({
  store: new GitHubStore({ token: GITHUB_TOKEN, user: GITHUB_USER, repo: GITHUB_REPO }),
  me: ME, tokenEndpoint: TOKEN_ENDPOINT,
  contentDir: 'src/posts', mediaDir: 'src/assets/images', translateProps: true,
})

export default async (req) => micropub.micropubHandler(req)
```

### Env vars (required when `features.micropub: true`)

| Var | Source | Example |
|---|---|---|
| `ME` | meta.js → `meta.url` | `https://example.com/` |
| `TOKEN_ENDPOINT` | always same | `https://tokens.indieauth.com/token` |
| `GITHUB_TOKEN` | user generates fine-grained PAT | `github_pat_…` |
| `GITHUB_USER` | user's GitHub username | `johanedlund` |
| `GITHUB_REPO` | indiee clone repo name | `johanedlund.se` |

`src/docs/micropub.md` walks through PAT creation + Netlify/Cloudflare/Vercel env var setup.

### Post-type support

`@benjifs/micropub` natively supports: article, bookmark, like, listen (= jam), note, photo, play, plus others not fully listed in README. Indiee-specific types (reply, repost, rsvp, event, audio, watch, read, recipe, checkin, quotation) need verification:

- **Likely supported out-of-the-box via translateProps**: reply (`in-reply-to`), repost (`repost-of`), audio
- **Need verification at implementation time**: rsvp, event, watch, read, recipe, checkin, quotation

Implementation phase verifies and either:
1. Configures via `postTypes` option if the library supports per-type routing
2. Forks library (last resort) and contributes upstream PR

### Webmention (unchanged from plan §5)

webmention.io polling via `_data/webmentions.js` with `@11ty/eleventy-fetch` 24h cache. No change.

---

## §8 — Feature flags catalog

### `src/_data/features.yaml`

```yaml
# Wiki layer
wiki: false                  # publish src/wiki/ to /wiki/<slug>/

# Micropub server
micropub: false              # enable the @benjifs/micropub function endpoint

# Footer activity widget
footerActivity: false        # use recent-activity.njk in footer (latest watch/jam/read)

# Post types — each can be toggled independently
postTypes:
  # Default-on (9)
  notes: true
  articles: true
  photos: true
  replies: true
  likes: true
  bookmarks: true
  watches: true
  reads: true
  jams: true

  # Default-off (7)
  audio: false
  reposts: false
  events: false
  rsvps: false
  recipes: false
  checkins: false
  quotations: false
```

### How flags wire

- **Post type flags** drive `<type>.11tydata.js` in each `src/posts/<type>/` folder. When false: `eleventyExcludeFromCollections: true` + `permalink: false` (folder content exists but doesn't build, archive/feed don't generate, nav doesn't include).
- **Wiki flag** drives `src/wiki/wiki.11tydata.js` similarly + adds/removes "Wiki" nav entry via `navigation.js` filter.
- **Micropub flag** controls inclusion of `<link rel="micropub">` in `head/indieweb.njk` (function file always ships but does nothing if flag is off — env vars also need to be set for it to actually work).
- **footerActivity flag** controls inclusion of `recent-activity.njk` in `partials/footer.njk`.

### Why this matters

The flag system is **the** non-developer UX for customizing indiee. Instead of "delete these files to remove this feature" (which requires understanding what each file does), users flip a flag. Plan §7 "feature flags — toggle, don't delete" carries through.

### Configuration vs. flags

`features.yaml` holds **boolean toggles only.** Non-boolean configuration (URL/path overrides — `authorizationEndpoint`, `tokenEndpoint`, `micropubPath`) ships in a sibling `src/_data/config.yaml` introduced in **PR 2f**, not Phase 1. Phase 1's `indieweb.njk` hardcodes the defaults; PR 2f adds `config.*` plumbing.

The longer-term data-file shape (`features.yaml` + `config.yaml` vs. unified `settings.yaml`) is **deferred to a dedicated onboarding-UX session** (see §13.8) — Phase 1 doesn't pre-empt that decision.

---

## §9 — Now page + recent-activity partial

### `src/_includes/partials/recent-activity.njk`

Reusable partial. Renders latest N entries grouped by type, as a real semantic list.

**Params** (passed via Nunjucks `set` or include args):
- `count` (number, default 3) — entries per type
- `types` (array, default `['watches', 'reads', 'jams']`) — collection slugs to query
- `showType` (bool, default true) — render type label per entry

**Rendered shape (a11y-clean):**

```html
<section aria-labelledby="recent-activity-heading">
  <h2 id="recent-activity-heading" class="visually-hidden">Recent activity</h2>
  <ul class="recent-activity">
    <li>
      <span class="recent-activity__type">Watch</span>
      <a href="/posts/watches/…">Title</a>
      <time datetime="2026-05-17">May 17</time>
    </li>
    <!-- … -->
  </ul>
</section>
```

Icons (if added) get `aria-hidden="true"`; type label is the source of truth.

### `src/pages/now.md`

**Phase 1 ships this file as a static placeholder** (`## Currently` only — no partial include yet). PR 2c adds the `## Lately` section + partial:

```markdown
---
title: Now
layout: page
permalink: /now/
---

## Currently

Edit this section with what's on your mind, what you're working on, what's
exciting you. This is the part of your /now page that's about you.

## Lately                              <!-- ADDED IN PR 2c -->

{% include "partials/recent-activity.njk" %}    <!-- ADDED IN PR 2c -->
```

The "Currently" prose block stays user-editable. The "Lately" section auto-updates on every build (once PR 2c lands).

### Methodology constraint (PR 2c)

Markup and CSS for `recent-activity.njk` and any related component **must** follow:

- **every-layout** primitives for layout (Stack, Cluster, Sidebar etc. — see the `every-layout` skill)
- **CUBE CSS** methodology for naming + file structure (see `cube-css` skill)
- **Eleventy Excellent** file organization for partials, blocks, compositions, utilities (see `eleventy-excellent` skill)

These three skills are MANDATORY at PR 2c authoring time. The same constraint propagates to any other partials/components authored in Phase 2.

### LLM-wiki integration (deferred to v1.1+)

Per the brainstorm, the "what's really on your mind currently" version reads from `src/wiki/index.md` or a `#now` tag. Adventurous; not v1.

### Footer integration

When `features.footerActivity: true`, `partials/footer.njk` includes:

```html
{% include "partials/recent-activity.njk" %}
{% set count = 1 %}
{% set types = ['watches', 'reads', 'jams'] %}
```

Tighter `count=1` for the footer's smaller real estate.

---

## §10 — Execution plan

**Approach B (locked):** Phase 1 reboot PR, then incremental feature PRs.

### Phase 1 — Structural reboot (one PR, one session)

Branch `jedee-rebase` off main, sequential commits. **Strategy: filtered-import — indiee's existing IndieWeb files are preserved through the JEDEE import (not deleted then restored).**

| # | Commit | Scope |
|---|---|---|
| 1 | `chore(reset): strip Johan-specific indiee content ahead of JEDEE rebase` | Selective removal: drop indiee's Johan-shaped content (`src/posts/*` test posts, `src/pages/*` Johan pages, `_data/strava.js` if present, Johan-shaped sample data, `assets/images/{avatar,listening,reading}/`), but **preserve** indiee's IndieWeb work (`_data/meta.js`, `_data/personal.yaml`, `_includes/head/{indieweb, pwa}.njk`, `_includes/partials/{h-card, webmentions, …}.njk`, `_includes/schemas/*`, `_data/webmentions.js`, `assets/css/global/blocks/{webmentions, install-prompt}.css`, `common/feeds/*`, `_config/filters/webmentions.js`, etc.). Also clean indiekit residue from any remaining sample content (R16 — Phase 1 exit criterion). |
| 2 | `feat(reset): import JEDEE structural base with overwrite-protection` | ~500 files imported from `~/Projects/JEDEE/` with `--ignore-existing` semantics for preserved indiee files. Exclusions: `.obsidian/` plugins not in the 6-set, JEDEE's `_obsidian/_templates/` (we author fresh), `_raw/`, `__ideas/`, JEDEE's `src/posts/*`, JEDEE's `src/pages/*`, JEDEE blog images, `assets/obsidian/`, `_data/strava.js`, all `.DS_Store`. |
| 3 | `chore(scrub): template-defaults + placeholders for /now/ + /wiki/` | Verify and adjust `_data/meta.js`, `_data/personal.yaml`, `_data/navigation.js`, `common/{404, site-manifest, humans, og-images}.{md,njk}` for template defaults (no `johanedlund.se` / `Johan` / Strava strays in `base.njk`, `header.njk`, `footer.njk`, `meta-info.njk`). Drop Johan-specific layouts (`listening.njk`, `note.njk`, `pageIndex.njk`, `reading.njk`). **Add `src/pages/now.md` placeholder (Currently section only — R10). Add `src/wiki/index.md` placeholder with explainer prose (R1).** |
| 4 | `feat(indieweb): wire preserved IndieWeb partials into JEDEE base.njk` | Connect the preserved indiee files into JEDEE's structure: re-wire `base.njk` to include `_includes/head/{indieweb, pwa}.njk` in `<head>`; ensure `_config/events/build-sw.js`, `_config/utils/post-type-data.js`, `_config/filters/webmentions.js` are loaded by `eleventy.config.js`; verify `_data/{webmentions.js, builtwith.json}` are picked up; ensure schema partials are reachable from `post.njk`. **No restore-from-git needed — preserved files are already in the tree from commit #1's selective strip.** |
| 5 | `feat(template): AGENTS.md + CLAUDE.md + _raw/ + scrubbed .obsidian/ + features.yaml` | Add `AGENTS.md` (thin version — layout + conventions, R3) at repo root. Add `CLAUDE.md` (no memory-path line — R2) at repo root. Add `src/_raw/.gitkeep` + `src/_raw/welcome-to-raw.md` demo. Strip JEDEE `.obsidian/` to the 6 plugins + scrubbed workspace (R0 / Q13.4 itemized per-line at PR time). Update `features.yaml` to new boolean-only shape (wiki/micropub/footerActivity + the 16 post-type flags). Add `.gitignore` patterns for agent state (incl. `.aider*` + `.aider*/` — R6). |
| 6 | `docs(roadmap): revise M11 — IndieKit removed; Micropub opt-in` | Update ROADMAP.md M11 wording per §11. Update v1.1 through-line text. Update CHANGELOG.md (strategy per Q13.7 — resolve before commit). **Surgical README touches only — remove `npm run dev:indiekit` references + IndieKit-as-headline language. Full README rewrite deferred to a separate post-Phase-1 PR (R17).** |

Squash-merge as one PR titled **"JEDEE-base reboot + IndieWeb re-layer (M11)"**.

**Phase 1 exit criteria (R16 — applied to whole PR, not commit #6 alone):**
- `grep -ri indiekit src/` returns nothing
- `npm install` succeeds without any `@indiekit/*` resolution
- `npm run build` produces a working site with `features.micropub: false`
- `src/docs/indiekit.md` is gone; `src/docs/micropub.md` exists (even if stub for now)
- No `johanedlund.se` / `Johan` / Strava string in source

Site builds at end of phase. No new features yet — just structural alignment + new flags + the spec encoded.

### Phase 2 — Feature PRs (one per session)

| PR | Scope | Depends on |
|---|---|---|
| **2a** | 3 new post types (recipe, checkin, quotation): collections + sample posts + µf2 wiring + `<type>.11tydata.js` + entries in `features.yaml` | Phase 1 |
| **2b** | Wiki publishing: `src/wiki/` collection + `_layouts/wiki.njk` + backlinks partial port + `features.wiki` flag wiring + flesh out `src/wiki/index.md` (placeholder lands in Phase 1 — see commit #3) + resolve wikilink-warning configurability (Q13.9) | Phase 1 |
| **2c** | Now page completion: add `## Lately` section to `src/pages/now.md` + author `recent-activity.njk` partial + wire `features.footerActivity` flag. **Methodology constraint: every-layout + cube-css + eleventy-excellent skills MANDATORY** (R11/R14). | 2a + 2b (uses watches/reads/jams collections) |
| **2d** | Templater templates (7 .md files in `src/_obsidian/_templates/`) + Obsidian-config integration | Phase 1 |
| **2e** | Web Clipper templates (9 .json files in `src/_obsidian/clipper/`) + `npm run setup:obsidian` script + `src/docs/clipper.md` | 2a (recipe template needs the type) |
| **2f** | `@benjifs/micropub` + `@benjifs/github-store` deps + 3 adapter files + `features.micropub` wiring + `src/_data/config.yaml` with `authorizationEndpoint` / `tokenEndpoint` / `micropubPath` overrides (R15) + `src/docs/micropub.md` + verification gate (maintenance health, IndieAuth delegation, customisation hooks per ROADMAP M11 pre-impl criteria, token-endpoint currency check per Q13.2) | Phase 1 |
| **2g** | A11y validation filter (`_config/filters/validate-image.js`) + pa11y customPaths extension to 9 default-on archives | Phase 1 |

**Adjacent post-Phase-1 work (separate PRs, not in the 2a–2g sequence):**

- **README rewrite PR** (R17) — full Obsidian + Web Clipper headline rewrite; surgical touches only in Phase 1 commit #6.

Each Phase 2 PR is small (~5–30 files), reviewable in one sitting, ships independently. Order is dependency-shaped.

### What NOT to do

- Don't ship Phase 2 PRs together — defeats the incremental review point.
- Don't touch `package.json` `@benjifs/*` deps until PR 2f (Phase 1 stays scope-minimal).
- Don't write Templater templates by reverse-engineering JEDEE's — JEDEE doesn't have these; indiee authors them fresh.
- Don't auto-enable any flag during reboot. Defaults stay as `features.yaml` documents.

---

## §11 — ROADMAP M11 revision

### Replace M11 section in ROADMAP.md with:

```markdown
### M11 — IndieKit removed; Micropub becomes opt-in feature flag

Default authoring path is **Obsidian + Obsidian Git + Obsidian Web Clipper**.
IndieAuth via [indielogin.com][indielogin] ships always-on (zero code; pure
`<link rel="authorization_endpoint">` markup). Micropub is opt-in via
`features.micropub: false`, implemented via [@benjifs/micropub][benjimp]
library + per-host adapter files (Netlify Functions, Cloudflare Pages
functions, Vercel API routes — ~10 lines each).

Pre-implementation verification of `@benjifs/micropub`:
- Maintenance health (last commit, open-issue volume).
- Post-type coverage for indiee's 16 types — verify reply/repost/rsvp/event/
  audio/watch/read/recipe/checkin/quotation routing via `translateProps` /
  `postTypes` options; fork-and-PR upstream if any are missing.
- Customisation hook for h-recipe / h-cite / h-event roots (non-h-entry types).
- IndieAuth token endpoint compatibility with `tokens.indieauth.com/token`.

If any of these fail, the fallback is a custom Eleventy-aware Micropub
implementation; M12 / M14 / M15 are unaffected by that swap.

**M11 acceptance criteria — IndieKit removed:**

After M11 lands, IndieKit is **gone**. Not contained — gone. The repo contains
no `indiekit.config.js`, no `@indiekit/*` packages in `package.json`
(verifiable: already done per memory note), no IndieKit references in sample
posts, no `npm run dev:indiekit` script.

1. **`grep -ri indiekit` returns no hits** in source code (only allowed in
   CHANGELOG history for the v0.1.0 → v1.1 transition note).
2. **`src/docs/micropub.md`** covers `@benjifs/micropub` setup, env vars, PAT
   creation, and per-host adapter selection.
3. **`src/docs/indiekit.md`** removed entirely (no "how to add IndieKit back"
   doc; the IndieWeb has many Micropub servers — indiee documents one).
4. **README reframe.** Obsidian + Web Clipper is the headline authoring
   story. IndieAuth via indielogin gets a one-paragraph mention.
5. **Sample post audit.** No IndieKit references in any of the 16 sample
   posts.

**Verification:** `grep -ri indiekit src/` returns nothing. `npm install`
succeeds without any `@indiekit/*` resolution. `npm run build` produces a
working site with `features.micropub: false`.

[indielogin]: https://indielogin.com/
[benjimp]: https://github.com/benjifs/micropub
```

### Also update the v1.1 architectural through-line text (top of ROADMAP):

```markdown
The v1.1 architectural through-line:

> Micropub is a protocol, indiekit was one implementation among many, and
> the editor and the endpoint are independent concerns.

This unbundling — and the broader pivot to **Obsidian + Obsidian Git as the
default authoring path** — lets indiee deliver "completely free IndieWeb
site, browser is your CMS, no developer skills required" as a product, not
just a feature stack.
```

---

## §12 — Out of scope / deferred

### Carried forward unchanged from plan §10:

- Multi-author support (single `h-card` in `_data/meta.js`)
- Multi-language i18n
- Newsletter / paid memberships / e-commerce
- Custom admin UI
- Mobile push notifications

### New to v1 out-of-scope:

- **Hosted IndieKit recipes.** v1.1 removes IndieKit; v1.2+ doesn't add it back. Users who want IndieKit's admin UI install it as a third-party tool outside indiee.
- **Wiki graph view.** Tolstoy/website-exclusive (research differentiator). indiee gets server-side backlinks only.
- **Dataview-aware wiki templates.** Karpathy mentions Dataview as useful; we don't ship Dataview-tuned templates. Users add Dataview themselves.
- **`qmd` or any wiki search engine.** Wiki layer relies on `_index.md` catalog + the user's agent's read-tools. v1.2+ candidate if wiki grows past ~hundreds of pages.
- **LLM-wiki Now page integration.** v1.1+. The /now page in v1 reads from collections, not from wiki content.
- **Sub-vault transform pipeline** (`_vault/` → `src/posts/`). v1 keeps `src/` as the vault directly.

### Deferred to v1.1+ (carried from plan §11 + ROADMAP):

- Custom plugins for niche post types
- Native webmention endpoint (replace webmention.io polling)
- Top-level h-feed at `/`
- Migration recipes
- Accessibility hardening beyond pa11y
- Backup/export story (`npm run export`)
- Browser extension (F20)
- Service worker hygiene revisit (F21)

### Deferred to dedicated sessions (added 2026-05-18 review):

- **Onboarding-UX session** — settles `features.yaml` vs. `settings.yaml` data-shape (R18 / Q13.8) AND the AI-assisted onboarding prompt design (Q13.11). Most non-developer users will set indiee up with AI assistance; the template should ship a paste-into-Claude/Cursor/ChatGPT prompt that walks them through install + first publish. Likely landing surface: `src/docs/onboarding-prompt.md` or top of README. Not Phase 1 / Phase 2 scope.
- **README rewrite PR** — full Obsidian + Web Clipper headline rewrite (R17). Phase 1 commit #6 only does surgical touches; the proper rewrite is its own session.

---

## §13 — Open questions for next session

These were not fully closed during the 2026-05-17 brainstorm or the 2026-05-18 review and need user input before / during Phase 1:

1. **`@benjifs/micropub` post-type coverage verification.** Library README lists `article, bookmark, like, listen, note, photo, play` as native types. Indiee needs 16. Verify with a quick implementation spike during PR 2f planning, before committing to the library long-term.
2. **Token endpoint choice.** `tokens.indieauth.com/token` is referenced in benjifs README. Verify it's still the IndieWeb-canonical recommendation as of 2026 (Aaron Parecki maintains it; check last-updated). Fallback: any IndieAuth-spec-conforming token endpoint. Note: R8 makes this configurable via `config.tokenEndpoint`, but the **default** still needs verification.
3. **`AGENTS.md` content draft review.** §6 outlines the thin structure (R3 narrowed scope). First draft happens in commit #5 of Phase 1; user reviews before squash-merge.
4. **`.obsidian/` scrub specifics.** Which JEDEE `.obsidian/` settings/snippets/CSS persist as indiee defaults? List candidates during commit #5 of Phase 1, user picks per-line.
5. **Sample wiki content.** What does `src/wiki/index.md` say on first install? Default-empty with explainer prose (Phase 1 commit #3 placeholder), expanded in PR 2b — user decides at PR 2b time whether to pre-seed sample entries.
6. **Web Clipper template authoring.** None exist yet. PR 2e is greenfield. First draft of `raw.json` for Karpathy ingest should happen first, then post-type-specific templates.
7. **CHANGELOG strategy.** This reboot is a major break from v1's IndieKit-centric architecture. Tag as `v1.1.0-alpha` during reboot, `v1.1.0` once Phase 2 completes? Or stay on `1.1.0-dev` until full Phase 2 ships? **Resolve before Phase 1 commit #6.**

**Added during 2026-05-18 review:**

8. **Data-file shape (`features.yaml` vs. `settings.yaml`).** The URL/path keys deferred to PR 2f need a home. Phase 1 ships `features.yaml` boolean-only; PR 2f adds sibling `config.yaml`. Long-term: defer to a dedicated **onboarding-UX session** before locking. (R18)
9. **Wikilink "broken link warning" configurability.** §5 says wikilinks pointing to wiki pages from posts emit a build-time warning when `features.wiki: false`. Is that warning a configurable flag, a constant, or a fixed log line? Resolve at PR 2b.
10. **README rewrite scope.** Phase 1 only does surgical touches (R17). What's the surgical-edit set vs. what's deferred to the post-Phase-1 README PR? Resolve at Phase 1 commit #6 time.
11. **AI-assisted onboarding prompt.** Most non-developer users will use AI assistants (Claude / Cursor / ChatGPT) to set up indiee. Ship a paste-into-your-AI prompt that walks them through install + first publish. Likely surface: `src/docs/onboarding-prompt.md` or top of README. Groups with Q13.8 in the onboarding-UX session.

---

## Pointers

- Predecessor handoff (Phase D landed): [handoff-2026-05-17-phase-d-and-drift-fix.md](./handoff-2026-05-17-phase-d-and-drift-fix.md)
- Original working plan (now superseded — see §0): [indiee-template-plan.md](./indiee-template-plan.md)
- Karpathy LLM Wiki reference: `/Users/johanedlund/My Agency/llm-wiki.md`
- JEDEE clone source: `/Users/johanedlund/Projects/JEDEE/`
- Public roadmap (M11 wording will be revised — see §11): [ROADMAP.md](../ROADMAP.md)
- Changelog: [CHANGELOG.md](../CHANGELOG.md)
- `@benjifs/micropub` upstream: https://github.com/benjifs/micropub
- `@benjifs/github-store` upstream: https://github.com/benjifs/github-store

---

## §14 — Review redirects (2026-05-18)

Captured during the §4–§13 walkthrough. All redirects have been applied in-place to the spec above; this section is the audit log. Format: **R# — section — change — rationale.**

| # | § | Change | Rationale |
|---|---|---|---|
| **R1** | §5 | Rename `src/wiki/_index.md` → `src/wiki/index.md` (drop underscore). Propagates to §6, §9. | Eleventy skips `_`-prefixed paths; the wiki landing must build to `/wiki/`. |
| **R2** | §6 | `CLAUDE.md` drops the `~/.claude/projects/...` memory-path line. | Path is Johan-specific; would leak into the public template. Claude Code auto-discovers anyway. |
| **R3** | §6 | `AGENTS.md` becomes thin (layout + conventions + don't-list only). Ingest/query/lint workflows move to `src/docs/ai-wiki.md`. | Workflows are user-editable preferences, not the schema contract. Reduces opinionation. |
| **R4** | §6 | Wikilink rule scoped: LLM may freely wikilink **within** `src/wiki/*`; must ask before adding wikilinks **into** `src/posts/<type>/*`. | Original rule contradicted the wiki layer's purpose. Posts are user-authored and stay sovereign. |
| **R5** | §6 | Keep `src/wiki/_log.md` as `_log.md` (Eleventy-skipped). | LLM-internal chronological scratch; not published. The `_` prefix is intentional here. |
| **R6** | §6 | `.gitignore` adds `.aider*/` alongside `.aider*` (catch directories AND files). | `*` glob in `.gitignore` doesn't traverse directories by default. |
| **R7** | §7 | `<link rel="micropub">` path configurable via `config.micropubPath` (default `/api/micropub`). | Different hosts serve functions at different paths (Netlify `/.netlify/functions/...`, Cloudflare `/...`, Vercel `/api/...`). |
| **R8** | §7 | IndieAuth endpoints configurable via `config.authorizationEndpoint` and `config.tokenEndpoint`. | v1 ships hosted-IndieWeb-canonical defaults but lets advanced users self-host. |
| **R9** | §8 | URL/path keys (`micropubPath`, `authorizationEndpoint`, `tokenEndpoint`) deferred to **PR 2f**, in a sibling `src/_data/config.yaml`. Phase 1 `features.yaml` stays **boolean-only**. | Don't pre-empt the onboarding-UX session (Q13.8). Phase 1 hardcodes defaults in `indieweb.njk`. |
| **R10** | §9 | Phase 1 ships `src/pages/now.md` as static placeholder (`## Currently` only). PR 2c adds `## Lately` + partial. | Now page should exist immediately so `/now/` resolves, but the dynamic part depends on PR 2a + 2b collections. |
| **R11** | §9 | `recent-activity.njk` markup + CSS (and any Phase 2 component) must use **every-layout** primitives, **CUBE CSS** methodology, **Eleventy Excellent** file organization. | Methodology constraint applies to all new components, not just this partial. Mandates the three skill invocations. |
| **R12** | §10 | Commit #2 strategy: **filtered-import** (don't overwrite preserved indiee IndieWeb files). Commits #3–#4 become "fill-in" commits, not "restore from git" commits. | Cleaner git history; less prone to commit-ordering bugs. |
| **R13** | §10 | Commit #3 scope expands: add `src/pages/now.md` placeholder + `src/wiki/index.md` placeholder. | Lands the §5 / §9 redirects in the right commit. |
| **R14** | §10 | PR 2c scope includes the methodology constraint from R11. | Reaffirmed at execution-plan level so writing-plans propagates it. |
| **R15** | §10 | PR 2f scope includes `src/_data/config.yaml` with the three URL/path keys (from R7+R8). | Reaffirmed at execution-plan level. |
| **R16** | §11 | §11 acceptance criteria apply to **whole Phase 1 PR**, not commit #6 alone. Indiekit-residue cleanup distributed across commits #1, #3, #5, #6 as semantically appropriate. | "Grep returns empty" is a PR-level check, not a commit-level one. |
| **R17** | §11 | README **full rewrite deferred** to a separate post-Phase-1 PR. Phase 1 commit #6 only does surgical touches (kill `npm run dev:indiekit` references + IndieKit-as-headline language). | Keeps Phase 1 scope tight; README rewrite is its own design problem. |
| **R18** | §12 | Add two deferrals: (1) onboarding-UX session (data-shape + onboarding prompt); (2) README rewrite. | Captures Q13.8 + Q13.11 + R17 at the right "out of scope" altitude. |
| **R19** | §13 | Add Q13.11: AI-assisted onboarding prompt. Most non-dev users will set up indiee with AI help; ship a paste-into-your-AI prompt. | Surfaced during §13 review. Belongs in onboarding-UX session alongside Q13.8. |

### What §14 means for `superpowers:writing-plans`

The writing-plans skill should expand **Phase 1's 6 commits** as drafted in §10 (with R12–R17 applied) into commit-level steps. The 11 open questions (Q13.1–Q13.11) are not blockers — most resolve at PR / commit time. The two genuine Phase-1-blockers are:

- **Q13.4** — `.obsidian/` scrub specifics (resolve at commit #5 authoring time)
- **Q13.7** — CHANGELOG strategy (resolve before commit #6)

Everything else routes to specific Phase 2 PRs or post-Phase-1 work.

---

*Session length: 2026-05-17 long brainstorm (multiple turns) + 2026-05-18 §4–§13 review (10 sections, 19 redirects). §1–§3 interactively user-approved 2026-05-17. §4–§13 reviewed and redirected 2026-05-18. Next: invoke `superpowers:writing-plans` to break Phase 1 (§10 commits 1–6) into commit-level steps.*
