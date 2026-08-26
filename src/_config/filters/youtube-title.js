import EleventyFetch from '@11ty/eleventy-fetch';

// Build-time fetch of a video's real YouTube title (the caption under the player), via the keyless oEmbed endpoint and cached like every other build-time fetch. Runs as an async filter, not in custom-youtube.webc, because webc:setup can't run async — same reason as youtubePoster.
//
// `fallback` (the post title) is returned on any miss — network hiccup, deleted/private video, empty response — so the caption is never blank and the build stays green.

export const youtubeTitle = async (slug, fallback = '') => {
  if (!slug) return fallback;
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${slug}&format=json`;
  try {
    const data = await EleventyFetch(url, { duration: '1w', type: 'json' });
    return data.title || fallback;
  } catch {
    return fallback;
  }
};
