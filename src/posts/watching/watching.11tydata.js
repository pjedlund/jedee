// Directory data for the watching post type. Ported from watching.json so the cover's lightbox target can be computed at build time (see src/_config/utils/cover-zoom.js).
import { coverZoom } from '../../_config/utils/cover-zoom.js';

export default {
  layout: 'watching',
  tags: 'posts',
  category: 'watching',
  permalink: '/watching/{{ (slug or page.fileSlug) | slugify }}/index.html',
  eleventyComputed: {
    coverZoom: async data => await coverZoom(data.cover)
  }
};
