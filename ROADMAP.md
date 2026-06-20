# JEDEE Roadmap — 15 post types

Rollout of JEDEE's 15-type IndieWeb post taxonomy.

- **Authoritative plan:** `__design/Plan - Phase 3 (10 new post types) - final.md` — single source of truth for the rollout.
- **Legacy design reference:** `__design/Implementing 14 post types - revised.md` (superseded on collection mechanism + field naming; kept for design rationale — don't follow its snippets verbatim).
- **Clipper layer design:** `__design/Step 4 - Clipper layer design.md`

(The cited records live in `__design/` (git-tracked); other working artifacts stay in `_generated/`, gitignored.)

## Header & navigation (separate workstream)

- **Header breadcrumb + toggles** — ✅ shipped on `feat/logo-breadcrumb` (breadcrumb left, `breadcrumb` + `hideNav` toggles, always-visible Source Serif H1).
- **Post-type mega-menu nav** — ⬜ **next, design decided 2026-06-18:** `__design/Plan - Post-type mega-menu nav.md`. Replaces the `Posts` submenu with a top-down, two-column mega-menu of all 15 types (icon · name · leader-dots · count); breadcrumb stays; About/Now → footer. Build with `nav-accessible`.
- **Future polish** — view transitions (CSS-only; "JOHAN EDLUND" bloom on returning home), a search affordance + keyboard-shortcuts modal (Ariel Salminen style). See the plan's *Deferred / future*.

## Two workstreams

- **The rollout (Phases 1–4)** — building the 15 post types into the site.
- **The Clipper layer** — how content is captured into the Obsidian vault (Web Clipper
  templates + co-located cover images). Design-complete on paper; implementation is
  deliberately gated *behind* the rollout's Phase 3.

## Status

| Item | Workstream | Status |
|---|---|---|
| Phase 1 — foundation (tag-driven collections, webmention discovery) | Rollout | ✅ shipped |
| Phase 1.5 — hardening (chrome partials, archive consolidation) | Rollout | ✅ shipped |
| Phase 2 — align the 5 existing types (article, note, reading, watching, jam) | Rollout | ✅ shipped |
| Spec audits + Clipper layer design (legacy "Steps 1–4") | Clipper | ✅ design-complete (paper only) |
| Phase 3 — add the 10 new post types | Rollout | ⬜ **next** |
| Phase 4 — add the 10 JSON-LD schema templates | Rollout | ⬜ pending |
| Clipper layer implementation | Clipper | ⬜ pending — gated behind Phase 3; **lighter now** — cover-colocate machinery dropped (see Locked decisions) |
| Spec sync (legacy "Stage A") — fold Clipper decisions into the spec | Housekeeping | ⬜ trivial, do anytime |

## Roadmap (remaining, in order)

1. **Phase 3 — 10 new post types.** Largest remaining chunk. ← we are here
2. **Phase 4 — 10 JSON-LD schema templates** (covers both new and existing types).
   Open decision: fold per-type into Phase 3, or batch after.
3. **Clipper layer implementation** — Web Clipper templates (+ local-images-plus for body images;
   the cover-image setup script is dropped per the lean cover decision). Waits until the types exist.
4. **Spec sync (optional)** — the spec is now a *legacy design reference*; the Phase 3 plan is authoritative. Fold Clipper decisions / the 15-types + camelCase + `byCategory()` reality into it only if you want the reference current.

## The 5 live types

`article` · `note` · `reading` · `watching` · `jam`

## The 10 remaining types (Phase 3)

| Type | Weight | Note |
|---|---|---|
| Bookmark | light | `u-bookmark-of` + commentary; has feeds |
| Like | light | minimal; no title, no feed |
| Reply | light | `u-in-reply-to` + body; has feeds |
| Repost | light | `u-repost-of`; no feed |
| RSVP | light | `u-in-reply-to` + `p-rsvp`; enum→URL JSON-LD |
| Photo | heavy | `u-photo` + gallery opt-in + masonry archive |
| Audio | heavy | podcast RSS 2.0 + enclosure derivation + iTunes ns; creator-side, sibling to Video |
| Video | heavy | self-hosted/embedded video; `u-video`; enclosure-shaped feed; creator-side, sibling to Audio |
| Event | heavy | `h-event` nesting + status badge + upcoming/past archive split |
| Recipe | heavy | `h-recipe` nesting + ISO-8601 durations + structured arrays |

## Vocabulary (to avoid past confusion)

Earlier sessions used overlapping names. Going forward only two survive:

- **Phase N** — the rollout (keep).
- **The Clipper layer** — the authoring work.

Retired: **"Steps 1–4"** (a paper-only design/audit track, now complete) and
**"Stages A/B" / "4.A–4.H"** (a handoff's to-do list for the Clipper work).

## Locked decisions

- **Cover images — build-time fetch only (lean), 2026-05-23.** Store the remote cover/poster
  URL in `cover:`; render a plain `<img src="{{ cover }}">` and let the Eleventy Image HTML
  Transform fetch + optimize + self-host it at build time (proven for Watching, `ae78277`). The
  Step 4 `normalize-posts.js` / `colocate-cover.js` colocate-and-commit apparatus is **dropped**
  (never built); reading/watching/jams stay **flat** (bundles opt-in, only for co-located body
  images). Accepted trade: builds need network on a fetch-cache miss; mitigate with a long
  `cacheOptions.duration`. Field-name normalization survives as a separate, smaller concern. This is
  the **standard hero/cover mechanism for every image-led type**, including the Phase 3b heavy types
  (Photo, Recipe, Event, Audio cover art, Video poster/thumbnail) — the only per-type variation is the
  µf2 class on the `<img>` (decorative for reading/watching/jam; `u-photo` for Photo/Recipe). Full
  pattern + gotchas: `__design/Reference - cover image pattern.md`. See the AMENDMENT block atop
  `__design/Step 4 - Clipper layer design.md`.
- **15 types — accept Video.** Audio is creator-side ("podcasts I host"); Video is its
  symmetric creator-side sibling ("videos I host/embed"). The two are built together in
  Phase 3b. (The "merge into a generic Media type" and "stage Video for v1.1" paths are dropped.)
- **camelCase frontmatter field names** for URL-target properties — `bookmarkOf`, `likeOf`,
  `inReplyTo`, `repostOf`, `rsvp`. Nunjucks can't read hyphenated keys; IndieWeb semantics
  are carried by the µf2 *class* (`u-bookmark-of`), not the frontmatter key. Data files stay
  plain `.json`.

## Deferred / open questions

- **Feature flags** (`src/_data/features.yaml`) — per-type defaults; deferred.
- **Reading state-tracking** (`read-status`/`dateStarted`/`dateFinished`) — deferred pending
  the feed-bump-on-transition decision.
- **Per-type feed pruning** — measure build cost before dropping firehose-y feeds.
- **µf2 verification** — manual spot-check vs CI fetch via indiewebify.me.
- **Option C — remote-aware `{% image %}` shortcode** — **deferred until after Phase 3b (2026-05-23).**
  Would let `article`/`note` heroes (the `image:` field via `entry-header.njk`) accept remote URLs, but it
  touches Lene's **upstream EE** `src/_config/shortcodes/image.js` (fork-maintenance cost); the heavy types
  ship fine on the plain-`<img>` cover pattern meanwhile. Full comparison + the upstream-clean approach
  (wrapper shortcode vs. patching in place): `__design/Reference - cover image pattern.md`.
