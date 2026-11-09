import Image from '@11ty/eleventy-img';

// Self-hosts a YouTube poster at build, so a page makes no request to Google. A filter, not WebC, because webc:setup can't run async code.
// ⚠ maxres (1280 wide) 404s on many videos, including every old This Is My Jam import, so each size falls back to the next smaller one.
const sizes = ['maxresdefault', 'sddefault', 'hqdefault'];

export const youtubePoster = async slug => {
  if (!slug) return '';
  for (const size of sizes) {
    try {
      const metadata = await Image(`https://i.ytimg.com/vi/${slug}/${size}.jpg`, {
        widths: ['auto'],
        formats: ['jpeg'],
        urlPath: '/assets/images/youtube/',
        outputDir: './dist/assets/images/youtube/',
        filenameFormat: (id, src, width, format) => `${slug}-${width}w.${format}`
      });
      return metadata.jpeg.at(-1).url;
    } catch {}
  }
  // Every size failed at build (network, YouTube hiccup) → degrade to the remote thumbnail rather than break the build.
  return `https://i.ytimg.com/vi/${slug}/hqdefault.jpg`;
};
