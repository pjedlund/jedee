# Fable plan — Per-section feeds for the feed-less types (events, likes, reposts, audio, video)

**Goal:** every post-type section exposes the standard `/<section>/feed.xml` (Atom) + `/<section>/feed.json` pair, like reading/watching/jams/etc. already do. Today **events, likes, reposts** have collections and listing pages but no feeds, and **audio/videos** ship only a *podcast* feed squatting on the canonical `feed.xml` URL. Decided by Johan 2026-05-29 (TODO.md §5); never built.

**The one open decision, closed here:** the audio/video URL conflict resolves as **option A** — the regular Atom/JSON pair takes the canonical `/<section>/feed.{xml,json}`, and the podcast feed moves to `/<section>/podcast.xml`. Rationale: `feed.xml` then means the same thing in every section (consistency wins long-term), and the move is free **right now** — the site is in soft-launch behind `noindex`, so no podcast app or feed reader is subscribed to the old URL yet. This is precisely why this plan should run **before** the 1.0.0 go-live (`Fable-plan-go-live.md`); after launch the rename would break real subscribers.

---

## House rules

- Invoke the `indieweb` skill (§5 owns feeds) and `eleventy-excellent` before starting. No CSS in this plan.
- Branch (suggested `feat/section-feeds`), merge `--no-ff` to `main` when green. **Never push.** No `Co-Authored-By` trailer. US English.
- Node 22 via `source ~/.nvm/nvm.sh && nvm use`. Update `TODO.md` §5 + `LOG.md` (gitignored — edit only).

## Mechanism (copy, don't invent)

Every regular feed is a tiny two-part template. The exact model to copy is `src/feeds/reading.xml.njk`:

```njk
---
permalink: /reading/feed.xml
eleventyExcludeFromCollections: true
excludeFromSitemap: true
---
{%- set feedCollection = collections.reading -%}
{%- set feedTitle = "Reading" -%}
{%- set feedDescription = "Books I'm reading." -%}
{%- set feedSelfUrl = "/reading/feed.xml" -%}
{%- include "feeds/atom-body.njk" -%}
```

and its `reading.json.njk` twin (same variables, `feedSelfUrl` ends `.json`, includes `feeds/json-body.njk`). All five collections already exist — `event`, `like`, `repost`, `audio`, `video` are in `POST_TYPES` (`src/_config/collections.js`, registered per-category in `eleventy.config.js`). No collection work is needed.

## Files to create / change

**New — six files, copied from the reading pair:**

| file | permalink | collection | title | description (suggested; Johan may reword later) |
|---|---|---|---|---|
| `src/feeds/events.xml.njk` + `events.json.njk` | `/events/feed.{xml,json}` | `collections.event` | `Events` | `Events I'm hosting or attending.` |
| `src/feeds/likes.xml.njk` + `likes.json.njk` | `/likes/feed.{xml,json}` | `collections.like` | `Likes` | `Things around the web I've liked.` |
| `src/feeds/reposts.xml.njk` + `reposts.json.njk` | `/reposts/feed.{xml,json}` | `collections.repost` | `Reposts` | `Posts by others, shared here.` |

**Renamed — two podcast feeds move off the canonical URL:**

1. `git mv src/feeds/audio.xml.njk src/feeds/audio-podcast.xml.njk`; inside: `permalink: /audio/podcast.xml`, `feedSelfUrl = "/audio/podcast.xml"`. Keep everything else — the `podcast-body.njk` include, the "XML only, on purpose" comment (still true: podcast apps read only XML, a JSON twin would have no readers).
2. Same for `src/feeds/videos.xml.njk` → `videos-podcast.xml.njk`, `permalink: /videos/podcast.xml`.

**New — four regular feeds for audio/videos**, again copied from the reading pair:

| file | permalink | collection | title | description |
|---|---|---|---|---|
| `src/feeds/audio.xml.njk` (recreated as regular) + `audio.json.njk` | `/audio/feed.{xml,json}` | `collections.audio` | `Audio` | keep the current line: `Audio I've published — recordings and episodes.` |
| `src/feeds/videos.xml.njk` (recreated as regular) + `videos.json.njk` | `/videos/feed.{xml,json}` | `collections.video` | `Videos` | keep: `Videos I've published — self-hosted clips and embeds.` |

