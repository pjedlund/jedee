import {appendCategoryTag} from '../_post-tags.js';

export default {
  layout: 'post',
  tags: 'posts',
  category: 'article',
  permalink: '/articles/{{ title | slugify }}/index.html',
  eleventyComputed: {
    tags: appendCategoryTag
  }
};
