---
description: "What a feed is, why splitting one per category helps subscribers, and how jedee gives fourteen of sixteen post types their own — plus what a feed silently drops."
date: 2026-07-31
---

A feed is a machine-readable list of a site's recent items that a reader application polls for updates — the mechanism for following a site without an account, an algorithm, or anyone's permission. Three formats are in use: [RSS](https://www.rssboard.org/rss-specification), [Atom](https://datatracker.ietf.org/doc/html/rfc4287) (an IETF standard, stricter and more precisely specified), and [JSON Feed](https://www.jsonfeed.org/) (the same idea expressed in JSON). Readers generally accept all three; a site advertises whichever it publishes with a `<link rel="alternate">` in the head.

**One feed or several.** A site publishing several kinds of thing — long articles, short notes, films watched, songs listened to — puts them all in one stream by default, so someone who wanted the essays gets everything else too. Splitting by category is the fix: one feed per type, making subscription a choice about *what* rather than only *whether*. The cost is that no single feed shows everything unless a combined one is published alongside them.

**A feed carries the rendered body, and only the body.** This is the part that catches people out. Structured front matter — a rating, a cover image, a location, an author — is data the page templates read, and a feed template is precisely what *replaces* those templates. Anything that has to reach a subscriber must be in the body text or written into the feed template itself. A post whose meaning lives entirely in its metadata arrives in a reader as a blank entry.

## In jedee

Fourteen of the sixteen post types publish their own feed, so a reader can subscribe to the films without the books. Two publish none, each for its own reason.

### A feed template is five lines

```njk
---
permalink: /photos/feed.xml
eleventyExcludeFromCollections: true
excludeFromSitemap: true
---
{%- set feedCollection = collections.photo -%}
{%- set feedTitle = "Photos" -%}
{%- set feedDescription = "Photographs I've published." -%}
{%- set feedSelfUrl = "/photos/feed.xml" -%}
{%- include "feeds/photo-atom-body.njk" -%}
```

Set four variables, include a shared body. Exactly the shape [[Anatomy of a post type]] describes for archive pages, applied to feeds — the thirty files in `src/feeds/` are all this, and all the actual work lives in nine shared bodies in `src/_includes/feeds/`.

⚠ **The `permalink:` front matter, not the filename, decides the output path.** A feed is almost always made by copying an existing one, and a copy that keeps `permalink: /notes/feed.xml` collides with the real Notes feed and errors the build. Every spec that describes adding a feed repeats this warning, which suggests it has been earned.

### Nine bodies, not one

| Body | Used by |
|---|---|
| `atom-body.njk` / `json-body.njk` | articles, notes, reading, watching, jams, recipes, audio, videos |
| `photo-atom-body.njk` / `photo-json-body.njk` | photos |
| `link-atom-body.njk` / `link-json-body.njk` | likes, bookmarks, replies, rsvps |
| `activity-atom-body.njk` / `activity-json-body.njk` | activities |
| `podcast-body.njk` | audio, videos (at `/podcast.xml`) |

**Audio and video publish two feeds each, in two formats, and the interesting part is which one got the canonical URL.** Podcast clients read RSS 2.0 with `<enclosure url length type>` and the iTunes namespace; Atom and JSON Feed have no equivalent enclosure convention, so the podcast feed is a different format entirely rather than a variation of the shared body. Both formats want `/<section>/feed.xml`, and until 2026-08-10 the podcast feed had it — which was never a decision, only the order things were built in.

The regular Atom feed took it instead, and the podcast moved to `/audio/podcast.xml` and `/videos/podcast.xml`. The reasoning (Johan, 2026-08-10) is about who actually subscribes: a feed reader is how someone follows a *section of a site*, and this site's audio is mostly field recordings rather than episodes of a show. The podcast feed serves a narrower audience through apps that will happily take whatever URL you hand them, because you subscribe to a podcast by pasting a URL once. The generic reader is the one that guesses `/audio/feed.xml`, so that's the one the guessable URL should reward.

The move was free: the podcast feed had never been submitted to a directory — its channel artwork is still the site's OpenGraph default, which is the tell — so nothing anywhere pointed at the old URL. Worth noting the general shape, since a section can only have one canonical feed URL: the format with the *narrower, more deliberate* audience is the one that can afford to move.

⚠ The regular audio and video feeds use the plain shared body, so they syndicate the post's writing and **not the media file**. A subscriber reads about the recording and follows the link to hear it. That's a real limitation and a deliberate one — Atom's `<link rel="enclosure">` and JSON Feed's `attachments` would both carry it, but that needs a body variant, and the podcast feed already does the job for anyone who wants the file itself.

### The wrinkle: a feed only sees the body

Both shared bodies render `post.content` — the markdown body — and **no front-matter fields at all**. Any content a type keeps in front matter is invisible to its feed.

Photo is the type where this bit. A photo post's image lives in `photo:` front matter, so a plain clone of the Notes feed would have syndicated photo entries with no photo in them. Hence the dedicated `photo-atom-body.njk` / `photo-json-body.njk` pair, which renders the image as an absolute-URL `<img>` ahead of the content.

**Activity bit the same way, harder.** An activity's content *is* its recorded numbers — distance, duration, pace, heart rate — and 100 of the 157 posts have no body at all, so a plain clone would have syndicated a hundred entries with a title and nothing else. `activity-atom-body.njk` renders the same stat line the archive card shows, plus the race map cover where there is one, ahead of the body. The JSON pair followed on 2026-08-10: the Atom feed shipped alone for a day, and Atom-only was never a decision so much as the smaller half of the job — every other non-podcast type publishes both, and `activity-json-body.njk` is the same stat line in the JSON Feed shape.

**Recipe is the more interesting case, because the same problem got solved by moving the data instead.** The spec planned a `recipe-body.njk` for exactly this reason: with `ingredients` and `instructions` in front matter, a subscriber would have received the headnote and none of the recipe. That body was never built — and doesn't need to be. The shipped recipe keeps its ingredients and instructions as ordinary markdown in the body, so the plain Atom body syndicates the whole thing. The reason recorded in `recipe.njk`:

```njk
{# Ingredients + instructions live in the note body as markdown (kepano shape) — the Obsidian Web Clipper can't emit a nested `recipe:` object, so a recipe is a body-driven post like every other type. #}
```

The authoring tool decided the data model — see [[Web Clipper templates]] for what it can and can't emit, and [[The authoring tool decides the data model]] for the pattern this is one of three instances of. Because the clipper can't produce nested YAML, the structure moved into the body, and the feed problem dissolved along with it. Worth remembering as a general move: when front-matter structure is fighting the feed, check whether the structure needs to be in front matter at all.

**The link-post cohort is the fourth case, and the biggest.** Likes, bookmarks, replies and RSVPs all used the plain shared body, and a link post's substance is its front matter — a verb, a target URL, an optional description — with the body often empty. **46 of the 50 bookmarks have no body at all**, so the bookmarks feed was fifty entries of a title and nothing: no indication of what had been bookmarked, let alone why. The likes feed had the same flaw on a smaller scale, and that's where it was noticed; the bookmarks number is what made it urgent. Worth noting how it hid — the flaw is invisible from the type you happen to be looking at, because two of four likes reads as an edge case and forty-six of fifty reads as a broken feed.

`link-atom-body.njk` / `link-json-body.njk` render the link line and the description ahead of the body. The wording is copied from each type's layout — "Bookmarked", "Liked", "In reply to", "RSVP: yes to" — so a post reads the same in a reader as it does on its page, which is the rule `activity-atom-body.njk` already follows against the archive card. One body pair for four types rather than four pairs: they're one shape wearing four verbs, and the verb chain lives in a fragment, `link-line.njk`, that both bodies include.

Two details worth keeping. **RSVP must be tested before reply**, because an RSVP post carries `inReplyTo` as well as `rsvp`, so a plain "does it have a reply target" check silently turns every RSVP into a reply. And the fragment deliberately contains **no async shortcode**: it's included inside a `{% set %}` capture inside a `{% for %}`, which is the exact shape the interlinker plugin blanks — clean build, no error, empty feed body. The rule of thumb is that a partial reached through a capture has to stay synchronous.

### The two without a feed

- **Reposts** — a deliberate omission. A repost is a pointer to someone else's writing with nothing added; a feed of them is a low-signal firehose that would arrive in a reader looking like the site had published something. It stays browsable at `/reposts/`; it just isn't pushed.
- **Events** — events expire, so a chronological feed is mostly things nobody can attend any more. And an "upcoming events" feed can't work on a static site: *now* is frozen at build time, so it would only be correct between deploys. If events are ever syndicated it should be an `.ics` calendar feed, not RSS.

**Likes were grouped with reposts until 2026-08-10, and shouldn't have been.** The two look alike in the data — both are a URL plus a title, both come from the link-post cohort — but they differ in what they say. A like is a small judgment: *this was worth something*. A repost is a relay. So a likes feed is a recommendation stream, which is a thing people follow on purpose, and the "low-signal firehose" argument only ever applied to one of the pair. Worth remembering as a way the shared-shape reasoning misleads: two types built from the same fields can still deserve opposite answers, and the field shape is the weaker signal.

Activities was the fourth of the group until earlier the same day, with no decision recorded anywhere — the type with no spec (see [[The activities archive]]), so it turned out to be an omission rather than a choice, and it now has one.

Related: [[The title-less post types]] — title-less entries syndicate an empty `<title>`.
