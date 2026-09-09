// Directory data for the jam post type. Ported from jams.json so the cover's lightbox target can be computed at build time (see src/_config/utils/cover-zoom.js).
import { coverZoom } from '../../_config/utils/cover-zoom.js';
import { ogImage } from '../../_config/utils/og-image.js';
import { jamOgCard, jamDescription } from '../../_config/utils/jam-og-card.js';

export default {
  layout: 'jam',
  tags: 'posts',
  category: 'jam',
  permalink: '/jams/{{ (slug or page.fileSlug) | slugify }}/index.html',
  eleventyComputed: {
    coverZoom: async data => await coverZoom(data.cover),
    ogImage: async data => await ogImage(data.cover),
    ogCard: data => jamOgCard(data.slug || data.page.fileSlug),
    autoDescription: data => jamDescription(data)
  }
};
