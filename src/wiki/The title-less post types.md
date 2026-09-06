---
description: "Why six of the sixteen post types can be published without a title, and what follows from having no p-name."
date: 2026-07-31
---

Six of the sixteen types can be published without a title: note, and the five response types — bookmark, reply, repost, like, rsvp. This isn't laziness in the schema. In IndieWeb terms a `p-name` is precisely what separates an *article* from a *note*, so a short post that invents a headline is mislabelled at the data level, not just visually.

Everything below follows from having no title.

## No title, no `p-name` — by construction

`entry-header.njk` guards the heading:

```njk
{% if title %}
  <h1 class="p-name">{{ title }}</h1>
{% endif %}
```

Nothing else in the layouts emits `p-name`. So a title-less post has no headline property at all, which is the correct reading for a note or a like, and the guard is the whole mechanism — there is no per-type switch.

## One card for five types

Eleven types have their own card partial. The five response types share `card-response.njk`, which resolves the differences with three lookup tables:

```njk
{% set verbs  = { "bookmark": "Bookmarked", "reply": "In reply to", "rsvp": "RSVP to", "like": "Liked", "repost": "Reposted" } %}
{% set mf2    = { "bookmark": "u-bookmark-of", "reply": "u-in-reply-to", "rsvp": "u-in-reply-to", "like": "u-like-of", "repost": "u-repost-of" } %}
{% set fields = { "bookmark": "bookmarkOf", "reply": "inReplyTo", "rsvp": "inReplyTo", "like": "likeOf", "repost": "repostOf" } %}
{% set target = item.data[fields[cat]] %}
```

With no title to put in the headline slot, the card's headline becomes **a verb plus the target link** — "Bookmarked https://…". The date, not the headline, is what links to the post's own page.

⚠ The card is deliberately **not** `clickable`. `<custom-card>`'s clickable variant stretches a `::after` over the whole card to make one link fill it — but a response card has two genuine destinations, the off-site target and the on-site permalink, and they'd fight over it.

## The frontmatter keys are camelCase, and that is locked

`bookmarkOf`, `inReplyTo`, `likeOf`, `repostOf` — never `bookmark-of`.

**Nunjucks reads a hyphen in a top-level key as subtraction**, so `{{ bookmark-of }}` evaluates a subtraction of two undefined variables rather than reading the field. The IndieWeb property name survives where it actually matters — as the microformats class on the rendered element:

```njk
<p>Bookmarked <a class="u-bookmark-of" href="{{ bookmarkOf }}">{{ bookmarkOf }}</a></p>
```

This also sets a trap at the Micropub end, where the incoming payload uses the hyphenated IndieWeb names and has to be mapped across — see the `micropub` skill.

## Visible anchor, not hidden data

Types that always have a body hide their target in an inert element:

```njk
{% if source %}<data hidden class="u-listen-of" value="{{ source }}"></data>{% endif %}
```

Jam, reading and watching do this — the album notes or the reaction text are the visible content, so the target URL doesn't need to be on the page. The five response types can't: **for a body-less like or bookmark the target URL *is* the content**, and hiding it would leave a page showing nothing but a date. So they render a visible `<a>` carrying the class.

The rule that decides it: *can this type be published with an empty body?* If yes, the target must be visible.

## Two consequences still open

- **Empty `<title>` in the feeds.** `atom-body.njk` emits `<title>{{ post.data.title }}</title>` with no fallback, so a title-less bookmark, reply or rsvp entry syndicates an empty title element. Bookmark, reply and rsvp all have feeds; like and repost don't, which is why this shows up in three types and not five. Whether to compute a fallback (the target's hostname, say) or accept it is unresolved.
- **The URL has nothing but the filename.** With no title, the filename is the only slug source — see [[Permalinks and Obsidian-friendly filenames]]. There's a standing wish to give these types a title anyway for uniform filenames and URLs, which runs straight back into the `p-name` question above: a title that is *displayed* changes the post's IndieWeb kind, a title used only for the filename doesn't.

Related: [[Anatomy of a post type]] · [[Microformats]] · [[Per-type feeds]]
