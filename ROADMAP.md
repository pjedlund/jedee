# JEDEE Roadmap — 15 post types

Rollout of JEDEE's 15-type IndieWeb post taxonomy.

- **Canonical spec:** `_generated/Implementing 14 post types - revised.md`
- **Clipper layer design:** `_generated/Step 4 - Clipper layer design.md`

(Both live in `_generated/`, which is gitignored — the working artifacts, not tracked.)

## Two workstreams

- **The rollout (Phases 1–4)** — building the 14 post types into the site.
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
| Clipper layer implementation | Clipper | ⬜ pending — gated behind Phase 3 |
| Spec sync (legacy "Stage A") — fold Clipper decisions into the spec | Housekeeping | ⬜ trivial, do anytime |

## Roadmap (remaining, in order)

1. **Phase 3 — 10 new post types.** Largest remaining chunk. ← we are here
2. **Phase 4 — 10 JSON-LD schema templates** (covers both new and existing types).
   Open decision: fold per-type into Phase 3, or batch after.
3. **Clipper layer implementation** — Web Clipper templates + cover-image setup script.
   Waits until the types exist.
4. **Spec sync** — fold the Clipper design decisions back into the canonical spec. Trivial.

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
