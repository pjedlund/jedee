---
title: How the YouTube embed loads
description: A dev note on the custom-youtube embed — self-hosted poster thumbnails, a branded logomark placeholder that the thumbnail fades in over, and the keyboard focus fix that came out of it.
date: 2026-07-07
tags:
  - eleventy
  - accessibility
draft: true
---

The `custom-youtube` component is a thin wrapper around [lite-youtube-embed](https://github.com/paulirish/lite-youtube-embed): a facade that shows a poster image and a play button, and only loads the real YouTube iframe once you click. It renders on jam pages, on the video post type, and from raw markdown. This note covers three things that changed about how it *loads* — where the poster comes from, what you see before it arrives, and a keyboard-focus bug that surfaced along the way.

## Usage

{% raw %}

There is nothing to pass for the loading behaviour — it's all internal. The component takes a video id and a label:

```html
<custom-youtube @slug="dQw4w9WgXcQ" @label="A video title"></custom-youtube>
```

The layouts wire it up from frontmatter. A jam with a `youtubeSlug` gets the embed automatically (`jam.njk`), and both it and `video.njk` also pass a self-hosted poster:

```jinja2
<custom-youtube
  @slug="{{ youtubeSlug }}"
  @poster="{{ youtubeSlug | youtubePoster }}"
  @label="{{ title }}"></custom-youtube>
```

{% endraw %}

The `@poster` is the interesting part.

## Self-hosting the poster

By default lite-youtube pulls its thumbnail straight from `i.ytimg.com` at page load — a request to Google every time the page renders. The old wrapper avoided that by routing through a screenshot service (`opengraph.11ty.dev`), but that service shows an Eleventy-branded placeholder while it generates the image, which is what you'd see flash up first.

Now the thumbnail is fetched, optimized, and hosted on this domain at **build time**, the same way cover images are. A post makes no request to Google to render the embed. The work lives in a small Nunjucks filter:

{% raw %}

```js
// src/_config/filters/youtube-poster.js
export const youtubePoster = async slug => {
  if (!slug) return '';
  const remote = `https://i.ytimg.com/vi/${slug}/hqdefault.jpg`;
  try {
    const metadata = await Image(remote, {
      widths: [480],
      formats: ['jpeg'],
      urlPath: '/assets/images/youtube/',
      outputDir: './dist/assets/images/youtube/',
      filenameFormat: (id, src, width, format) => `${slug}-${width}w.${format}`
    });
    return metadata.jpeg.at(-1).url;
  } catch {
    return remote; // build resilience: degrade to the remote thumbnail
  }
};
```

{% endraw %}

Pointers:

- **It's a filter, not part of the component, on purpose.** The natural place for this would be inside `custom-youtube.webc` — but WebC's `webc:setup` script can't run `async` code or `import()` (its evaluator wraps the setup in an async function, so a top-level `import` is a syntax error, and `async` functions or ones containing `import()` come back "not a function"), and you can't `await` inside a WebC attribute expression. So the async image work happens in a filter and the finished URL is handed in via `@poster`. Because markdown here runs through Nunjucks, the same filter works in a raw markdown embed too.
- **It uses `hqdefault`, not `maxresdefault`.** Maxres is crisper but doesn't exist for a lot of videos — every older *This Is My Jam* import 404s on it — which would leave those posters missing and fill the build log with errors. `hqdefault` exists for every video. It's 480×360 (4:3, with letterbox bars), but the CSS covers it into the 16:9 frame, which trims the bars off.
- **The `catch` degrades instead of failing.** If a fetch dies at build (network, a YouTube hiccup), the embed falls back to the remote thumbnail rather than breaking the whole build.

## The placeholder and the fade

Before the thumbnail paints, you see a placeholder: the site's logomark as a faint whisper, centered on the same lifted sheet the header mega-menu uses, tinted per theme. When the embed is ready, the thumbnail **fades in over it**.

You can't transition a `background-image` (it isn't animatable, and CSS has no "image finished loading" hook), so the fade is done by separating the two layers. The steady placeholder lives on the `is-land` wrapper; `lite-youtube` carries only the poster and is transparent until it fades in on top:

```css
is-land.video-wrapper {
  /* the steady placeholder: mega-menu surface + faint logomark, per theme */
  --yt-surface: color-mix(in oklab, white 45%, var(--color-bg));
  background-color: var(--yt-surface);
  background-image: var(--yt-logo-mark);
}
:root[data-theme='dark'] is-land.video-wrapper {
  --yt-surface: color-mix(in oklab, white 7%, var(--color-bg));
}

is-land[ready] lite-youtube {
  animation: yt-poster-fade var(--yt-poster-fade, 350ms) ease-out;
}
@keyframes yt-poster-fade { from { opacity: 0 } to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) {
  is-land[ready] lite-youtube { animation: none }
}
```

Pointers:

- **`[ready]` fires just before the poster paints**, and the poster is now small and same-origin, so in practice the thumbnail cross-fades over the placeholder rather than popping in.
- **It's a one-shot keyframe, not a default `opacity: 0`.** If it were `opacity: 0` and hydration ever stalled so `[ready]` never landed, the play button would be stranded invisible. With a keyframe the default opacity stays `1`, so the worst case is a thumbnail that appears without a fade.
- **It respects `prefers-reduced-motion`** — the animation is switched off, and the thumbnail simply appears.
- **The mid-gray logomark works in both themes.** At `fill-opacity: .1` it darkens the light sheet and lightens the dark one, so a single mark reads correctly against both surfaces.

## The focus ring that was hiding

Checking the fade for accessibility turned up an unrelated, pre-existing bug: the play button had **no visible keyboard focus indicator**.

The play button fills the entire embed, and lite-youtube sets `contain: content` on itself — which paint-clips anything drawn outside the box. This site's focus ring is *outset* (`outline-offset: 0.3ch`), so it was being drawn just past the edge and clipped away entirely. A keyboard user tabbing to the video saw nothing.

The fix is to inset the ring for that one button, by overriding the site's focus-offset variable so it lands inside the box:

```css
is-land lite-youtube .lyt-playbtn {
  --focus-offset: -4px;
}
```

Pointers:

- **`contain: paint` (and `overflow: hidden`) clip focus rings too.** The first attempt used `overflow: hidden` on the wrapper to round the corners of the fading poster; that added a *second* clip. The corners are now rounded with `border-radius` on both layers instead, so nothing clips the ring.
- **The general rule:** any box that paint-contains its content and holds a focusable child that fills it needs an *inset* focus ring, or the indicator disappears. Worth remembering for any facade-style component.

## A live example

<div><custom-youtube @slug="vrSUCL3TZxk" @poster="{{ 'vrSUCL3TZxk' | youtubePoster }}" @label="Sir Arne's treasure by Deeper Cinema"></custom-youtube></div>

Load it on a slow connection and you can catch the logomark on its sheet before the thumbnail fades in; tab to it and the focus ring frames the whole box.
