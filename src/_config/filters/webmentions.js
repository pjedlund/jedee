// Three small, composable webmention filters. Ported from Lene Saile's pattern — the TEMPLATE (partials/webmentions.njk) does the grouping; these just slice the flat JF2 `children` array. Registered in eleventy.config.js and re-exported from the filters.js barrel. Unit-tested in _local/tests/webmentions.test.js.

/** All mentions whose `wm-target` is this page's absolute URL. */
export const webmentionGetForUrl = (webmentions, url) => {
  return webmentions.children.filter(entry => entry['wm-target'] === url);
};

/** True if the mention is one of Johan's own / a self-echo, so the template can exclude it. Two cases:
 * (1) Bridgy backfeeds the silo POST itself: `wm-source` is a brid.gy `/post/` URL (vs `/comment/`, `/like/`, `/repost/`) — never a genuine response, always drop.
 * (2) the author is one of Johan's own identities (POSSE copies bouncing back). NB: silo profiles (e.g. Flickr) are excluded, so his own genuine `/comment/` mentions still render. */
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
