---
description: "The host that builds and serves jedee: a build on every push, response headers and redirects from plain files, serverless functions for the two endpoints, and a cache carried between builds."
date: 2026-09-28
---

[Netlify](https://www.netlify.com/) is a host for static sites that also runs the build. It watches a git repository; on every push to the production branch it checks out a fresh copy, runs the build command, and publishes the output folder to its CDN. Anything that must change between deploys — HTTP headers, redirects, build settings — is declared in files in the repository rather than in a server config, mainly [`netlify.toml`](https://docs.netlify.com/configure-builds/file-based-configuration/) and a `_redirects` file in the published folder. [Netlify Functions](https://docs.netlify.com/functions/overview/) add the one thing a static site cannot do: run code per request, for an endpoint that receives posts.

Two properties of this model shape everything else. The build machine starts clean each time, so anything worth keeping between builds has to be carried explicitly. And the site is a snapshot of the moment it was built: data fetched at build time (webmentions, remote covers, the site's own URL) is only as current as the last deploy.

## In jedee

**Eleventy Excellent ships a `netlify.toml`**: the build cache plugin for `.cache/`, a block of security headers on every route, and `npm run build` into `dist/`. jedee keeps the headers (minus the obsolete `X-XSS-Protection`) and has changed the rest.

**The build command is `npm run build:11ty`, not `npm run build`.** `build` starts by deleting `dist/`, which on Netlify would throw away the optimized images the cache plugin has just restored into it. A fresh checkout has no stale `dist/` to clean, so the step is only useful for repeated builds on a laptop. The Node version comes from `.nvmrc`.

**The cache plugin carries two folders between deploys**: `.cache/` (eleventy-fetch's downloads — remote covers, webmentions, the static maps) and `dist/assets/images/` (eleventy-img's output, which it skips re-encoding when the file already exists). [[Three things called cache]] covers this cache next to the browser's and the service worker's, including why `.cache/` is excluded from Netlify's secret scanning: the static-map URLs stored there carry the map API key.

**Headers.** Besides the security headers on `/*`, `netlify.toml` sets caching per path:

| Path | Cache-Control | Why |
|---|---|---|
| `*.woff2` | a year, revalidate | fonts rarely change |
| `/img/*`, `/bundle/*` | a year, immutable | filenames change with their content |
| `/assets/scripts/components/*.js` | `max-age=0`, revalidate | stable filenames, so a long cache would keep an old copy |

⚠ The component scripts are the trap: they are built to unhashed filenames, so a long cache leaves returning visitors on an outdated script after a change, with nothing failing. If they ever get hashed filenames, the year-long cache can come back.

**Redirects.** `src/common/_redirects.njk` writes `dist/_redirects` from every page's `redirectFrom:` front matter, so a renamed post keeps its old address with a 301. The template is Eleventy Excellent's; see [[Permalinks and Obsidian-friendly filenames]] for how addresses are made.

**Functions.** Two files in `netlify/functions/`, bundled by esbuild (`[functions] node_bundler = "esbuild"`) and each routing itself through `export const config = { path }` rather than a redirect:

- `micropub.js` at `/api/micropub` — receives a post from a Micropub client and commits it to the repository as a Markdown file, which triggers the next deploy. See [[Micropub]].
- `health-export.js` at `/api/health-export` — an adapter for a workout-export app: it filters and translates a workout, then hands it to the Micropub code in-process, with the same authentication. See [[The activities archive]].

The Eleventy build never sees `netlify/`; its input folder is `src/`.

**Build-time values.** `meta.url` is read from Netlify's `URL` environment variable during the build, so the site's own address in feeds, canonical links and structured data is fixed at build time. Secrets (the GitHub token for the functions, the map API key, the webmention.io token) live in Netlify's environment settings, never in `netlify.toml`, which is committed. Webmentions are fetched at build, so a new reply appears after the next deploy; see [[Webmentions]].

Raw source: `src/_raw/dev-notes/How jedee deploys to Netlify.md`
