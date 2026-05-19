import {appendCategoryTag} from '../_post-tags.js';

export default {
  layout: 'reading',
  tags: 'posts',
  category: 'watching',
  permalink: '/watching/{{ page.fileSlug }}/index.html',
  eleventyComputed: {
    tags: appendCategoryTag
  }
};
