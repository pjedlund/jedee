import Image from '@11ty/eleventy-img';

// A cover at its native size for the lightbox, self-hosted at build: {url, width, height}, or null when there is nothing bigger to see.
// Computed data, not a filter, because Nunjucks can't await an async filter inside {% set %} or {% if %}.

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
