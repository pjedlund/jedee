---
title: How webmentions work on this site
description: A dev note on the webmention setup — webmention.io as the receiving endpoint, a build-time fetch in _data, a self-echo filter, Bridgy backfeed from silos, and the facepile/reply-card rendering.
date: 2026-07-05
tags:
  - indieweb
draft: true
---

A [webmention](https://indieweb.org/Webmention) is a small notification one site sends another: "a page over here links to a page over there." This site receives them, but stays fully static — nothing runs on the server. The work is split across three parts: a hosted receiving endpoint (webmention.io), a build-time fetch that pulls the collected mentions into Eleventy's data, and a render partial that shows them at the foot of a post.

## The receiving endpoint

Receiving webmentions requires a live endpoint that other sites can POST to. A static site has none, so [webmention.io](https://webmention.io) acts as the mailbox. Senders discover it through a `<link rel>` tag in the head, in `src/_includes/head/meta-info.njk`:

```html
<!-- Webmention endpoint -->
<link rel="webmention" href="https://webmention.io/johanedlund.se/webmention" />
```

That is the entire receiving side. Mentions accumulate at webmention.io until the next build asks for them.

## The build-time fetch

`src/_data/webmentions.js` fetches the collected mentions from the webmention.io API during the build, so every deployed page is still plain static HTML. It keeps its own cache file (`.cache/webmentions.json`) and fetches incrementally — each build only pulls what arrived since the last one:

```js
async function fetchWebmentions(since, perPage = 10000) {
  if (!domain) {
    console.warn('>>> unable to fetch webmentions: no domain name specified');
    return false;
  }
  if (!TOKEN) {
    console.warn('>>> unable to fetch webmentions: no access token specified');
    return false;
  }

  let url = `${API}/mentions.jf2?domain=${domain}&token=${TOKEN}&per-page=${perPage}`;
  if (since) url += `&since=${since}`;
```

Pointers:

- **Activation is the token, not code.** `TOKEN` is `process.env.WEBMENTION_IO_TOKEN` (local `.env` plus the Netlify build environment). Without it the fetch returns `false`, the build stays green, and the webmention section renders empty. The whole feature switched on by setting the variable — no code change.
- **Fetching is production-only.** Dev builds read whatever is already in `.cache`; only `ELEVENTY_ENV === 'production'` hits the API.
- **The cache survives deploys** via `netlify-plugin-cache`, which is what makes the incremental `since` model work on Netlify.

## The self-echo filter

Bridgy (next section) sometimes backfeeds a silo post *mentioning itself* — for example a Flickr photo whose description links back here comes through as a mention carrying the photo's own caption. That is never a genuine third-party response. The `webmentionisOwn` filter in `src/_config/filters/webmentions.js` drops those, along with anything authored by one of my own identities:

```js
export const webmentionisOwn = webmention => {
  // (1) Self-syndication echo: the silo post mentioning itself.
  const source = webmention['wm-source'] || '';
  if (/^https?:\/\/brid\.gy\/post\//.test(source)) return true;

  // (2) Author is one of Johan's own identities.
  const urls = [
    'https://johanedlund.se',
    'https://bsky.app/profile/johanedlund.se',
    'https://mastodon.social/@pjedlund'
  ];
  const authorUrl = webmention.author ? webmention.author.url : false;
  return authorUrl && urls.includes(authorUrl);
};
```

The test matches only `brid.gy/post/…` sources; Bridgy's `/comment/`, `/like/`, and `/repost/` URLs pass through, so real replies and likes — including my own genuine comments left on a silo — still render.

## The rendering

{% raw %}

`src/_includes/partials/webmentions.njk` is included per layout, and only in three of them — `post.njk` (articles), `note.njk`, and `photo.njk`. Each layout sets the page's absolute URL first, so the partial can match it against every mention's `wm-target`:

```jinja2
{% set webmentionUrl = page.url | url | absoluteUrl(meta.url) %}
{% include "partials/webmentions.njk" %}
```

The partial then partitions the mentions: anything with `content.text` becomes a reply card, pure reactions (likes, reposts, bookmarks) become a facepile of overlapping avatars:

```jinja2
{% if webmention.content and webmention.content.text %}
  {% set replies = replies.concat([webmention]) %}
{% elif webmention.url %}
  {% if webmention.author.photo %}
    {% set reactionsPhoto = reactionsPhoto.concat([webmention]) %}
```

{% endraw %}

Pointers:

- **The empty state renders nothing.** The whole `<aside>` is gated on there being at least one reaction or reply, so pages without mentions carry no extra markup.
- **Reply cards are `h-cite`.** Each text-bearing mention renders via `partials/webmention.njk` as an `h-cite` citation wrapping the author's `h-card` — and deliberately *without* a `dt-published` class on the date, which belongs to this site's own posts, not someone else's response.
- **Remote content is never trusted.** `content.text` renders auto-escaped (no `| safe`), and avatars are plain hotlinked `<img eleventy:ignore>` tags — webmention.io proxies them, and the build never tries to fetch or optimize them.

## Bridgy, the bridge from the silos

Silos like Flickr don't send webmentions. [Bridgy](https://brid.gy) watches a silo account, finds reactions on syndicated copies, and sends webmentions to the original on their behalf — that is how nine Flickr likes and one comment on a two-year-old photo ended up on this site.

Two practical notes from that backfeed: for a live post the flow is a "Resend for post" followed by "Discover", but the old, pre-Bridgy reactions needed a per-response resend button for each like and comment individually — Bridgy's "Poll now" skips responses it considers already handled. And the verification of what actually arrived is best done against the webmention.io API, not Bridgy's own UI.

The story of what those recovered mentions meant is in [[The conversation was happening without me]].
