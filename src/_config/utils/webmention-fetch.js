// Fetches webmention.io's JF2 feed. Returns `false` on EVERY failure — no domain, no token, a bad response, an unparseable body — so the caller falls back to its cache and leaves `lastFetched` untouched, meaning the next build retries from the same point.
// ⚠ webmention.io 502s intermittently; before 2026-09-05 an unguarded throw here failed the whole production build, and on Netlify that means their flakiness blocks a deploy.
import EleventyFetch from '@11ty/eleventy-fetch';

const API = 'https://webmention.io/api';

// `fetcher` is injected only so the failure paths are testable — see _local/tests/webmention-fetch.test.js.
export const fetchWebmentions = async ({domain, token, since, perPage = 10000, fetcher = EleventyFetch}) => {
  if (!domain) {
    console.warn('>>> unable to fetch webmentions: no domain name specified');
    return false;
  }
  if (!token) {
    console.warn('>>> unable to fetch webmentions: no access token specified');
    return false;
  }

  let url = `${API}/mentions.jf2?domain=${domain}&token=${token}&per-page=${perPage}`;
  if (since) url += `&since=${since}`;

  let feed;
  try {
    feed = await fetcher(url, {duration: '0s', type: 'json'});
  } catch (error) {
    console.warn(`>>> unable to fetch webmentions, keeping the cache: ${error.message}`);
    return false;
  }

  // A 200 carrying something that isn't a JF2 feed is a failure too — merging it would advance `lastFetched` past mentions we never received.
  if (!Array.isArray(feed?.children)) {
    console.warn('>>> unable to fetch webmentions, keeping the cache: response was not a JF2 feed');
    return false;
  }

  console.log(`>>> ${feed.children.length} new webmentions fetched`);
  return feed;
};
