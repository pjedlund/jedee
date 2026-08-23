// Directory data for the photo post type. Ported from photos.json so we can compute build-time EXIF. `photoExif` is a TOP-LEVEL computed key (not nested under `photo`) to avoid a same-key self-reference in the data cascade; the authored `photo.film` / `photo.development` / `photo.downloads` stay on `photo`. See src/_config/utils/exif.js for what's extracted (and what's deliberately not).
import { extractPhotoExif } from '../../_config/utils/exif.js';

export default {
  layout: 'photo',
  tags: 'posts',
  category: 'photo',
  permalink: '/photos/{{ page.fileSlug | slugify }}/index.html',
  eleventyComputed: {
    photoExif: async data => (data.photo && data.photo.src ? await extractPhotoExif(data.photo.src) : null)
  }
};
