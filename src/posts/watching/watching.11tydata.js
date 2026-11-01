// Directory data for the watching post type. Ported from watching.json so the cover's lightbox target can be computed at build time (see src/_config/utils/cover-zoom.js).
import { coverZoom } from '../../_config/utils/cover-zoom.js';
import { ogImage } from '../../_config/utils/og-image.js';
import { ogCard, autoDescription } from '../../_config/utils/og-card.js';

export default {
  layout: 'watching',
  tags: 'posts',
  category: 'watching',
  permalink: '/watching/{{ (slug or page.fileSlug) | slugify }}/index.html',
  eleventyComputed: {
    coverZoom: async data => await coverZoom(data.cover),
    ogImage: async data => await ogImage(data.cover),
    ogCard: data => ogCard('watching', data.slug || data.page.fileSlug),
    autoDescription: data => autoDescription.watching(data)
  }
};
