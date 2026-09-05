---
description: "Why write-once binaries do not belong in git, and how jedee serves multi-megabyte photo originals from a Cloudflare R2 bucket the build never touches."
date: 2026-07-31
---

Git stores every version of every file forever. That is exactly the behavior you want for text and exactly the one you don't want for large binaries: a 150 MB scan committed once is 150 MB in the repository permanently, and replacing it adds another 150 MB rather than a diff. Everyone who clones pays for all of it, and the repository stops being cheap to copy — which is most of what makes git pleasant to use.

[Git LFS](https://git-lfs.com/) is the conventional answer, keeping a small pointer file in the repo and the bytes on a separate server. It isn't free either: it needs host support, carries its own bandwidth quotas, and makes a clone fail in new ways when the LFS server is unreachable.

For files that are *published* rather than *versioned*, the simpler option is to skip the repository altogether — put them in object storage and link to them by URL. Archival originals suit this well, because they have exactly the properties that make version control pointless: written once, never edited, and with no history anyone needs.

What it costs is that the build no longer knows anything about those files. Nothing verifies the link still resolves, and nothing catches a stated file size or type that has drifted from what is actually being served. Any metadata the page displays about the file is a claim, not a measurement, so it has to be checked by hand when it changes.

## In jedee

Photo pages show a modest responsive strip — an Eleventy Image `<picture>` capped at 2000px. But the lightbox zoom target and the download links point at much larger files: an 11 MB full-size JPEG and a 146 MB archival TIFF. Those files are **not in the repo and not part of the build**. They sit in a Cloudflare R2 bucket and the page reaches them by plain URL.

This is the deliberate inverse of [[Self-hosting remote images at build time]]: covers get pulled *in* at build, originals stay *out* permanently.

### The frontmatter contract

```yaml
downloads:
  - label: Full-size JPEG (9437×3375, 11 MB)
    url: https://pub-…r2.dev/photos/120-R012-F01-S01-E01.jpg
    format: JPEG
    width: 9437
    height: 3375
    bytes: 11456471
  - label: Original (TIFF, 146MB)
    url: https://pub-…r2.dev/photos/120-R012-F01-S01-E01-positive.tif
    format: TIFF
    bytes: 146448308
```

- **The order is a contract.** `downloads[0]` is always the full-size raster; it carries `width`/`height` and drives both the lightbox and the Resolution row in the metadata block. `downloads[1]` is the archival scan.
- ⚠ **`bytes` must match the served `content-length`.** It records the exact size of the file in the bucket; re-upload a file and the frontmatter has to follow.
- **The URL shape is the addressing scheme**: the bucket's public r2.dev hostname plus `/photos/<name>.<ext>`, where the name is the scan's own roll/frame/scan/exposure identifier — not the post slug.

### The wiring

`photo.njk` hands `downloads[0]` to `<photo-lightbox>` as the zoom target while the visible image stays a local, build-generated responsive picture:

```jinja2
{%- if lbox and lbox.url and lbox.width and lbox.height -%}
  <photo-lightbox @href="{{ lbox.url }}" @width="{{ lbox.width }}" @height="{{ lbox.height }}">
    {% image photo.src, photo.alt, … %}
  </photo-lightbox>
{%- else -%}
  {% image photo.src, photo.alt, … %}
{%- endif -%}
```

- **Two images, one subject.** `photo.src` is a local asset the build turns into AVIF/WebP/JPEG up to 2000w; the lightbox `@href` is the off-site original. Opening the lightbox is the only thing that ever fetches the 11 MB file.
- **No `@srcset` is passed**, so the lightbox has a single zoom target rather than the responsive candidate list the `{% lightbox %}` shortcode builds for local images. `@width`/`@height` from `downloads[0]` give PhotoSwipe its zoom math up front.
- **The guard degrades cleanly**: a photo post with no `downloads` (or missing `url`/`width`/`height`) renders the plain picture, no lightbox.
- Download links carry `rel="enclosure"` and the `download` attribute — marked as the entry's attached files, not just outbound links.

### The host

A Cloudflare R2 bucket named `johanedlund-photos`, served through the bucket's public r2.dev URL. **No custom domain, so no DNS involved.** The free tier covers this comfortably and egress is free; r2.dev is rate-limited, which is fine at this traffic.

This replaced an earlier Bunny.net setup — storage zone, CDN, own subdomain, certificate — after a surprise charge. The current machinery is one bucket and one public URL.

**The build never touches these files:** no fetch, no processing, no size checks. The repo stores two URLs and a byte count, and the page trusts them. That trust is the price of keeping 157 MB per photograph out of git, and the `bytes` discipline above is what keeps it honest.

Raw source: `src/_raw/dev-notes/How the photo originals are hosted.md`
