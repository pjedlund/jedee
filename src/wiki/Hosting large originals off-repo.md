---
description: "Why write-once binaries do not belong in git, and how stomme serves multi-megabyte photo originals from a Cloudflare R2 bucket the build never touches."
date: 2026-07-31
updated: 2026-10-27
---

Git stores every version of every file forever. That is exactly the behavior you want for text and exactly the one you don't want for large binaries: a 150 MB scan committed once is 150 MB in the repository permanently, and replacing it adds another 150 MB rather than a diff. Everyone who clones pays for all of it, and the repository stops being cheap to copy — which is most of what makes git pleasant to use.

[Git LFS](https://git-lfs.com/) is the conventional answer, keeping a small pointer file in the repo and the bytes on a separate server. It isn't free either: it needs host support, carries its bandwidth quotas, and makes a clone fail in new ways when the LFS server is unreachable.

For files that are *published* rather than *versioned*, the simpler option is to skip the repository altogether — put them in object storage and link to them by URL. Archival originals suit this well, because they have exactly the properties that make version control pointless: written once, never edited, and with no history anyone needs.

What it costs is that the build no longer knows anything about those files. Nothing verifies the link still resolves, and nothing catches a stated file size or type that has drifted from what is actually being served. Any metadata the page displays about the file is a claim, not a measurement, so it has to be checked by hand when it changes.

## In stomme

Photo pages show a modest responsive strip — an Eleventy Image `<picture>` capped at 2000px. But the lightbox zoom target and the download links point at much larger files, such as a full-size JPEG of several megabytes and an archival TIFF of a hundred or more. Those files are **not in the repo and not part of the build**. They sit on a separate host and the page reaches them by plain URL.

This is the deliberate inverse of [[Self-hosting remote images at build time]]: covers get pulled *in* at build, originals stay *out* permanently.

### The frontmatter contract

```yaml
photo:
  downloads:
    - label: Full-size JPEG (6000×4000, 11 MB)
      url: https://pub-…r2.dev/photos/roll-01-frame-01.jpg
      format: JPEG
      width: 6000
      height: 4000
      bytes: 11400000
    - label: Original (TIFF, 146MB)
      url: https://pub-…r2.dev/photos/roll-01-frame-01-positive.tif
      format: TIFF
      bytes: 146000000
```

`downloads` sits under `photo:`, beside `src` and `alt`; `photo.njk` reads `photo.downloads`, so a top-level `downloads:` is ignored and the page renders with no lightbox and no download links.

- **The order is a contract.** `downloads[0]` is always the full-size raster; it carries `width`/`height` and drives both the lightbox and the Resolution row in the metadata block. `downloads[1]` is the archival scan.
- ⚠ **`bytes` must match the served `content-length`.** It records the exact size of the file in the bucket; re-upload a file and the frontmatter has to follow.
- **A stable URL shape keeps the contract simple**: one public hostname plus `/photos/<name>.<ext>`, where the name identifies the scan or exposure rather than the post slug, so a renamed post does not move its files.

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

Any host that serves a public URL works. A Cloudflare R2 bucket served through its public r2.dev address is one cheap arrangement: **no custom domain, so no DNS involved**, free egress, and a free tier that covers modest use; r2.dev is rate-limited, which is fine at low traffic. The machinery is then one bucket and one public URL: no storage zone, CDN, separate subdomain or certificate to keep.

**The build never touches these files:** no fetch, no processing, no size checks. The repo stores two URLs and a byte count, and the page trusts them. That trust is the price of keeping very large originals out of git, and the `bytes` discipline above is what keeps it honest.
