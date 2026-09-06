---
description: "The facade pattern that keeps a YouTube iframe off the page until someone clicks, and the two details jedee finishes — a self-hosted poster and a visible focus ring."
date: 2026-07-31
---

A standard YouTube embed is an `<iframe>` that pulls in several hundred kilobytes of JavaScript and contacts a number of Google domains before anyone presses play. On a page where the video is not the main point, that cost is paid by every visitor, most of whom will never watch it — and a third party gets to observe everyone who loads the page.

The **facade pattern** is the established fix: render a static poster image and a play button, and construct the real iframe only when someone clicks. The page then costs one image, and the embed's weight is paid only by people who actually wanted the video. [lite-youtube-embed](https://github.com/paulirish/lite-youtube-embed) is the well-known implementation.

Two details are commonly left half-finished:

- **The poster is usually still hotlinked** from YouTube's thumbnail servers, so the third-party request the facade was meant to prevent happens anyway, on every page load. Self-hosting the poster at build time closes that gap — see [[Self-hosting remote images at build time]].
- **The play button is a real control inside a container the component paint-contains**, which makes it a classic place for a keyboard focus indicator to vanish — see [[Focus rings and paint containment]].

## In jedee

`custom-youtube` is a thin wrapper around lite-youtube-embed. It renders on jam pages, on the video post type, and from raw markdown. A jam's `youtubeSlug` takes either one slug or a list, and the layout renders one player per slug.

**Eleventy Excellent ships `custom-youtube`**; what follows is jedee's divergence — where the poster comes from, what you see before it arrives, and a focus bug that surfaced along the way.

### The poster is self-hosted at build time

By default lite-youtube pulls its thumbnail from `i.ytimg.com` at page load — a request to Google on every render. An earlier wrapper routed through a screenshot service, which flashed an Eleventy-branded placeholder while generating. Now the thumbnail is fetched, optimized, and hosted on this domain at build time, so **a page makes no request to Google to render the embed**:

```js
// src/_config/filters/youtube-poster.js
export const youtubePoster = async slug => {
  const remote = `https://i.ytimg.com/vi/${slug}/hqdefault.jpg`;
  try {
    const metadata = await Image(remote, {widths: [480], formats: ['jpeg'], /* … */});
    return metadata.jpeg.at(-1).url;
  } catch {
    return remote; // build resilience: degrade to the remote thumbnail
  }
};
```

- **It's a filter, not part of the component, on purpose.** WebC's `webc:setup` can't run `async` code or `import()`, and you can't `await` inside a WebC attribute expression — so async work happens in a filter and the finished URL is handed in via `@poster`. Because markdown runs through Nunjucks here, the same filter works in a raw markdown embed too. See [[Self-hosting remote images at build time]].
- **`hqdefault`, not `maxresdefault`.** Maxres is crisper but doesn't exist for many videos — every older *This Is My Jam* import 404s on it — which would leave posters missing and flood the build log. `hqdefault` exists for every video; it's 480×360 with letterbox bars, and the CSS covers it into the 16:9 frame, trimming them off.
- **The `catch` degrades instead of failing**, so a network hiccup at build can't break the whole build.
- **Verify a slug with oEmbed before committing it.** A removed video doesn't fail the build — the `catch` degrades to hotlinking `hqdefault.jpg` — but for a dead video that thumbnail is gone too, so the result is a broken poster over a play button that opens an unavailable video. YouTube's [oEmbed endpoint](https://oembed.com/) is the cheap pre-commit check: `https://www.youtube.com/oembed?url=…/watch?v=<slug>&format=json` returns `200` with the video's `title` and `author_name` (its channel) when the video is live and embeddable, and `404` when it is removed, private, or has embedding disabled. Reading `author_name` also separates official uploads (`… - Topic`, VEVO, the artist's own channel) from fan re-uploads — worth preferring, since a fan copy of a label's track is the kind that later gets pulled or geo-blocked. It's the same signal the import's `youtube_ok` used; see [[Rebuilding an archive from the Wayback Machine]].

### Fading a background image you can't transition

Before the thumbnail paints you see the site's logomark as a faint whisper on the same lifted sheet the mega-menu uses, tinted per theme. `background-image` isn't animatable and CSS has no "image loaded" hook, so the fade separates the two layers: the steady placeholder lives on the [[is-land]] wrapper, and `lite-youtube` carries only the poster and fades in on top.

```css
is-land[ready] lite-youtube { animation: yt-poster-fade var(--yt-poster-fade, 350ms) ease-out; }
@keyframes yt-poster-fade { from { opacity: 0 } to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { is-land[ready] lite-youtube { animation: none } }
```

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/youtube-poster-fade.png" alt="Three players side by side, frozen at three instants of the same 350 millisecond fade. The first is an empty lifted panel with a very faint logomark at its centre. The second shows the album artwork and the red play button at about half opacity over that panel. The third is the finished poster, opaque, with the play button at full strength." width="1456" height="394">
  <figcaption>The same keyframe frozen at 0, 175 and 350ms. The placeholder is a separate layer on the wrapper, which is why it shows <em>through</em> the half-faded poster rather than being replaced by it.</figcaption>
</figure>

- **A one-shot keyframe, not a default `opacity: 0`.** If it were `opacity: 0` and hydration ever stalled so `[ready]` never landed, the play button would be stranded invisible. With a keyframe the default opacity stays `1`, so the worst case is a thumbnail with no fade.
- **A mid-gray logomark works in both themes.** At `fill-opacity: .1` it darkens the light sheet and lightens the dark one, so a single mark reads correctly against both.

### Reserving the space before hydration

The placeholder above is also what holds the player's space, so **where its CSS lives decides whether the page jumps**. Written inside the island's `<template data-island>` — the natural place, since that's where the lite-youtube stylesheet and script go — it only lands when the island hydrates. Until then the wrapper has no `aspect-ratio` and is zero pixels high, and everything below it is shoved down the moment hydration runs. The box rules therefore live in the component's own `<style>`, outside the template, and only the lite-youtube stylesheet and script stay inside it. Measured after the move: CLS 0, and the un-hydrated wrapper already reports 1024×576.

The no-JS hide moved for the same reason. `is-land:not(:defined) { display: none }` hides the box for exactly the window the reservation is meant to cover — the element is undefined until the island runtime defines it — so the hide is now a `<noscript>` rule instead, which only applies when scripting is genuinely off. The YouTube link under the player is the no-JS path either way.

### The focus ring that was hiding

Checking the fade for accessibility turned up an unrelated pre-existing bug: the play button had **no visible keyboard focus indicator**. It fills the entire embed, and lite-youtube sets `contain: content`, which paint-clips anything drawn outside the box — and this site's focus ring is *outset* (`outline-offset: 0.3ch`), so it was drawn just past the edge and clipped away. The fix inverts the offset for that one button:

```css
is-land lite-youtube .lyt-playbtn { --focus-offset: -4px; }
```

The generalized rule has its own page: [[Focus rings and paint containment]].

Raw source: `src/_raw/dev-notes/How the YouTube embed loads.md`
