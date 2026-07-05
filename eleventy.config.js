/**
 * Most adjustments must be made in `./src/_config/*`
 *
 * Hint VS Code for eleventyConfig autocompletion.
 * © Henry Desroches - https://gist.github.com/xdesro/69583b25d281d055cd12b144381123bf
 * @param {import("@11ty/eleventy/src/UserConfig")} eleventyConfig -
 * @returns {Object} -
 */

// register dotenv for process.env.* variables to pickup
import dotenv from 'dotenv';
dotenv.config();

// add yaml support
import yaml from 'js-yaml';

//  config import
import { POST_TYPES, byCategory, showInSitemap, tagList } from './src/_config/collections.js';
import events from './src/_config/events.js';
import filters from './src/_config/filters.js';
import plugins from './src/_config/plugins.js';
import shortcodes from './src/_config/shortcodes.js';

export default async function(eleventyConfig) {
  // --------------------- Events: before build
  eleventyConfig.on('eleventy.before', async () => {
    await events.buildAllCss();
    await events.buildAllJs();
  });

  // create a build time for serviceworker.njk
  // TODO: is this the correct way?
  eleventyConfig.addGlobalData('buildTime', () => new Date());

  // --------------------- custom watch targets
  eleventyConfig.addWatchTarget('./src/assets/**/*.{css,js,svg,png,jpeg}');
  eleventyConfig.addWatchTarget('./src/_includes/**/*.{webc}');

  // --------------------- layout aliases
  eleventyConfig.addLayoutAlias('base', 'base.njk');
  eleventyConfig.addLayoutAlias('page', 'page.njk');
  eleventyConfig.addLayoutAlias('note', 'note.njk');
  eleventyConfig.addLayoutAlias('reading', 'reading.njk');
  eleventyConfig.addLayoutAlias('watching', 'watching.njk');
  eleventyConfig.addLayoutAlias('jam', 'jam.njk');
  eleventyConfig.addLayoutAlias('bookmark', 'bookmark.njk');
  eleventyConfig.addLayoutAlias('reply', 'reply.njk');
  eleventyConfig.addLayoutAlias('rsvp', 'rsvp.njk');
  eleventyConfig.addLayoutAlias('like', 'like.njk');
  eleventyConfig.addLayoutAlias('repost', 'repost.njk');
  eleventyConfig.addLayoutAlias('photo', 'photo.njk');
  eleventyConfig.addLayoutAlias('recipe', 'recipe.njk');
  eleventyConfig.addLayoutAlias('event', 'event.njk');
  eleventyConfig.addLayoutAlias('audio', 'audio.njk');
  eleventyConfig.addLayoutAlias('video', 'video.njk');
  eleventyConfig.addLayoutAlias('activity', 'activity.njk');
  eleventyConfig.addLayoutAlias('post', 'post.njk');
  eleventyConfig.addLayoutAlias('tags', 'tags.njk');

  //	---------------------  Collections
  // Per-type collections each filter on `data.category` (set in
  // src/posts/<type>/<type>.json). POST_TYPES drives registration — add a new
  // type's category to that array in collections.js. collections.posts (firehose)
  // is still auto-created by Eleventy from the `tags: "posts"` string in each
  // folder JSON.
  POST_TYPES.forEach(type => eleventyConfig.addCollection(type, byCategory(type)));
  eleventyConfig.addCollection('showInSitemap', showInSitemap);
  eleventyConfig.addCollection('tagList', tagList);

  // ---------------------  Plugins
  eleventyConfig.addPlugin(plugins.interlinker);

  eleventyConfig.addPlugin(plugins.htmlConfig);
  eleventyConfig.addPlugin(plugins.drafts);

  eleventyConfig.addPlugin(plugins.EleventyRenderPlugin);
  eleventyConfig.addPlugin(plugins.rss);
  eleventyConfig.addPlugin(plugins.syntaxHighlight);

  eleventyConfig.addPlugin(plugins.webc, {
    components: ['./src/_includes/webc/**/*.webc'],
    useTransform: true
  });

  eleventyConfig.addPlugin(plugins.eleventyImageTransformPlugin, {
    transform: (sharp) => {
      sharp.keepMetadata();
    },
    formats: ['webp', 'jpeg'],
    widths: ['auto'],
    htmlOptions: {
      imgAttributes: {
        loading: 'lazy',
        decoding: 'async'
      },
      pictureAttributes: {}
    }
  });

  // ---------------------  bundle
  eleventyConfig.addBundle('css', { hoist: true });

  // 	--------------------- Library and Data
  eleventyConfig.setLibrary('md', plugins.markdownLib);
  eleventyConfig.addDataExtension('yaml', contents => yaml.load(contents));

  // --------------------- Filters
  eleventyConfig.addFilter('toIsoString', filters.toISOString);
  eleventyConfig.addFilter('formatDate', filters.formatDate);
  eleventyConfig.addFilter('markdownFormat', filters.markdownFormat);
  eleventyConfig.addFilter('splitlines', filters.splitlines);
  eleventyConfig.addFilter('striptags', filters.striptags);
  eleventyConfig.addFilter('shuffle', filters.shuffleArray);
  eleventyConfig.addFilter('alphabetic', filters.sortAlphabetically);
  eleventyConfig.addFilter('slugify', filters.slugifyString);
  eleventyConfig.addFilter('unwikilink', filters.unwikilink);
  eleventyConfig.addFilter('hostname', filters.hostname);
  eleventyConfig.addFilter('dtcgItems', filters.dtcgItems);
  // Recipe durations (§9): integer minutes OR PT…M → normalized PT…M + human-readable.
  eleventyConfig.addFilter('toISODuration', filters.toISODuration);
  eleventyConfig.addFilter('formatDuration', filters.formatDuration);
  // Activity pace/speed (/activities/): derive min/km (+ /mi) or km/h (+ mph) from
  // stored raw distance + duration at render — the activity post type never stores
  // the derived value. withMiles pairs a stored km distance with its mi equivalent.
  eleventyConfig.addFilter('paceOrSpeed', filters.paceOrSpeed);
  eleventyConfig.addFilter('withMiles', filters.withMiles);
  // Event archive partition (§9): build-time upcoming/past split + event-date sorts.
  eleventyConfig.addFilter('filterUpcoming', filters.filterUpcoming);
  eleventyConfig.addFilter('filterPast', filters.filterPast);
  eleventyConfig.addFilter('sortByStartAsc', filters.sortByStartAsc);
  eleventyConfig.addFilter('sortByStartDesc', filters.sortByStartDesc);
  // Audio/Video podcast feed (spec §8–§10): itunes:duration clock + <enclosure>
  // byte-length/MIME stat'd from the source media file at build.
  eleventyConfig.addFilter('itunesDuration', filters.itunesDuration);
  eleventyConfig.addFilter('enclosureBytes', filters.enclosureBytes);
  eleventyConfig.addFilter('enclosureType', filters.enclosureType);
  // Webmention render (Phase 2): three composable slicers; the partial groups.
  eleventyConfig.addFilter('webmentionGetForUrl', filters.webmentionGetForUrl);
  eleventyConfig.addFilter('webmentionisOwn', filters.webmentionisOwn);
  eleventyConfig.addFilter('webmentionSort', filters.webmentionSort);

  // --------------------- Shortcodes
  eleventyConfig.addShortcode('svg', shortcodes.svgShortcode);
  eleventyConfig.addShortcode('image', shortcodes.imageShortcode);
  eleventyConfig.addShortcode('imageKeys', shortcodes.imageKeysShortcode);
  eleventyConfig.addShortcode('lightbox', shortcodes.lightboxShortcode);
  eleventyConfig.addShortcode('year', () => `${new Date().getFullYear()}`);

  // --------------------- Events: after build
  if (process.env.ELEVENTY_RUN_MODE === 'serve') {
    eleventyConfig.on('eleventy.after', events.svgToJpeg);
  }

  // --------------------- Passthrough File Copy
  // -- same path
  // Audio/Video self-hosted media: Eleventy Image only moves images, so the
  // co-located .mp3/.mp4/.vtt files need an explicit passthrough for the
  // on-page <audio>/<video> src and the feed <enclosure> URL to resolve.
  // `jams-social` holds the This Is My Jam liker/commenter avatars, recovered from
  // the Wayback Machine and self-hosted; rendered with `eleventy:ignore` (like the
  // template fallback avatar), so they need an explicit passthrough to reach dist.
  ['src/assets/fonts/', 'src/assets/images/template', 'src/assets/images/recipes', 'src/assets/images/jams-social', 'src/assets/og-images', 'src/assets/audio', 'src/assets/video'].forEach(path =>
    eleventyConfig.addPassthroughCopy(path)
  );

  eleventyConfig.addPassthroughCopy({
    // -- to root
    'src/assets/images/favicon/*': '/',
    'src/assets/images/avatar/*': '/',

    // -- node_modules
    'node_modules/lite-youtube-embed/src/lite-yt-embed.{css,js}': `assets/components/`,
    // Single-file (non-glob) source: must name the destination file explicitly.
    // A trailing-slash dir target writes a file literally named `components`,
    // clobbering the lite-youtube glob's directory (Eleventy 3.x behaviour).
    'node_modules/photoswipe/dist/photoswipe.css': `assets/components/photoswipe.css`
  });

  // ----------------------  ignore test files
  if (process.env.ELEVENTY_ENV != 'test') {
    eleventyConfig.ignores.add('src/common/pa11y.njk');
  }

  // --------------------- general config
  return {
    markdownTemplateEngine: 'njk',

    dir: {
      output: 'dist',
      input: 'src',
      includes: '_includes',
      layouts: '_layouts'
    }
  };
}