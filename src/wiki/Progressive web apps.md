---
description: "What actually makes a site installable — HTTPS, a manifest and a service worker — and what changes when someone installs it, which is less than the name suggests."
date: 2026-09-04
---

A **progressive web app** is an ordinary website that a browser will offer to install: it gets an icon on the home screen or in the launcher, opens without browser chrome, and — if it has cached anything — works with the network gone. There is no separate artifact, no store, no second codebase. The same URLs serve the same HTML to a browser tab and to the installed app.

The name is the least useful part of it. "Application" implies a thing with state and interaction, and the term has been [argued over](https://adactio.com/journal/12461) for exactly that reason; a blog, a shop or a page of cat pictures qualifies on the same terms as a mail client. Nor does it require a JavaScript framework — a folder of static HTML is a perfectly valid PWA. Both misreadings are addressed head-on in [Max Böck's "How to turn your website into a PWA"](https://mxb.dev/blog/how-to-turn-your-website-into-a-pwa/), which is where this site's service worker came from.

The "progressive" half is the honest half: every piece of it is an enhancement layered on a site that already works. A browser that supports none of it renders the site.

## The three requirements

**HTTPS.** Service workers are restricted to secure origins, so the whole thing depends on it. In 2026 this is a solved problem — hosts provision certificates automatically — but it is still the hard requirement rather than a recommendation. `localhost` is exempted, which is what makes local development possible at all.

**A [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)** — a JSON file, conventionally `manifest.json` or `site.webmanifest`, linked from the head:

```html
<link rel="manifest" href="/site.webmanifest">
```

It carries the name shown under the icon, the icons themselves at the sizes each platform wants, a `start_url`, a `theme_color` and `background_color`, and a `display` mode. `display: standalone` is the one that makes an installed site open without browser chrome; `browser` opts out of that and `fullscreen` and `minimal-ui` sit either side of it.

**A [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)**, registered from the page:

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/serviceworker.js')
}
```

The optional `scope` argument limits which requests the worker may intercept, as a path relative to the origin root; omitted, it defaults to the directory the worker script is served from — which is why the script conventionally sits at the root. What the worker *does* with the requests it intercepts is a separate subject: see [[The service worker's three strategies]].

## What installing actually changes

Less than the name suggests, and that is the point rather than a disappointment. `display: standalone` removes the URL bar and the browser's toolbar; the page keeps its width and gains their height. The OS status bar stays.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/pwa-display-modes.png" alt="Two phone frames side by side showing the same page. On the left, in a browser, an address bar sits below the status bar and a toolbar of navigation icons across the bottom, leaving a shorter page area. On the right, installed, the page begins directly under the status bar and runs to the bottom edge with no browser furniture at all." width="1228" height="1124">
  <figcaption>The same page, in a browser tab and installed. The two bands the left frame spends on browser furniture are the whole of what <code>display: standalone</code> gives back.</figcaption>
</figure>

The mockup is `src/wiki/_sources/pwa-display-modes.html`; `npm run mockups` re-shoots it. ⚠ **Both status bars are deliberately the same color.** The browser tints its own status bar from the same `<meta name="theme-color">` the installed app uses, so painting the left one a browser gray would have drawn a difference that does not exist. The chrome is the only variable in the picture.

What it does *not* change is more interesting. The URLs are the same, so a link into the app still works and a page can still be shared. There is no install step for updates — a deploy is live immediately, subject only to whatever the service worker caches. And nothing about the layout changes: an installed site is as responsive or as broken as the site was.

The one genuine loss is the browser's back button. The platform gesture still works, but nothing on screen offers to go back, so a site that relied on browser chrome for wayfinding is worse installed than in a tab.

## Age note on the source

The Böck article is from **2017-07-07**, and three of its specifics have been overtaken. `sw-precache` is retired — [Workbox](https://developer.chrome.com/docs/workbox) is its successor. The Lighthouse Chrome extension it recommends installing is no longer needed: Lighthouse has been a built-in DevTools panel for years. And "a better Google ranking" as a reason to adopt HTTPS reads as a 2017 argument; HTTPS is simply the default now. The three-step shape of the article — manifest, HTTPS, service worker — is unchanged, and the misconceptions it opens with are, if anything, more worth stating now than then.

## In jedee

The site is installable, and a page you have visited comes back fully styled with the network gone.

**Most of it is Eleventy Excellent stock**, which is worth stating because it is easy to assume otherwise. `src/common/site-manifest.njk` (a Nunjucks template with `permalink: /site.webmanifest`, so every value comes from `src/_data/meta.js`), the `<link rel="manifest">` in `meta-info.njk`, and both `<meta name="theme-color">` tags are all upstream. An unmodified EE site already ships a manifest and is one service worker away from installable.

jedee's only manifest divergence is `name`. EE writes `"{{ meta.siteName }} - {{ meta.siteDescription }}"`; here `name` and `short_name` are both just `meta.siteName`. "Johan Edlund" is twelve characters, inside the budget a launcher gives `short_name` anyway, so there is nothing to abbreviate and nothing to gain from a longer `name` that only ever appears in the install dialog.

**The service worker is jedee's own**, and it is [Max Böck's](https://github.com/maxboeck/eleventastic/blob/master/src/serviceworker.njk) — credited in a comment at the top of `src/pages/serviceworker.njk` — extended with runtime caching on 23 June 2026. Registration is six lines at the foot of `base.njk`, with no `scope` argument (the default, the origin root, is what is wanted) and no `.then()`/`.catch()` logging, since a failed registration is not something a visitor can act on.

⚠ **`start_url` is `meta.url`, resolved at build time.** Change the domain or the deploy environment and the manifest is wrong until the site is rebuilt — the same build-time coupling that bites elsewhere in this repo.

**Two colors, and the manifest usually loses.** `theme_color` is the brand slate `#495464`, but the `<meta name="theme-color">` tags override it the moment a page renders. So the manifest's color only paints the surfaces that exist *before* any page does — the splash screen and the app-switcher card. Everything after that is `themeLight` or `themeDark`. [[Favicons]] has the full account, and the six device frames showing the icon on each of those surfaces.

`/offline/` is a plain page precached on install, returned only for a URL that has never been visited; everything visited comes back from the runtime cache instead. [[The service worker's three strategies]] covers why.

**What is deliberately absent:** no install-prompt UI — `beforeinstallprompt` is not intercepted anywhere, so the browser's own prompt is the only affordance. No push notifications, no background sync, no share target, no `shortcuts`, and no `screenshots` array, which is what a richer install dialog would draw on. For a personal site that people mostly read in a tab, the installable path is a bonus rather than the intended one.

Related: [[The service worker's three strategies]] — what the worker does with the requests it intercepts. [[Favicons]] — the icon set the manifest points at, and where each size is actually used. [[Three things called cache]] — the service-worker cache is only one of three.

Raw source: `src/_raw/dev-notes/How the site is a PWA.md`, and the clip `src/_raw/How to turn your website into a PWA.md` (Max Böck, 2017-07-07).
