import slugify from '@sindresorhus/slugify';

// Directory data for the LLM wiki (src/wiki/). Whether this folder is built at all is decided by the dial in eleventy.config.js: "local" builds it only in the dev server, "public" builds it everywhere, "private" never builds it.
export default {
  layout: 'wiki.njk',

  // `searchable` is the existing non-post-type route into /search.json (settings.yaml search.types); it is a SYSTEM_TAG, so it makes no /tags/ page.
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
  // ⚠ decamelize: false, or slugify splits internal capitals — "The YouTube embed" became /wiki/the-you-tube-embed/.
  permalink: data =>
    data.page.fileSlug === 'wiki'
      ? '/wiki/index.html'
      : `/wiki/${slugify(data.page.fileSlug, {decamelize: false})}/index.html`,

  // Expanded into markdown-it-abbr definitions by the `glossary` preprocessor in eleventy.config.js, so every wiki page gets <abbr> for free. Only opaque jargon belongs here; CSS/HTML/JSON etc. would just be dotted-underline noise. ⚠ Do not rename this key to `abbreviations` — see the preprocessor's warning.
  glossary: {
    ARIA: 'Accessible Rich Internet Applications',
    BCP: 'Best Current Practice',
    CDN: 'content delivery network',
    CEST: 'Central European Summer Time',
    CLS: 'Cumulative Layout Shift',
    CUBE: 'Composition, Utility, Block, Exception',
    DTCG: 'Design Tokens Community Group',
    ES: 'ECMAScript',
    EXIF: 'Exchangeable Image File Format',
    FCP: 'First Contentful Paint',
    FIT: 'Flexible and Interoperable Data Transfer',
    FOFT: 'Flash of Faux Text',
    FOIT: 'Flash of Invisible Text',
    FOUT: 'Flash of Unstyled Text',
    GC: 'garbage collection',
    GPX: 'GPS Exchange Format',
    'JSON-LD': 'JSON for Linking Data',
    LFS: 'Large File Storage',
    LLM: 'large language model',
    OG: 'Open Graph',
    OOM: 'out of memory',
    PESOS: 'Publish Elsewhere, Syndicate to your Own Site',
    POSSE: 'Publish on your Own Site, Syndicate Elsewhere',
    PWA: 'progressive web app',
    RDFa: 'Resource Description Framework in Attributes',
    SR: 'screen reader',
    TZ: 'time zone',
    UA: 'user agent',
    UTC: 'Coordinated Universal Time',
    W3C: 'World Wide Web Consortium',
    WCAG: 'Web Content Accessibility Guidelines'
  },

  eleventyComputed: {
    // The interlinker skips any page whose `data.title` is undefined (it needs a title to
    // register the page's [[links]]), and these pages carry no front matter — so derive one
    // from the filename. The filename already equals the wikilink text, so links resolve.
    title: data => (data.page.fileSlug === 'wiki' ? 'jedee wiki' : data.page.fileSlug)
  }
};
