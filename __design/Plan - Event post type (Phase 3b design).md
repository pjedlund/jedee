# Design increment — Event post type (Phase 3b)

**Date:** 2026-05-22
**Status:** design approved; spec to be written (`__project_docs/event-spec.html`).
**Source of truth:** `_generated/Plan - Phase 3 (10 new post types) - final.md` §"Phase 3b — heavy 5".
**Purpose:** settle the Event type's shape *before* writing its spec, so the spec asserts real
decisions rather than invented detail (the failure mode the Phase 3b handoff warns against).

Event is the fourth heavy-type increment (after Photo, then Audio + Video). It gets its own
increment — it does not share Audio/Video's hosted-media pattern. Recipe is the last, separate
increment after this one.

---

## Grounding (verified against the code, 2026-05-22)

These reads gate the honest framing of the spec:

- **No build-time date-comparison filter exists.** `src/_config/filters/dates.js` holds only
  `toISOString` (dayjs → ISO-8601) and `formatDate` (dayjs format) — **no** "is this date in the
  future" helper. The upcoming/past archive split therefore needs a **new build-time date filter**
  (real to-build work, not config). Verified this session.
- **Collections don't partition.** `src/_config/collections.js` registers each type via
  `byCategory(cat)` → `getFilteredByGlob('./src/posts/**/*.md').filter(category===cat).reverse()`.
  There is no upcoming/past split at the collection level; the partition happens at the **page
  level** in `src/pages/events.njk`, filtering `collections.event` by the new date filter. Verified
  this session.
