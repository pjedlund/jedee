import Image from '@11ty/eleventy-img';

// Build-time fetch + self-host a YouTube video's poster thumbnail. The page then makes NO request to Google on load (privacy + no third-party dependency), and the image is optimized and cached like every other build-time image. Mirrors the cover strategy: written to dist + the eleventy-fetch cache, not committed.
//
// Runs from the layouts / markdown (an async Nunjucks filter) rather than inside custom-youtube.webc, because WebC's `webc:setup` can't run async code or import() — so the self-hosted URL is computed here and passed in via @poster.
//
// hqdefault, not maxresdefault: maxres 404s on a lot of videos (every old This-Is-My-Jam import), while hqdefault exists for all of them. It is 480×360 4:3, which the CSS covers into 16:9 — a little soft on a wide embed, fine behind a play button.

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
    // Fetch failure at build (network, YouTube hiccup) → degrade to the remote thumbnail rather than break the build.
    return remote;
  }
};
