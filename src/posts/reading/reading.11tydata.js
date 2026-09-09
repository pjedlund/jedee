// Directory data for the reading post type. Ported from reading.json so the cover's lightbox target can be computed at build time (see src/_config/utils/cover-zoom.js).
import { coverZoom } from '../../_config/utils/cover-zoom.js';
import { ogImage } from '../../_config/utils/og-image.js';
import { ogCard, autoDescription } from '../../_config/utils/og-card.js';

export default {
  layout: 'reading',
  tags: 'posts',
  category: 'reading',
  permalink: '/reading/{{ (slug or page.fileSlug) | slugify }}/index.html',
  eleventyComputed: {
    coverZoom: async data => await coverZoom(data.cover),
    ogImage: async data => await ogImage(data.cover),
    ogCard: data => ogCard('reading', data.slug || data.page.fileSlug),
    autoDescription: data => autoDescription.reading(data)
  }
};
