import Image from '@11ty/eleventy-img';

// Build-time fetch of a remote cover at its native size, for the lightbox's zoom target. Returns {url, width, height}, or null when there is nothing to zoom into.
//
// Two jobs in one pass: PhotoSwipe needs the slide's real pixel dimensions, and getting them means reading the image at build anyway — so the same call also self-hosts it, keeping the zoomed view off the vendor CDN (same reasoning as youtube-poster.js).
//
// Runs as computed data rather than a filter because Nunjucks can't await an async filter inside {% set %} or {% if %} — the layout needs a plain object it can branch on.
//
// widths [null] = the source's own width, so the lightbox shows the full artwork rather than the 448px the visible cover tops out at.

export const coverZoom = async cover => {
  if (!cover) return null;
  // A site-absolute cover (/assets/…) is a local file: eleventy-img needs the path on disk, not the URL.
  const source = cover.startsWith('/') ? `./src${cover}` : cover;
  try {
    const metadata = await Image(source, {
      widths: [null],
      formats: ['jpeg'],
      urlPath: '/assets/images/covers/',
      outputDir: './dist/assets/images/covers/'
    });
    const full = metadata.jpeg.at(-1);
    // ⚠ A cover smaller than the 14rem display size is not worth a lightbox — opening it would zoom to something no bigger than the thumbnail.
    if (full.width <= 448) return null;
    return {url: full.url, width: full.width, height: full.height};
  } catch {
    // Dead or unreachable cover URL: no lightbox, and the visible <img> degrades to its placeholder as before. Never break the build over it.
    return null;
  }
};
