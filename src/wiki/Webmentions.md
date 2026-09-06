---
description: "The W3C notification protocol behind open-web replies and likes, and how jedee receives them while staying entirely static."
date: 2026-07-31
---

A [webmention](https://indieweb.org/Webmention) is a small notification one site sends another: a page over here links to a page over there. It became a [W3C Recommendation](https://www.w3.org/TR/webmention/) in 2017, and it is the open web's answer to comments and likes living on someone else's platform — the response is published on the responder's own site, and the webmention is only the notification that it exists.

The protocol is deliberately small. A receiving page advertises an endpoint, either as a `<link rel="webmention">` in the head or an HTTP `Link` header. A sender that publishes a page linking to it discovers that endpoint and POSTs two form-encoded parameters: `source` (the page that links) and `target` (the page linked to). The receiver then fetches `source` and confirms it really does link to `target`. That verification step is the entire security model — anyone can POST anything, so nothing counts until the source page has been fetched and checked.

What the receiver *displays* is not part of the protocol. Parsing the source page for [microformats2](https://microformats.org/wiki/microformats2) is what turns a bare notification into a reply with an author and an avatar: the mention says "this page links to you", and the mf2 markup on that page says whether it was a reply, a like, or a repost. See [[Microformats]].

**Receiving requires something that answers a POST**, which a static site by definition doesn't have. The usual arrangement is to delegate the endpoint to a hosted service and pull the accumulated mentions in at build time, so the deployed site stays static and the only dynamic part lives somewhere else.

**Silos don't send webmentions.** Likes and comments on a syndicated copy stay on the platform unless something bridges them back. [Bridgy](https://brid.gy) is that bridge — it watches a silo account, finds reactions on syndicated copies, and sends webmentions to the original on their behalf.

## In jedee

Eleventy Excellent ships no webmention layer; this is jedee's own, live since 2026-06-05. Three parts: a hosted receiving endpoint, a build-time fetch, and a render partial.

### Receiving without a server

[webmention.io](https://webmention.io) acts as the mailbox. Senders discover it through one tag in `head/meta-info.njk`:

```html
<link rel="webmention" href="https://webmention.io/johanedlund.se/webmention" />
```

That is the entire receiving side. Mentions accumulate there until the next build asks for them.

### The build-time fetch

`src/_data/webmentions.js` pulls the collected mentions during the build, so every deployed page stays plain static HTML. It keeps its own `.cache/webmentions.json` and fetches incrementally — each build only pulls what arrived since the last one.

- **Activation is the token, not code.** Without `WEBMENTION_IO_TOKEN` the fetch returns `false`, the build stays green, and the section renders empty. The whole feature switched on by setting an environment variable — no code change.
- ⚠ **Every failure returns `false`, not just a missing token.** The fetch lives in `src/_config/utils/webmention-fetch.js` and swallows a rejected request, a non-2xx, and a 200 whose body is not a JF2 feed; the caller then keeps its cache and does **not** advance `lastFetched`, so the next build retries from the same point. This was not always true: until 2026-09-05 only the two configuration checks returned `false` and the request itself was unguarded, so an intermittent `502` from webmention.io failed the entire production build — which on Netlify means a third party's flakiness blocks a deploy. Proven by pointing the API at an unreachable host and watching a full production build finish anyway.
- **Fetching is production-only.** Dev builds read whatever is already cached; only `ELEVENTY_ENV === 'production'` hits the API.
- **The cache survives deploys** via `netlify-plugin-cache`, which is what makes the incremental `since` model work at all on Netlify.

### The self-echo filter

Bridgy sometimes backfeeds a silo post *mentioning itself* — a Flickr photo whose description links back here arrives as a mention carrying the photo's own caption. Never a genuine third-party response. `webmentionisOwn` drops those plus anything authored by one of Johan's own identities:

```js
const source = webmention['wm-source'] || '';
if (/^https?:\/\/brid\.gy\/post\//.test(source)) return true;
```

The test matches only `brid.gy/post/…`. Bridgy's `/comment/`, `/like/`, and `/repost/` URLs pass through, so real replies and likes — including Johan's own genuine comments left on a silo — still render.

### Rendering

`partials/webmentions.njk` is included by three layouts only: `post.njk`, `note.njk`, `photo.njk`. Each sets the page's absolute URL first so the partial can match it against each mention's `wm-target`. Mentions then partition: anything with `content.text` becomes a reply card, pure reactions become a facepile of overlapping avatars.

- **The empty state renders nothing** — the whole `<aside>` is gated on there being at least one reaction or reply.
- **Reply cards are `h-cite`** wrapping the author's `h-card`, and deliberately carry **no `dt-published`** on the date: that property belongs to this site's own posts, not someone else's response. See [[Microformats]].
- **Remote content is never trusted.** `content.text` renders auto-escaped (no `| safe`), and avatars are hotlinked `<img eleventy:ignore>` — webmention.io proxies them and the build never tries to fetch or optimize them.

### Bridgy in practice

Bridgy watching the Flickr account is how nine Flickr likes and one comment on a two-year-old photo arrived here. Two operational notes from that backfeed:

- For a live post the flow is **"Resend for post" then "Discover"**. But *old, pre-Bridgy* reactions need a **per-response resend button for each like and comment individually** — "Poll now" skips anything it considers already handled.
- **Verify against the webmention.io API, not Bridgy's own UI.**

See also [[Rebuilding an archive from the Wayback Machine]], which reuses this rendering for recovered reactions that are deliberately *not* presented as webmentions.

Raw source: `src/_raw/dev-notes/How webmentions work on this site.md`
