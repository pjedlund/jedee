---
description: "Two machine-readable layers with different audiences, and why fifteen of jedee's sixteen post types share one generic JSON-LD envelope."
date: 2026-07-31
---

A terminology point first, because it settles a recurring question: **schema.org is a vocabulary, not a format.** It can be encoded three ways — JSON-LD (a script block of JSON), microdata, or RDFa (both woven into the HTML as attributes). A page emitting JSON-LD in its head is therefore already publishing schema.org metadata, in [the encoding Google recommends](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data). Asking to "add schema.org" to such a page means adding a redundant second encoding with no new consumers; the investment that pays is richer JSON-LD *types*, not another channel.

A page can carry two machine-readable layers at once, describing the same content for two different audiences. [Microformats2](https://microformats.org/wiki/microformats2) classes are read by IndieWeb parsers and webmention receivers; JSON-LD in a `<script type="application/ld+json">` block is read by search-engine crawlers. They overlap heavily and neither replaces the other — mf2 is consumed by software that has to act on the page immediately (a webmention receiver deciding whether an incoming link was a reply or a like), JSON-LD by crawlers deciding how to present a search result later.

The two pull in opposite directions on granularity. The mf2 vocabulary is fine-grained and verb-like, with a distinct property for each kind of response. schema.org's types for written content are coarser, and — this is the practical part — each additional type usually costs a separate template to emit it. Sites therefore tend to converge on one generic envelope for most content and spend a precise type only where a [rich result](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) is actually on offer. A precise type nothing consumes is markup with no reader.

## In jedee

The mf2 layer is fine-grained and per-type — `u-listen-of`, `h-event`, `p-rsvp`. The JSON-LD layer is almost entirely one shape. That asymmetry is deliberate, and it's held in place by one line of template code.

### The include that builds its own path

`src/_includes/head/schema.njk`:

```njk
{% include "schemas/WebSite.njk" %}
{% include "schemas/BreadcrumbList.njk" %}

{% if schema %}
  {%- include "schemas/" + schema + ".njk" -%}
{% endif %}
```

Two blocks on every page — site identity and the breadcrumb trail — then a third assembled by string concatenation from the layout's `schema:` front matter.

⚠ **A `schema:` value with no matching template throws and fails the build.** The path is built from data, so nothing checks it until Eleventy tries to read the file. `schema: VideoPosting` is a one-word edit that looks harmless and stops the build.

Four templates exist: `BlogPosting.njk`, `WebSite.njk`, `BreadcrumbList.njk`, `Event.njk`.

### Fifteen types say BlogPosting

Fifteen of the sixteen layouts declare `schema: BlogPosting`. Not because a jam, a workout and a bookmark are all blog posts, but because that constraint above makes the alternative expensive: a more precise type is not a front-matter change, it's a front-matter change *plus* a new template, landing together or not at all.

The BlogPosting template emits `headline`, `description`, `image`, `datePublished`, `author`, `publisher`, and an `@id`, all from front matter and site metadata. For a title-less post `headline` falls back to the site name:

```njk
"headline": "{{ title or meta.siteName }}",
```

Every spec names the richer type it would eventually like — `ListenAction` embedding a `MusicAlbum` for jams, `ReadAction` embedding a `Book` for reading, `WatchAction` with a `Movie` for watching, `AudioObject`/`VideoObject` for the media types, `SocialMediaPosting` for the responses. None are built. They are a real backlog rather than a vague intention, but each one costs a template.

### Event is the one exception

`event.njk` declares `schema: Event`, and `schemas/Event.njk` exists to match. The reasoning was rich results: Google surfaces event cards from `startDate`, `location` and `eventStatus`, so a real Event type buys something visible that a BlogPosting envelope doesn't.

**Recipe was meant to be the second exception, and isn't.** Its spec argues the case at least as strongly — recipe rich cards surface image, time, yield and ingredients — and specifies a `schemas/Recipe.njk`, noting that the template and the front matter must land in the same change. The template was never written, so `recipe.njk` still declares `schema: BlogPosting`. The constraint held exactly as the spec predicted it would: because the two halves had to ship together, neither shipped.

Two things follow if that's ever picked up. The recipe data is now in the post body rather than front matter (see [[Per-type feeds]]), so a `Recipe.njk` would have to read something the spec assumed would be structured fields. And the template has to be committed before or with the front-matter line — never after.

### Where the two layers disagree

The mf2 layer describes what the post *did* — listened to, replied to, RSVP'd. The JSON-LD layer describes what the post *is* — an article with a headline and a date. For fifteen of sixteen types, the JSON-LD answer is the same one. A search engine therefore sees a fairly flat site; an IndieWeb parser sees the full type system. That's an accepted trade, not an oversight: the mf2 layer is the one that actually feeds something (webmentions), while the JSON-LD payoff is search rich results that only two of the sixteen types could plausibly earn.

Related: [[Anatomy of a post type]] · [[Microformats]] · [[Webmentions]]
