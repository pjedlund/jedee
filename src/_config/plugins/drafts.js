// Interprets JEDEE's post-status / visibility vocabulary centrally — the single place the `draft` and `visibility` frontmatter keys take effect, so all three authoring paths (hand-written · Obsidian Web Clipper · Micropub) share one contract. The Micropub endpoint translates the Micropub-extension fields into these native keys at the edge (see netlify/functions/micropub.js); everything downstream only ever sees `draft` / `visibility`.
//
//   draft: true            -> no public output at all (permalink:false + excluded
//                             from collections), except in serve/watch builds.
//   visibility: 'unlisted' -> URL resolves, but excluded from every collection
//                             (=> archives + per-type feeds + the firehose) and
//                             the sitemap, and emitted with `noindex`. A permanent
//                             property, so — unlike drafts — never build-mode-gated.
//   visibility: 'private'  -> the endpoint writes it as draft:true (no true
//                             "private" on a public static build); nothing extra
//                             is needed here.
export const drafts = eleventyConfig => {
  const isUnlisted = data => data.visibility === 'unlisted';

  eleventyConfig.addGlobalData('eleventyComputed.permalink', function () {
    return data => {
      // Always skip during non-watch/serve builds
      if (data.draft && !process.env.BUILD_DRAFTS) {
        return false; // Ensure templates that use this handle it correctly
      }
      return data.permalink;
    };
  });

  // When `eleventyExcludeFromCollections` is true, the file is not included in any collections
  eleventyConfig.addGlobalData('eleventyComputed.eleventyExcludeFromCollections', function () {
    return data => {
      // Always exclude from non-watch/serve builds
      if (data.draft && !process.env.BUILD_DRAFTS) {
        return true;
      }

      // Unlisted: permanently out of every collection (archives, feeds, firehose) while its permalink still resolves — a real property, not build-gated.
      if (isUnlisted(data)) {
        return true;
      }

      return data.eleventyExcludeFromCollections ?? false;
    };
  });

  // Unlisted posts also drop from the sitemap. Redundant once they're excluded from collections (sitemap.njk loops collections.showInSitemap, which already honors the exclusion), but explicit and harmless; passes through any value set elsewhere (the feed/sitemap templates set it true on themselves).
  eleventyConfig.addGlobalData('eleventyComputed.excludeFromSitemap', function () {
    return data => {
      if (isUnlisted(data)) {
        return true;
      }
      return data.excludeFromSitemap ?? false;
    };
  });

  // Per-post noindex hook, read by head/meta-info.njk alongside meta.noindexSite. Unlisted posts stay noindexed even after the site-wide soft-launch flag flips at 1.0.0. Passes through any explicit per-post `noindex`.
  eleventyConfig.addGlobalData('eleventyComputed.noindex', function () {
    return data => {
      if (isUnlisted(data)) {
        return true;
      }
      return data.noindex ?? false;
    };
  });

  eleventyConfig.on('eleventy.before', ({runMode}) => {
    // Set the environment variable
    if (runMode === 'serve' || runMode === 'watch') {
      process.env.BUILD_DRAFTS = true;
    }
  });
};
