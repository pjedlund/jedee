import {appendCategoryTag} from '../_post-tags.js';

export default {
  layout: 'reading',
  tags: 'posts',
  category: 'reading',
  permalink: '/reading/{{ page.fileSlug | slugify }}/index.html',
  eleventyComputed: {
    tags: appendCategoryTag
  }
};