- **The schema include throws on a missing template.** `src/_includes/head/schema.njk:4` is
  `{% include "schemas/" + schema + ".njk" %}`; only `src/_includes/schemas/BlogPosting.njk` and
  `WebSite.njk` exist (carried from the Audio/Video increment's verified grounding). So
  `schema: Event` **cannot** be set until `schemas/Event.njk` exists — the template and the
  frontmatter must ship together. This is a hard dependency, not a defer.
- **Clone target.** `src/_layouts/watching.njk` — `layout: base`, `entry-header`, a hidden µf2
  `<data>` slot, `.e-content`, `backlinks.njk`, `entry-footer`, the hidden `h-entry` authorship
  div, and a local `{% css %}` block (`post.css` + `footnotes.css`). Same proven base as Photo /
  Audio / Video (described in the Audio/Video increment's grounding).
- **No feed.** Johan's decision (events expire — a perpetual feed is odd). So **none** of the feed
  layer is touched: no `src/feeds/events.*.njk`, no shared-body wrinkle to design, no RSS work.
  This is the first feed-bearing-eligible heavy type to ship feedless.

---

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Layout base | Clone `watching.njk` | Same proven base as Photo / Audio / Video; carries the µf2 `<data>` slot, `.e-content`, hidden h-entry authorship. |
| Permalink | **Title-required** — `/events/{{ page.fileSlug \| slugify }}/index.html` | Plan marks Event title-required. Slug still comes from `page.fileSlug` (shipped convention); `title \| slugify` is the fragile Article-only path TODO.md §2 flags. Title-required = the *type* requires a title (= event name), not that the slug derives from it. |
| Plural namespace | `/events/` (post page + archive) | Matches the shipped `/notes/`, `/jams/` convention. No feed under it. |
| h-event shape | **Nested object** `event: { start, end?, location, url?, status }` + top-level `title` (= `p-name`) + `description` (= `p-summary`) | Groups the event data; matches the Photo/Audio/Video nested-object convention. `title` carries `p-name` (no redundant `event.name`); `description` (existing site-wide field) carries `p-summary` (no new field). |
| Status | schema.org `EventStatusType`: **`scheduled`** (default) · `cancelled` · `postponed` · `moved-online` | Drives both a visible badge and the schema `eventStatus`. Plan: cancelled events stay visible — so status drives the badge but **not** the archive partition (date does). |
| Archive split | **One page, two sections** — Upcoming + Past, partitioned at build time | Johan's call. Single URL, one nav entry. Cancelled events partition by date like any other (always rendered, with a badge). |
| Build-time date filter | **New filter (to-build)** — event is *upcoming* if `end \|\| start >= now(build)`, else *past* | `dates.js` has no comparison helper (verified). "Now" = build time (static site). |
| Card | Bespoke **`card-event.njk`** — date-prominent (day/month badge), title, location, status badge | Plan-given. Not the shared `card-response.njk`. |
| Schema | **Real `schema.org/Event`** as the v1 target — new `schemas/Event.njk` (to-build) | Johan's call — breaks the "BlogPosting v1" pattern the other heavy types set. Event is the strongest rich-results candidate (startDate/endDate/location/eventStatus). The include throws on a missing template, so `schemas/Event.njk` ships **with** `schema: Event`. |
| µf2 h-entry nesting | **Deferred + documented** (same caveat as every type) | Johan's call. Cloning `watching.njk` puts the visible `h-event` outside the only h-entry (hidden authorship div). **Sharper here** — Event is the first type to nest a microformat *root*, not just `u-*` properties — but the fix lands holistically in the webmention milestone, not as a one-off for Event. |
| Feed | **No** | Johan's call — events expire; a perpetual feed is odd. First feedless heavy type. |
| Nav | Add `{ text: 'Event', url: '/events/' }` to the Posts submenu | Substantive content type, not a firehose — discoverable even without a feed (nav inclusion isn't strictly feed-gated). |

---

## Frontmatter → microformats2 / schema mapping

| Frontmatter | µf2 (h-event) | schema.org Event | Notes |
|---|---|---|---|
| `title` | `p-name` | `name` | Required (title-required type). |
| `event.start` | `dt-start` | `startDate` | Required, ISO-8601, rendered via `<time datetime>`. |
| `event.end` | `dt-end` | `endDate` | Optional, ISO-8601. |
| `event.location` | `p-location` | `location` → `Place { name }` | Plain text v1. |
| `event.url` | `u-url` | `url` (or `VirtualLocation { url }` if online) | Optional — signup/canonical link. |
| `event.status` | — | `eventStatus` | `scheduled→EventScheduled`, `cancelled→EventCancelled`, `postponed→EventPostponed`, `moved-online→EventMovedOnline` (+ `eventAttendanceMode: OnlineEventAttendanceMode`). Badge on page. |
| `description` | `p-summary` | `description` | Reuses existing field. |
| (site author) | — | `organizer` | From `personal.yaml`. |

**Schema location rule (v1):** `event.url` present + no `event.location` → `VirtualLocation { url }`;
otherwise `Place { name: location }`. The finer Place-vs-VirtualLocation-vs-hybrid modeling is a gap.

## Layout (`src/_layouts/event.njk`)

Clone `watching.njk`. Render the visible `h-event` block above `.e-content`: `p-name` (title),
`dt-start`/`dt-end` via `<time datetime>`, `p-location`, `u-url`, and the status badge. Keep the
hidden `h-entry` authorship block, `entry-header` / `entry-footer`, and the local `{% css %}` block.
Set `schema: Event` (requires `schemas/Event.njk` — see Grounding).

**µf2 h-entry nesting caveat (deferred, documented — sharper than prior types):** cloning
`watching.njk` puts the visible `h-event` *outside* the only `h-entry` (the hidden authorship div).
Event is the first type to nest a microformat *root*, so a strict mf2 parser sees an orphaned
`h-event` rather than one tied to the post's `h-entry`. Accepted for v1 (webmention sending isn't
wired yet); fixed holistically in the webmention milestone, not as an Event-only one-off.

## Archive (`src/pages/events.njk`)

One page at `/events/`, two sections rendered from `collections.event`:

- **Upcoming** — events whose `end || start >= now(build)`, soonest-first (chronological ascending).
- **Past** — the rest, most-recent-first (descending).

Both lists render `card-event.njk`. Cancelled events sit in their date-determined section with a
"Cancelled" badge — never filtered out. The partition uses the new build-time date filter.

> **Sort note:** `byCategory()` returns `.reverse()` (newest-published first). The Upcoming list
> wants soonest *event date* first, so the page re-sorts by `event.start` ascending after filtering —
> a page-level concern, not a collection change.

## New build artifacts the spec describes (none exist yet — all to-build)

- `src/posts/event/event.json` — data file (`layout: event`, `category: event`, `schema: Event`,
  permalink `/events/{{ page.fileSlug | slugify }}/index.html`).
- `src/_layouts/event.njk` — clone of `watching.njk` + the visible `h-event` block + status badge.
- `addLayoutAlias('event','event.njk')` in `eleventy.config.js`.
- `event` added to `POST_TYPES` in `src/_config/collections.js`.
- `src/pages/events.njk` — single archive with Upcoming + Past sections.
- `src/_includes/partials/card-event.njk` — date-prominent media-less card (day/month badge, title,
  location, status badge).
- `src/_includes/schemas/Event.njk` — **real schema.org Event JSON-LD** (v1 target, not deferred).
  Hard prerequisite for `schema: Event` (the include throws on a missing template).
- **Build-time date filter** in `src/_config/filters/` (e.g. `events.js` exporting `isUpcoming` /
  `isPast`, or a single `eventPhase` helper) — compares `event.end || event.start` to build-time
  `Date`. Registered in `eleventy.config.js` like the other filters.
- `src/_data/navigation.js` — one Posts-submenu entry (`Event` → `/events/`).
- Status-badge + date-badge CSS — small block (likely `src/assets/css/global/blocks/` or a local
  `{% css %}`), to-build. Specs are doc-only; the spec names it as a gap, doesn't write it.
- sample page (`draft: true`) with `event:` frontmatter + a status, so the page + card render.
- **No feed files** (decision).

## Open items the spec marks as gaps (not invented)

- **Build-time date filter exact wiring** — approach named (`event.end || event.start` vs build
  `Date`); boundary handling (does an in-progress event — started, not ended — count as upcoming?
  recommended: yes, until `end`) and exact registration are build details.
- **Structured location** — v1 is plain-text `p-location` + optional `u-url`; `h-card`/`h-adr` and
  full schema `Place`/`VirtualLocation`/hybrid modeling deferred.
- **`schemas/Event.njk` field coverage** — v1 covers `name`/`startDate`/`endDate`/`eventStatus`/
  `location`/`organizer`/`url`/`description`; `offers`, `performer`, `image`, `eventAttendanceMode`
  finer cases deferred.
- **Status-badge / date-badge CSS** — named as to-build; exact tokens/markup a build detail.
- **h-entry nesting fix** — deferred to the webmention milestone (shared caveat, sharper for Event).
