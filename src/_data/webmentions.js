// Build-time webmention fetch with our own persistent cache, ported from Lene Saile's pattern: we keep `.cache/webmentions.json` and fetch INCREMENTALLY with `&since=<lastFetched>`, merging by `wm-id`. `duration: '0s'` because WE own the cache, not eleventy-fetch.
//
// Fetching is PRODUCTION-only: dev/test builds just read whatever is already in `.cache` (seed it with a JF2 fixture to preview rendering locally). EVERY fetch failure degrades gracefully — missing domain or token, a 502, an unparseable body — because `fetchWebmentions` returns `false` and we fall back to the cache without advancing `lastFetched`, so the build is always green and the section renders empty until `WEBMENTION_IO_TOKEN` is set (in local `.env` + Netlify build env).
//
// The cache survives across deploys via `netlify-plugin-cache` (netlify.toml), which is what makes the incremental `since` model work on Netlify.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {domain} from './meta.js';
import {fetchWebmentions} from '../_config/utils/webmention-fetch.js';

dotenv.config();

const CACHE_DIR = '.cache';
const CACHE_FILE = path.join(CACHE_DIR, 'webmentions.json');
const TOKEN = process.env.WEBMENTION_IO_TOKEN;

function mergeWebmentions(a, b) {
  const map = new Map();
  [...(a.children || []), ...(b.children || [])].forEach(entry => map.set(entry['wm-id'], entry));
  return [...map.values()];
}

function writeToCache(data) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  console.log(`>>> webmentions saved to ${CACHE_FILE}`);
}

function readFromCache() {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  }
  return {lastFetched: null, children: []};
}

export default async function () {
  const cache = readFromCache();

  if (cache.children.length) {
    console.log(`>>> ${cache.children.length} webmentions loaded from cache`);
  }

  if (process.env.ELEVENTY_ENV === 'production') {
    const feed = await fetchWebmentions({domain, token: TOKEN, since: cache.lastFetched});
    if (feed) {
      const webmentions = {
        lastFetched: new Date().toISOString(),
        children: mergeWebmentions(cache, feed)
      };
      writeToCache(webmentions);
      return webmentions;
    }
  }

  return cache;
}
