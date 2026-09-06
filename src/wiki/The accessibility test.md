---
description: "What a rule engine can and cannot check, why coverage matters more than the tool, and how jedee runs pa11y-ci against a locally served build."
date: 2026-07-31
---

Automated accessibility testing runs a rule engine over rendered pages and reports violations of machine-checkable [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) criteria: missing alt text, insufficient contrast, unlabeled form controls, a missing `lang` on the `<html>` element ([[The lang attribute]]), broken heading order. Two engines do most of the work in practice — [axe-core](https://github.com/dequelabs/axe-core) and HTML CodeSniffer. [pa11y](https://pa11y.org/) is a command-line wrapper that drives a headless browser and runs one of them; `pa11y-ci` is the batch version, taking a list of URLs and exiting non-zero when any of them fails.

**The ceiling is that automated rules catch a minority of real accessibility problems** — the figure usually cited is about a third. A rule can tell that an image has no `alt`; it cannot tell that the `alt` is wrong, nor that a correct-looking one is redundant with the heading beside it (see [[Alt text]]). It can find a control with no accessible name; it cannot find a focus order that makes no sense, a keyboard trap that only appears mid-interaction, or a heading structure that is technically valid and tells the reader nothing. Automated testing is a floor, not a grade.

Two practical consequences follow, and both are about scope rather than rules:

- **Coverage is the setting that matters most.** A suite only checks the URLs in its list. A green run against four pages says nothing about the fiftieth template, and it is very easy to read the first as if it were the second.
- **The test sees exactly one rendering.** One viewport, one color scheme, one state of every interactive component. Anything behind a media query — dark mode especially — goes unchecked unless something deliberately forces it.

## In jedee

jedee runs pa11y-ci against a locally served build. The whole thing is Eleventy Excellent stock, inherited unchanged — what jedee changed is not the machinery but **which pages it points at**, and that turns out to matter more than the machinery does.

```bash
npm run test:a11y
```

### The config is generated, not written

`src/common/pa11y.njk` is a template whose output is `dist/pa11y.json` — the pa11y-ci config file. It reads `meta.tests.pa11y` and emits:

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 10000,
    "ignore": [],
    "chromeLaunchConfig": {"args": ["--no-sandbox", "--disable-setuid-sandbox"]}
  },
  "urls": [ … ]
}
```

Never hand-edit `dist/pa11y.json`: `npm run clean` deletes it and the next test build regenerates it. Change the template or `meta.js` instead.

⚠ **The test build is heavier than production, not lighter.** `eleventy.config.js` ignores the template outside the test environment:

```js
if (process.env.ELEVENTY_ENV != 'test') {
  eleventyConfig.ignores.add('src/common/pa11y.njk');
}
```

So `pa11y.json` exists only in an `ELEVENTY_ENV=test` build. That is also why `test:a11y` runs its own `pa11y:build` first and then serves it — it cannot reuse a production `dist/`.

The four steps behind the one command: clean and build in test mode → start `eleventy --serve` on `localhost:8080` with `--ignore-initial` so it serves the build that already exists → sleep → run `pa11y-ci` against the generated config.

### ⚠ "The a11y test passes" means six pages

`src/_data/meta.js`:

```js
export const tests = {
  pa11y: {
    // keep customPaths empty if you want to test all pages
    customPaths: ['/', '/about/', '/articles/', '/styleguide/', '/audio/nybrostrand-beach/', '/activities/', '/jams/50ft-queenie/', '/reading/what-is-art/', '/watching/paris-texas/'],
    globalIgnore: [],
    chromePath: process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
};
```

`pa11y.njk` branches on that array: **non-empty means only those paths are tested**; empty means it sweeps every page in `collections.showInSitemap`. jedee's is non-empty, so a green run covers nine URLs.

The first four are EE's own default list with `/blog/` swapped for `/articles/` — chrome and prose. The fifth was added 2026-08-05 to cover a media *post* layout, which none of the others render: the `<audio>` player, the capture-metadata `<dl>`, the download buttons and the `<place-map>`. The sixth was added 2026-08-15 for a third shape again — a very long index (180 links) inside a custom element, with [[The place map]] in places mode above it. Three more followed — a jam, a reading post and a watching post — each a different [[The title-less post types|title-less or link-post]] shape.

jedee has sixteen post types (see [[Anatomy of a post type]]), so nine URLs are still a sample rather than coverage: no note, photo, event, recipe or response-type page is tested, nor a tag page or anything the lightbox touches. Emptying the array is a one-line change if a full sweep is wanted; the reason not to is runtime, since the sitemap is in the hundreds of pages.

### ⚠ A path that no longer exists passes, it does not fail

The list is hand-maintained and holds real URLs, so it goes stale whenever content moves. The failure mode is the dangerous direction: **pa11y-ci requests the dead path, gets the 404 page, finds nothing wrong with it, and reports `0 errors`.** The run stays green and the page it was supposed to be checking is no longer checked by anything.

Two things move a path out from under this list, and neither is loud:

- **A rename.** Permalinks derive from the filename for every type except articles (see [[Permalinks and Obsidian-friendly filenames]]), so retitling a post moves its URL. This happened on 2026-08-08: `Nybrostrand.md` became `Nybrostrand Beach.md`, `/audio/nybrostrand/` became `/audio/nybrostrand-beach/`, and `meta.js` had to be edited by hand to follow it.
- **A deletion**, including a draft being dropped. `pa11y:build` sets `BUILD_DRAFTS=1`, so a path here may legitimately be a draft — checking a post before it ships is the point — but a draft is exactly the kind of page that gets deleted rather than published.

The cheap guard is to confirm the target actually resolves before believing a green run:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/audio/nybrostrand-beach/
```

### ⚠ A missing browser fails the suite outright

pa11y-ci drives Chrome through puppeteer, and `puppeteer-core` ships no browser — it resolves one from `~/.cache/puppeteer` by exact version. When that version is absent the whole run dies before testing anything:

```
Error: Could not find Chrome (ver. 148.0.7778.97). This can occur if either
 1. you did not perform an installation before running the script …
```

It bit on 2026-08-05, again on 2026-08-08, and again on 2026-08-15, and the advice recorded here each time — `npx puppeteer browsers install chrome` — was treating a symptom. **Resolved 2026-08-15 by not using puppeteer's browser at all.**

Three things were going on. First, **puppeteer is not a dependency of this project**: it arrives transitively under `pa11y-ci` → `pa11y`, and it keeps its browser in the machine-wide `~/.cache/puppeteer`, never in `node_modules`. Deleting `node_modules` does not touch it, and neither does anything in `package.json`. Second, **puppeteer pins one exact Chrome build**, so any dependency refresh that bumps puppeteer invalidates whatever was downloaded before — the error returns naming a different version, which is what made it feel like the install "kept coming undone". Third, and the reason it stayed mysterious, **puppeteer's postinstall swallows a failed download**: it creates the cache folder, fails to fill it, and lets `npm install` exit clean, so the breakage only surfaces months later when someone runs the suite.

The diagnostic tell is worth keeping: an **empty** `~/.cache/puppeteer` with no version folders *at all* means the download never succeeded, not that it went stale — puppeteer never prunes old builds, so a working install leaves them piled up. On this machine there were none, on any date, which is what ruled out the stale-version story that three sessions had assumed.

The fix is to point pa11y at a Chrome that is already on the machine, which the config template can now do:

```js
// src/_data/meta.js — override per machine with PA11Y_CHROME=
chromePath: process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

`src/common/pa11y.njk` feeds that into `executablePath` inside the `chromeLaunchConfig` it already emitted — the same executable the two-theme script further down this page had been using all along, which is the small irony here: the answer was on this page, in another section, for weeks. Empty falls back to puppeteer's own resolution, so other machines are unaffected. The accepted trade-off is that a system Chrome auto-updates rather than being pinned; for a rule engine that runs inside the page, that is a low risk.

Worth distinguishing from the failure above: this one is loud — a non-zero exit and no results table. The dead-path failure is the quiet one.

### ⚠ It only ever sees light mode

`chromeLaunchConfig` passes nothing but the sandbox flags, so Chrome runs at its default color scheme and pa11y measures **light-mode contrast only**. Every dark-mode color pairing in the site is unverified by this test. Checking dark mode means driving a headless browser with `prefers-color-scheme: dark` forced — a separate run, not a setting in this config (the script in the next section does both themes). See [[The theme toggle]] for how the two themes are switched.

### ⚠ It cannot see the no-JS rendering at all — and pa11y is the wrong tool for it

The main menu renders two different layouts depending on whether scripts run: a MENU button with a dropdown panel, or a row of pills (see [[The main menu]]). pa11y drives a real browser with JavaScript on, so it has only ever seen the first one.

**pa11y cannot be made to check the second.** Its checker runs asynchronously inside the page, and in a page where scripting is off that promise never resolves — the run dies with `ProtocolError: Promise was collected`. This is true whether scripting is disabled through `page.setJavaScriptEnabled(false)` or through a launch flag. A no-JS check therefore has to measure contrast directly rather than call a rule engine.

Three things have to be right, and each of them silently produces a *wrong green* if it is not:

- **Turn JavaScript off with the launch flag `--blink-settings=scriptEnabled=false`.** It is the only route that makes the `(scripting: none)` media query match, and that query is what hides the panel before the script upgrades it. Chrome refuses to emulate `scripting` through `emulateMediaFeatures`, and `setJavaScriptEnabled(false)` leaves it reporting `enabled` — so with either of those the nav gets "measured" while `display: none`, and reports nothing wrong because there is nothing to see.
- **Read colors back through a 1×1 canvas, never by parsing the string.** Any value built with `color-mix()` computes to `oklab(…)`, whose numbers are 0–1, not 0–255. Parsing that as RGB reads every mixed color as near-black: the first version of this check "found" 193 failures at 1.16:1. Setting `fillStyle` and reading the pixel back converts any CSS color syntax correctly.
- **Skip elements smaller than a couple of pixels.** `.visually-hidden` text passes `checkVisibility()` — it is clipped, not hidden — so it reports as a contrast failure on every page.

```js
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--blink-settings=scriptEnabled=false']
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{name: 'prefers-color-scheme', value: 'dark'}]);
```

The same run covers the dark-mode gap above, since `prefers-color-scheme` emulation is a per-page setting and with no script running there is no `data-theme` stamp to fight — the page takes the `@media` path, which is exactly what a no-JS visitor gets. jedee's version lives at `_local/tests/a11y-nojs.js` and needs `npm start` running first, because the main nav is only revealed in serve mode. First run, 2026-08-04: clean on `/`, `/about/` and `/articles/` in both themes.

It also turned up something the JS-on suite misses on a page it *does* test: the primary button on `/styleguide/` is 3.45:1 at 19px, needing 4.5:1, in both themes. Its text color is a `color-mix()`, and the rule engine appears not to read the resulting `oklab()` any better than a hand-written parser does — worth remembering that **a passing contrast rule over mixed colors may mean "could not read", not "fine"**.

### Suppressing a finding

Two levels, both stock:

- **Per page** — a `pa11yIgnore` array in front matter, which `pa11y.njk` copies into that URL's entry:

  ```yaml
  pa11yIgnore:
    - "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail"
  ```

- **Site-wide** — `meta.tests.pa11y.globalIgnore`, which becomes `defaults.ignore`.

**Neither is in use anywhere in jedee.** `globalIgnore` is `[]` and no content file or layout carries a `pa11yIgnore` key — the only file in the repo containing that string is the template that reads it. The four tested pages pass with nothing suppressed. Prefer the per-page form if that ever changes, with the exact rule code pa11y prints and a one-line note on why it is a false positive.

### What it cannot catch

An automated WCAG2AA pass is a floor. The failure documented in [[Focus rings and paint containment]] — an outset focus ring rendered invisible by a clipping ancestor — is valid HTML with correct contrast and a real focus style, so pa11y reports nothing. Anything that depends on what a control looks like *while being operated* is outside what this test observes.

The no-JS section was added 2026-08-04 from a session that built the check; everything in it was measured, not inferred. The two warnings above it — the dead path that passes, and the missing browser that fails — were added 2026-08-08 after both were hit in one run, and the path list was corrected to five at the same time. It has grown since — six by 2026-08-15, nine by 2026-09-06 — so the count in this page's prose is the one thing here worth re-checking against `meta.js` rather than trusting.

Source: `tests.md` in `/Users/johanedlund/Projects/eleventy-excellent/src/docs/` (tag `4.6.1`, dated 2026-03-30), checked against jedee's `src/common/pa11y.njk`, `src/_data/meta.js` and `eleventy.config.js` on 2026-07-31. See [[What jedee kept from Eleventy Excellent]] for the full stock-versus-fork inventory.
