// Directory data for the jam post type. Ported from jams.json so the cover's lightbox target can be computed at build time (see src/_config/utils/cover-zoom.js).
import { coverZoom } from '../../_config/utils/cover-zoom.js';

export default {
  layout: 'jam',
  tags: 'posts',
  category: 'jam',
  permalink: '/jams/{{ (slug or page.fileSlug) | slugify }}/index.html',
  eleventyComputed: {
    coverZoom: async data => await coverZoom(data.cover)
  }
};
