---
description: "Fetching the next page before the click with the Speculation Rules API: eagerness and limits, how it works alongside a service worker, and why jedee uses Eleventy Excellent's hover rule rather than a script or a list built from analytics."
date: 2026-09-15
---

Prefetching means downloading a page the visitor is likely to open next, before they open it, so the click shows it without waiting for the network. Only the HTML document is fetched; the images, scripts and stylesheets of that page are not.

The current way to ask for it is the [Speculation Rules API](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API): a `<script type="speculationrules">` block of JSON naming which links qualify and how eager the browser should be. A browser that doesn't support it ignores the block, so it is progressive enhancement with no JavaScript to run.

```html
<script type="speculationrules">
  {
    "prefetch": [
      {"where": {"href_matches": "/*"}, "eagerness": "moderate"}
    ]
  }
</script>
```

`where` picks links out of the page, by URL pattern (`href_matches`, in [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) syntax) or by CSS selector (`selector_matches`), combined with `and`, `or` and `not`. The alternative to `where` is `urls`, a fixed list. The same rules can ask for `prerender` instead of `prefetch`, which also runs the page in the background; that costs far more and is not covered here.

Eagerness decides when a matching link is fetched, and Chrome caps how many can be held at once ([Chrome for Developers](https://developer.chrome.com/docs/web-platform/prerender-pages)):

Table: Eagerness levels and Chrome's limits
| Eagerness | Fetches | Held at once |
|---|---|---|
| `immediate` | As soon as the rule is seen | 50 |
| `eager` | Earlier than `moderate`, by Chrome's own heuristic | 2, oldest dropped |
| `moderate` | When the pointer rests on the link for about 200 ms, or on pointerdown | 2, oldest dropped |
| `conservative` | On pointerdown or touchstart | 2, oldest dropped |

⚠ **The limit of two shows up as an error, and isn't one.** Hover three links in a row and DevTools reports the first as "discarded because the initiating page has too many prefetches ongoing, and this was one of the oldest". The link the visitor is about to click is almost always the most recent one hovered, so it is still there.

Support, as of September 2026 ([Can I use](https://caniuse.com/mdn-html_elements_script_type_speculationrules)): Chromium browsers (Chrome, Edge, Opera, Samsung Internet). Safari has it built in but disabled by default since 26.2, so it will switch on with no change to the page. Firefox has no support. The older `<link rel="prefetch">` is supported in Firefox and disabled by default in Safari.

### A prefetch and a service worker do different jobs

A [[The service worker's three strategies|service worker]]'s cache makes a page available with no network at all. Whether it also makes an online click faster depends on its strategy for pages: a network-first worker asks the network every time, so online it saves nothing on the page itself. The prefetch is what removes that wait, and the two don't compete.

⚠ **Until Chrome 138 (June 2025), a service worker switched prefetching off.** Chrome cancelled any speculation-rules prefetch whose URL was controlled by a service worker. A worker usually installs on the first page view, so on such a site the rules did nothing from the second page on, which is every page that matters. Since 138 the prefetch goes through the worker's `fetch` handler, and the response is kept for the navigation ([release notes](https://developer.chrome.com/release-notes/138)). The enterprise policy `PrefetchWithServiceWorkerEnabled` controls it.

### Prefetching with a script

Before the API, libraries did this in JavaScript. [instant.page](https://instant.page/) (v5.2.0, 1 KB) prefetches after a 65 ms hover; Google's [Quicklink](https://github.com/GoogleChromeLabs/quicklink) (under 2 KB) prefetches every link in the viewport once the browser is idle. Their reach beyond Chromium is smaller than it looks:

- instant.page uses speculation rules where they exist and `<link rel="prefetch">` otherwise. In a browser with neither, Safari by default, it exits and does nothing ([its source](https://github.com/instantpage/instant.page/blob/master/instantpage.js)).
- Quicklink falls back to `fetch()` or XHR, which only helps if something later reuses that response.
- Firefox treats a prefetched page like any other cached response and follows its cache headers ([Tim Kadlec](https://timkadlec.com/remembers/2020-06-17-prefetching-at-this-age/), 2020, not rechecked since). A page served `max-age=0, must-revalidate` is checked with the server again on the click, so the prefetch saves the download but not the round-trip.

### Prefetching from analytics

[Guess.js](https://github.com/guess-js/guess) (Google, alpha) built models of page-to-page transitions from Google Analytics and prefetched the likely next pages. Its npm package was last published in May 2022 and the repository has had only bot commits since. The approach needs traffic to learn from: on a small site, a model of "from A, people go to B" is noise, and every wrong guess spends the visitor's data on a page they never open.

## In jedee

The rule is Eleventy Excellent's, added in 4.8 (upstream commit `1107a1b`): `src/_includes/head/speculation-rules.njk`, included in `base.njk` right after `head/meta-info.njk`, at `moderate`. The 4.8.0 merge left it out with the other files upstream added (see [[What jedee kept from Eleventy Excellent]]), and it was taken on its own afterward, with one change of jedee's: URLs that are not pages are excluded.

```json
"where": {
  "and": [
    {"href_matches": "/*"},
    {"not": {"href_matches": ["/admin/*", "/api/*", "/assets/*", "/*.xml", "/*.json", "/*.txt"]}}
  ]
}
```

The built pages carried 510 links to feeds (`.xml`) and 136 to full-size `.jpeg` images under `/assets/`; hovering those would download files nobody asked to open. `/admin/` is [[Sveltia CMS]] and `/api/` the [[Micropub]] endpoint. No page links to either today, and excluding them costs nothing. `/*` already keeps other sites' links out, since the pattern resolves against the page's own origin. The exclusions can be checked in any browser console, prefetching or not: `new URLPattern('/*.xml', location.origin).test(location.origin + '/reading/feed.xml')` is `true`.

It pays off here because of how the rest is cached. Pages are network-first in the service worker, and Netlify serves HTML `max-age=0, must-revalidate` ([[Three things called cache]]), so every online click waits for at least a round-trip. The CSS is inlined into the HTML and the worker already holds the fonts, so the HTML is what a click waits for, and it is the one thing a prefetch fetches.

- Works for returning visitors, through the worker. Verified in Chrome on the live site on 2026-09-15.
- The worker copies every page it fetches from the network into its cache. If a prefetch reaches the worker as a navigation, a page that was only hovered is saved for offline use too. Not verified; harmless either way, since the cache is cleared on every deploy.
- Umami counts a page view when its script runs, and a prefetch downloads HTML without running scripts, so the analytics are not inflated.

Declined, both on 2026-09-15:

- **instant.page and Quicklink.** In Safari, a Quicklink `fetch()` of a page is not a navigation, so jedee's worker files it under the cache-first asset branch, while the click takes the network-first page branch: the copy is never used online. That is read from the worker's code, not tested in Safari. In Firefox, the `max-age=0` header sends the click back to the server anyway.
- **A list built from Umami's statistics.** Too little traffic to predict from. If it is ever warranted, it is a second rule with a hard-coded `urls` list of two or three pages, not a script or an API call at build time.

### Testing it

⚠ **Three places report a failure that isn't one:**

- **Helium** ships "Preload pages" switched off. Its `modify-default-prefs.patch` changes Chromium's `NetworkPredictionOptions` default to disabled, so every hover shows as a failure in DevTools → Application → Speculative loads. Switch it on under Settings → Performance, or test in Chrome.
- **Claude Code's Browser pane** reports `HTMLScriptElement.supports('speculationrules')` as `true` and parses the rules, but never carries out a prefetch, not even for an `immediate` rule.
- **localhost** can't show the worker's side of it, because the worker's dev bypass makes it intercept nothing there.

In Chrome, the Speculative loads panel lists each hovered link as prefetched. On the page reached by the click, `performance.getEntriesByType('navigation')[0].deliveryType` reads `navigational-prefetch` when it came from a prefetch.

Raw source: src/_raw/dev-notes/How hover prefetching was added.md
