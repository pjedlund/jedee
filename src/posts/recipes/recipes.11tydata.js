// Directory data for the recipe post type. Ported from recipes.json so the share card can be the dish photo (see src/_config/utils/og-image.js).
import { ogImage } from '../../_config/utils/og-image.js';

export default {
  layout: 'recipe',
  tags: 'posts',
  category: 'recipe',
  permalink: '/recipes/{{ page.fileSlug | slugify }}/index.html',
  eleventyComputed: {
    ogImage: async data => await ogImage(data.cover)
  }
};
