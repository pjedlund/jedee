import {appendCategoryTag} from '../_post-tags.js';

export default {
  layout: 'listening',
  tags: 'posts',
  category: 'listening',
  permalink: '/listening/{{ page.fileSlug | slugify }}/index.html',
  eleventyComputed: {
    tags: appendCategoryTag
  }
};
