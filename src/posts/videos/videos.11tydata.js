// Directory data for the video post type. Ported from videos.json so the share card can be computed at build time (see src/_config/utils/og-image.js).
import { ogImage } from '../../_config/utils/og-image.js';

// The share card's image: a self-hosted file's poster, or the YouTube thumbnail. ⚠ hqdefault is 4:3 with black bars on a 16:9 video, so maxres is tried first; it 404s on many videos. PeerTube has no poster here, so it keeps the default card.
const videoOgImage = async video => {
  if (video?.provider === 'file') return ogImage(video.poster);
  if (video?.provider === 'youtube') return (await ogImage(`https://i.ytimg.com/vi/${video.slug}/maxresdefault.jpg`)) ?? ogImage(`https://i.ytimg.com/vi/${video.slug}/hqdefault.jpg`);
  return null;
};

export default {
  layout: 'video',
  tags: 'posts',
  category: 'video',
  permalink: '/videos/{{ page.fileSlug | slugify }}/index.html',
  eleventyComputed: {
    ogImage: async data => await videoOgImage(data.video),
    ogAlt: data => `Still from ${data.title}`
  }
};
