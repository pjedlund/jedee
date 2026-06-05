// Five small, composable webmention filters. Ported from Lene Saile's pattern —
// the TEMPLATE (partials/webmentions.njk) does the grouping; these just slice the
// flat JF2 `children` array. Registered in eleventy.config.js and re-exported from
// the filters.js barrel. Unit-tested in _tests/webmentions.test.js.

/** All mentions whose `wm-target` is this page's absolute URL. */
export const webmentionGetForUrl = (webmentions, url) => {
  return webmentions.children.filter(entry => entry['wm-target'] === url);
};

/** Safe length (0 for null/undefined). */
export const webmentionSize = mentions => {
  return !mentions ? 0 : mentions.length;
};

/** Mentions carrying a given JF2 property key, e.g. 'like-of', 'in-reply-to'. */
export const webmentionByType = (mentions, mentionType) => {
  return mentions.filter(entry => !!entry[mentionType]);
};

/** True if the mention is from one of Johan's own identities — so the template
 *  can exclude self-mentions (e.g. POSSE copies bouncing back via Bridgy). */
export const webmentionisOwn = webmention => {
  const urls = [
    'https://johanedlund.se',
    'https://bsky.app/profile/johanedlund.se',
    'https://mastodon.social/@pjedlund'
  ];
  const authorUrl = webmention.author ? webmention.author.url : false;
  return authorUrl && urls.includes(authorUrl);
};

/** Oldest-first by `published`. NB: sorts in place (matches Lene's original). */
export const webmentionSort = mentions => {
  return mentions.sort((a, b) => {
    if (a['published'] < b['published']) {
      return -1;
    }
    if (a['published'] > b['published']) {
      return 1;
    }
    return 0;
  });
};
