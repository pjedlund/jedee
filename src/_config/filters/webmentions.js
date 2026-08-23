// Three small, composable webmention filters. Ported from Lene Saile's pattern — the TEMPLATE (partials/webmentions.njk) does the grouping; these just slice the flat JF2 `children` array. Registered in eleventy.config.js and re-exported from the filters.js barrel. Unit-tested in _local/tests/webmentions.test.js.

/** All mentions whose `wm-target` is this page's absolute URL. */
export const webmentionGetForUrl = (webmentions, url) => {
  return webmentions.children.filter(entry => entry['wm-target'] === url);
};

/** True if the mention is one of Johan's own / a self-echo — so the template can
 * exclude it. Two cases:
 * (1) Bridgy backfeeds the silo POST itself: its `wm-source` is a brid.gy
 *      `/post/` URL (vs `/comment/`, `/like/`, `/repost/`). This happens when the
 *      syndicated copy links back to the original — e.g. a Flickr photo whose
 *      description links here surfaces as a `mention-of` carrying the photo's own
 *      caption. It is never a genuine third-party response, so always drop it.
 * (2) the author is one of Johan's own identities (POSSE copies bouncing back).
 *      NB: this does NOT include his silo profiles (e.g. Flickr), so his own
 *      genuine comments — `/comment/` — still render. */
export const webmentionisOwn = webmention => {
  // (1) Self-syndication echo: the silo post mentioning itself.
  const source = webmention['wm-source'] || '';
  if (/^https?:\/\/brid\.gy\/post\//.test(source)) return true;

  // (2) Author is one of Johan's own identities.
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
