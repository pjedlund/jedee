import {appendCategoryTag} from '../_post-tags.js';

export default {
  layout: 'note',
  tags: 'posts',
  category: 'note',
  permalink: '/notes/{{ page.fileSlug | slugify }}/index.html',
  eleventyExcludeFromCollections: false,
  excludeFromSitemap: false,
  eleventyComputed: {
    tags: appendCategoryTag
  }
};
