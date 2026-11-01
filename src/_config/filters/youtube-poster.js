import Image from '@11ty/eleventy-img';

// Self-hosts a YouTube poster at build, so a page makes no request to Google. A filter, not WebC, because webc:setup can't run async code.
// ⚠ hqdefault, not maxresdefault: maxres 404s on many videos, including every old This Is My Jam import.

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
