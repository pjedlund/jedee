import Image from '@11ty/eleventy-img';

// Build-time 1200px JPEG of a post's OWN artwork, for og:image — the photo itself, or the album cover. Returns {url, width, height}, or null to fall back to the site's default card.
//
// Preferred over a generated title card for any type that already has artwork: no committed JPEG, nothing to strand when a post is retitled, and no `clean:og` to remember. See the wiki page "Open Graph images".
//
// Computed data rather than a filter, like coverZoom: Nunjucks can't await an async filter inside the {% if %} that picks the tag's value, and a <meta> needs a plain string.
//
// Not a shared derivative with coverZoom — that one is the lightbox's zoom target and drops anything under 448px, a rule that has nothing to do with what a social card needs.

export const ogImage = async source => {
  if (!source) return null;
  // A site-absolute cover (/assets/…) is a local file: eleventy-img needs the path on disk, not the URL. A photo's `./src/…` is already that path.
  const input = source.startsWith('/') ? `./src${source}` : source;
  try {
    const metadata = await Image(input, {
      widths: [1200],
      formats: ['jpeg'],
      urlPath: '/assets/images/og/',
      outputDir: './dist/assets/images/og/'
    });
    const card = metadata.jpeg.at(-1);
    // ⚠ eleventy-img floors the reported height where sharp rounds it, so a non-integer ratio can declare 1px short of the file served. Harmless on a preview card; don't reuse these numbers for layout.
    // ⚠ Facebook and Mastodon ignore an og:image below 200px on either side, so the default card beats a thumbnail.
    if (card.width < 200 || card.height < 200) return null;
    return {url: card.url, width: card.width, height: card.height};
  } catch {
    // Dead or unreachable artwork: fall back to the default card rather than break the build.
    return null;
  }
};