(Practical order: rename the podcast files FIRST, then create the regular `audio.xml.njk`/`videos.xml.njk` — otherwise the new file collides with the old name.)

## What NOT to do

- **Do not add `<link rel="alternate">` discovery for these feeds in `<head>`.** Per-type feeds are deliberately not auto-discovered — only the firehose `/feed.xml` + `/feed.json` are (`meta.blog.feedLinks`). Consistent with every existing section.
- **Do not link the feeds from the section pages.** No existing section page links its feed; there is no feeds index. Adding one is a separate design idea, not this job.
- **Do not build a JSON twin for the podcast feeds** (deliberate, documented in their comment).
- **Do not touch `podcast-body.njk`, `atom-body.njk`, `json-body.njk`** — the bodies are shared and correct; only thin permalink wrappers are being added.

## Edge cases a weaker model would miss

- **`eleventyExcludeFromCollections: true` + `excludeFromSitemap: true` in every new feed's frontmatter.** Omitting them leaks feed URLs into `collections.posts`/the sitemap (every existing feed carries both).
- **`feedSelfUrl` must exactly match the `permalink`** — it becomes the feed's `rel="self"` link (validators flag a mismatch); it's set per-file, not derived.
- **Likes and reposts may have zero (or nearly zero) published posts** — several sample posts across types are `draft: true` and excluded from production. An empty collection is fine for a feed (unlike the paginated archives, which needed `generatePageOnEmptyData`): the template still renders one file with no `<entry>`s. Verify the built file exists and is well-formed rather than assuming a crash.
- **Grep for stragglers after the podcast rename:** `grep -rn "audio/feed.xml\|videos/feed.xml" src __project_docs` — as of writing only the feed files themselves carry those paths (plus a docstring example in `podcast-body.njk`'s comment — update that example string to `/audio/podcast.xml`). If any doc in `__project_docs/` mentions the podcast URL, reconcile it in the same commit.
- **Sequencing with go-live:** this plan renames a public URL. Run it **before** 1.0.0 (nobody subscribed yet) — or if go-live already happened, STOP and surface the trade-off instead of renaming (option B — podcast keeps `feed.xml`, regular Atom takes a non-standard URL — becomes the safer fallback).
- The audio/video **sample posts are drafts** — a plain production build gives empty audio/video feeds. Use `BUILD_DRAFTS=1 npm run build` for a populated verification pass, but also do a plain `npm run build` to prove the empty case is well-formed.

## Verification

1. `BUILD_DRAFTS=1 npm run build`, then for each of the 8 XML feeds: `xmllint --noout dist/<section>/feed.xml` (and `dist/audio/podcast.xml`, `dist/videos/podcast.xml`) — no errors.
2. Each `.json` feed parses: `node -e "JSON.parse(require('fs').readFileSync('dist/events/feed.json','utf8'))"` etc.
3. Entry counts match the section listing (e.g. count `<entry>` in `dist/events/feed.xml` vs posts on `/events/`).
4. Plain `npm run build`: the likes/reposts (and possibly audio/videos) feeds exist and are well-formed even with zero entries.
5. `grep -rn "audio/feed.xml" dist/audio/podcast.xml` returns nothing (self-link updated); the new `dist/audio/feed.xml` is an **Atom** feed (has `<feed xmlns="http://www.w3.org/2005/Atom">`), the podcast one still RSS 2.0 with iTunes namespace.
6. `npm run test:unit` green.

## Acceptance criteria

1. Ten feed URLs build: `events|likes|reposts|audio|videos` × `feed.xml`+`feed.json`, plus `audio/podcast.xml` + `videos/podcast.xml` — all valid (xmllint / JSON.parse evidence in the run log).
2. None of the new feeds appear in `dist/sitemap.xml` or any collection-driven listing.
3. No `<head>` discovery links added; no section-page links added; shared feed bodies untouched.
4. TODO.md §5 checked off with the option-A decision recorded; LOG.md entry written.
5. Merged `--no-ff` to `main`, unpushed.
