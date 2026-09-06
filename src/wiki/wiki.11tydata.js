import slugify from '@sindresorhus/slugify';

// Directory data for the LLM wiki (src/wiki/). Whether this folder is built at all is decided by the dial in eleventy.config.js: "local" builds it only in the dev server, "public" builds it everywhere, "private" never builds it.
export default {
  layout: 'wiki.njk',

  // `searchable` is the existing non-post-type route into /search.json (features.yaml search.types); it is a SYSTEM_TAG, so it makes no /tags/ page.
  tags: ['searchable'],

  // JSON-LD type for head/schema.njk (via base.njk). TechArticle, not the post types' BlogPosting, because these pages are reference rather than posts — and because that template carries the author/editor split (Claude wrote it, Johan supervised). Without a `schema` key matching a src/_includes/schemas/*.njk template, the build fails.
  schema: 'TechArticle',

  // The pages are a techniques wiki, full of {% … %} / {{ … }} code examples, so they must
  // NOT pass through Nunjucks — render them as plain markdown only. Wikilinks still resolve:
  // the interlinker is a markdown-it plugin (amendLibrary('md', …)), not a Nunjucks feature.
  templateEngineOverride: 'md',

  // Filenames are Title Case (for Obsidian wikilinks); URLs are kebab. index.md's fileSlug
  // is the folder name "wiki", so it serves at /wiki/. A function (not a Nunjucks template
  // string) because the md-only override above would stop a permalink template rendering.
  permalink: data =>
    data.page.fileSlug === 'wiki'
      ? '/wiki/index.html'
      : `/wiki/${slugify(data.page.fileSlug)}/index.html`,

  eleventyComputed: {
    // The interlinker skips any page whose `data.title` is undefined (it needs a title to
    // register the page's [[links]]), and these pages carry no front matter — so derive one
    // from the filename. The filename already equals the wikilink text, so links resolve.
    title: data => (data.page.fileSlug === 'wiki' ? 'jedee wiki' : data.page.fileSlug)
  }
};
