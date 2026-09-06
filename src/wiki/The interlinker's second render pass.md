---
description: "How the interlinker re-renders every page mid-build to resolve wikilinks, and the async-shortcode failure that timing can cause."
date: 2026-07-31
---

A [[Wikilinks|wikilink]] names its target by title — `[[Page Title]]` — rather than by path, so something has to work out where that title actually lives before a page can be built. On an [Eleventy](https://www.11ty.dev/) site that job belongs to a plugin, and the way this one does the lookup — by rendering every page a second time, mid-build — is the root of the worst failure this site has had. It is worth understanding before putting any conditional around an include.

`@photogabble/eleventy-plugin-interlinker` resolves wikilinks by **re-rendering every page in a pass of its own, mid-build**. That coupling of link resolution to render timing is what the rest of this page unpacks.

## The failure

Three ingredients, each harmless alone. Remove any one and it goes away:

1. the interlinker plugin is active,
2. a shortcode is **async** (returns a Promise), and
3. its `{% include %}` sits inside an `{% if %}` or `{% for %}` block.

In the second render pass, the still-pending Promise gets dropped and **the entire included template renders to zero bytes** — clean build, no error, no warning. A bare `{% include %}` with the same async shortcode renders fine, which is the trap: adding an ordinary conditional around an existing include is what completes the failure.

## How it actually bit

The `{% svg %}` shortcode had been declared `async`, with an `await` around svgo's `optimize()`. That await did nothing — `optimize()` and `readFileSync` are both synchronous; the `async` was a leftover from svgo v1's Promise-based API. `main-nav.njk` calls `{% svg %}` for every post-type icon.

The soft-launch commit (`3975491`, 2026-05-31) then wrapped the nav include in `{% if not meta.navigation.hideNav %}` to hide the nav until 1.0.0, and set `hideNav: true` in the same commit. The nav didn't just hide, it vanished from the built HTML entirely — and nobody noticed for three days, **because the same commit that broke it also hid it on purpose.** Empty and hidden look identical. `git bisect` landed exactly on that commit; swapping the wrapped include back to a bare one restored the nav, which is what isolated the cause. Vanilla Eleventy Excellent has no interlinker and an identical `main-nav.njk`, and that side-by-side ruled out include depth, svgo, and the Eleventy/Nunjucks version.

Fixed in `ffd4a17` (2026-06-03) by dropping the `async`/`await`, with the reason recorded in the file:

```js
// NOTE: svgo's optimize() and readFileSync are both synchronous, so this shortcode must stay synchronous too. A leftover `async`/`await` ... made it return a Promise, which the interlinker plugin silently drops inside deeply-nested includes (base→header→main-nav) — blanking the whole nav. Keep this sync.
```

## Rules that follow

- **Keep should-be-sync shortcodes synchronous.** A gratuitous `async` changes the return type from string to Promise, and not every consumer downstream resolves one.
- **For genuinely async shortcodes** (`{% image %}` / `{% imageKeys %}` via eleventy-img), don't call them from an `{% include %}` inside an `{% if %}`/`{% for %}`. Inline the markup, hoist the call, or move the conditional *inside* the partial.
- **Recognize the symptom:** a partial renders empty, build succeeds, no error → suspect a dropped Promise, not a template typo. Confirm fast by swapping to a bare `{% include %}`, or by commenting out the plugin registration.
- **When you hide something, verify separately that it still works.** The fix commit added an `eleventy --serve` escape hatch to the header conditional for exactly this reason — the hidden thing stays testable in dev.

## The one place a card include *does* sit in a loop

`archive-listing.njk` renders every archive page by including a card partial inside a loop, and seven of the card partials call the async `{% image %}` shortcode — the exact shape described above. It works, and the loop is the reason:

```njk
{% asyncEach item in pagination.items %}
  {% include "partials/" + cardPartial %}
{% endeach %}
```

`{% asyncEach %}`, not `{% for %}`. Worth knowing before "tidying" that into an ordinary `for` loop, which would blank every archive card on the site at once.

`events.njk` is the one archive that doesn't use the shared template, and it *does* use a plain `{% for %}` — safe only because `card-event.njk` calls no async shortcode (it fills the card's image slot with a date badge). That safety is incidental, not designed: giving event cards a real image would break them.

## The deeper design point

Rendering shouldn't also compute the page graph. Resolving links by re-rendering every page couples two unrelated concerns — which is how a shortcode's *return type* could blank a menu — and it makes the plugin's cost grow with the square of the page count, because each page's resolution depends on `collections.all`.

Measured on a throwaway harness (N synthetic notes, 10 wikilinks each, Eleventy 3.1.5 / interlinker 1.1.2 / Node 22), plugin off vs on:

| Notes | Off | On | Off peak RAM | On peak RAM |
|---|---|---|---|---|
| 500 | 0.34 s | 1.04 s | 172 MB | 435 MB |
| 1,000 | 0.48 s | 1.80 s | 174 MB | 742 MB |
| 2,000 | 0.77 s | 3.75 s | 190 MB | 1,246 MB |
| 4,000 | 1.49 s | 7.70 s | 248 MB | 2,140 MB |
| 8,000 | 3.16 s | 20.84 s | 368 MB | 4,181 MB |

**Memory is the binding constraint, not time.** The baseline stays flat — 368 MB at 8,000 notes — while the plugin's overhead roughly doubles with every doubling, hitting 4.2 GB. Time grows close to linearly until about 4,000 notes and then turns steeply super-linear: 4k→8k costs 2.7× for 2× the content.

**jedee keeps the plugin.** A few hundred pages is exactly where it's comfortable, and the sync-`{% svg %}` fix removed the fragility. But anything at thousands of pages should not resolve wikilinks in the render pipeline at all: pre-compute the link and backlink graph in a step *before* Eleventy and hand it to templates as plain data. That's single-pass over the content and never touches async rendering — roughly the "off" column above.

See also [[Wikilinks]] — the same plugin's intended behavior.

Raw source: `src/_raw/dev-notes/Why the navigation disappeared.md`
