---
title: How the photo originals are hosted
description: A dev note on where the photo pages' full-resolution files live — off-repo on Cloudflare R2 — and how the frontmatter, the photo layout, and the download links wire them up.
date: 2026-07-05
tags:
  - photography
  - pinhole
draft: true
---

The photo pages show a modest responsive strip — an Eleventy Image `<picture>` capped at 2000 pixels wide. But the lightbox zoom target and the download links point at much larger files, and those files are not in the repo and not part of the build. They sit in an object store, and the page reaches them by plain URL.

## The frontmatter

Each photo post carries a `downloads` list. From `src/posts/photos/Pier 4, Ribersborg.md`:

```yaml
downloads:
  - label: Full-size JPEG (9437×3375, 11 MB)
    url: https://pub-820f82fa11f94b03ab1d34e77b3572f6.r2.dev/photos/120-R012-F01-S01-E01.jpg
    format: JPEG
    width: 9437
    height: 3375
    bytes: 11456471
  - label: Original (TIFF, 146MB)
    url: https://pub-820f82fa11f94b03ab1d34e77b3572f6.r2.dev/photos/120-R012-F01-S01-E01-positive.tif
    format: TIFF
    bytes: 146448308
```

Pointers:

- **The order is a contract.** `downloads[0]` is always the full-size raster (JPEG) — it carries `width`/`height` and drives both the lightbox and the Resolution row in the metadata block. `downloads[1]` is the archival scan: the untouched TIFF, about 146 MB for this 6×17 frame.
- **`bytes` must match the served `content-length`.** The field records the exact size of the file in the bucket; if a file is ever re-uploaded, the frontmatter follows.
- **The URL shape is the whole addressing scheme**: the bucket's public r2.dev hostname plus `/photos/<name>.jpg`. The name is the scan's own file name (roll/frame/scan/exposure), not the post slug.

## The layout wiring

{% raw %}

`src/_layouts/photo.njk` hands the first download entry to the `<photo-lightbox>` component as the zoom target, while the visible image stays a local, build-generated responsive picture:

```jinja2
{%- set lbox = false -%}
{%- if photo.downloads %}{% set lbox = photo.downloads[0] %}{% endif -%}
<div class="feature">
  {%- if lbox and lbox.url and lbox.width and lbox.height -%}
    <photo-lightbox @href="{{ lbox.url }}" @width="{{ lbox.width }}" @height="{{ lbox.height }}">
      {% image photo.src, photo.alt, "", "eager", "", "u-photo", [650, 960, 1400, 2000], "(min-width: 82rem) 78rem, 100vw" %}
    </photo-lightbox>
  {%- else -%}
    {% image photo.src, photo.alt, "", "eager", "", "u-photo", [650, 960, 1400, 2000], "(min-width: 82rem) 78rem, 100vw" %}
  {%- endif -%}
</div>
```

The download buttons render in `src/_includes/partials/photo-meta.njk`, straight from the same list:

```jinja2
<ul class="photo-downloads | cluster" role="list">
  {% for dl in photo.downloads %}
  <li>
    <a class="button" href="{{ dl.url }}" rel="enclosure" download>
      {{ dl.label }}
    </a>
  </li>
  {% endfor %}
</ul>
```

{% endraw %}

Pointers:

- **Two images, one subject.** `photo.src` is a local asset the build turns into AVIF/WebP/JPEG candidates up to 2000w; the lightbox `@href` is the off-site original. Opening the lightbox is the only thing that fetches the 11 MB file, and only when asked.
- **No `@srcset` is passed**, so the lightbox has a single zoom target instead of the responsive candidate list the `lightbox` shortcode builds for local images. `@width`/`@height` come from `downloads[0]` and give PhotoSwipe its zoom math up front.
- **The guard degrades cleanly**: a photo post without a `downloads` list (or one missing `url`/`width`/`height`) renders the plain picture, no lightbox.
- The download links carry `rel="enclosure"` and the `download` attribute — they are marked as the entry's attached files, not just outbound links.

## The host

The files live in a Cloudflare R2 bucket named `johanedlund-photos`, served through the bucket's public r2.dev URL. There is no custom domain in front of it, so no DNS is involved. R2's free tier covers this comfortably, and egress is free; r2.dev is rate-limited, which is fine at this traffic. This setup replaced an earlier Bunny.net one (storage zone, CDN, own subdomain, certificate — the "whole quiet machinery" the companion note describes) after a surprise charge; the current machinery is one bucket and one public URL.

The build never touches these files: no fetch, no processing, no size checks. The repo stores two URLs and a byte count, and the page trusts them.

For the story of why one photograph got all this in the first place, see [[A house for one photograph]].
