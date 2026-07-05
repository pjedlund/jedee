---
title: Why the navigation disappeared
description: A postmortem of the soft-launch navigation bug — an async svg shortcode, the interlinker plugin's second render pass, and a breakage hidden by the same commit that caused it.
date: 2026-07-05
tags:
  - eleventy
draft: true
---

During this site's soft launch, the main navigation did not render at all — not hidden, but genuinely absent from the built HTML. Nobody noticed for three days, because the same commit that broke it also hid it on purpose. This note reconstructs what happened, from the repo and its git history.

## The curtain: hiding the nav for the soft launch

{% raw %}

The soft launch (commit `3975491`, 2026-05-31) was supposed to show the site with the navigation out of view until 1.0.0. The switch is a boolean in `src/_data/meta.js`:

```js
hideNav: true // soft-launch: hide the main nav in PRODUCTION (header keeps the breadcrumb/logo + skip-link); header.njk still reveals it in `eleventy --serve` for local dev. Independent of `breadcrumb`. Flip to false at 1.0.0 to show everywhere.
```

And `src/_includes/partials/header.njk` checks it around the nav include (the dev-serve escape hatch was added later, in the fix commit):

```jinja2
{% if (not meta.navigation.hideNav) or (eleventy.env.runMode === "serve") %}
  {% include "partials/main-nav.njk" %}
{% endif %}
```

Intended effect: the menu markup exists, a conditional keeps it off the page in production. Actual effect: the conditional itself triggered a latent bug, and the menu stopped rendering entirely.

## The bug: an async shortcode meets a second render pass

Two ingredients, each harmless alone.

First, the `svg` shortcode — which `main-nav.njk` calls for every post-type icon and for the chevron on the menu button (`{% svg "misc/chev-down" %}`) — had been declared `async`, with an `await` around svgo's `optimize()`. That await served no purpose: `optimize()` and `readFileSync` are both synchronous. The `async` was a leftover from svgo v1's old Promise-based API. The shortcode returned a Promise wrapping a value that was already there.

Second, this site uses the `@photogabble/eleventy-plugin-interlinker` plugin for Obsidian-style wikilinks. To resolve links it re-renders pages in a pass of its own, mid-build. In that second render, an async shortcode reached through an `{% include %}` that is itself wrapped in an `{% if %}` block renders to nothing: the still-pending Promise gets dropped, and the whole included template comes out as zero bytes. No build error, no warning — just an empty spot where the menu was.

A bare `{% include %}` is unaffected, which is why the nav had always worked before. The go-live commit added the `{% if %}` wrapper, completing the failure condition and concealing the result in the same motion: the nav was supposed to be invisible, so an empty nav looked exactly like success.

## The fix: make the shortcode synchronous

The fix (commit `ffd4a17`, 2026-06-03) removed the pointless `async`/`await`. The shortcode in `src/_config/shortcodes/svg.js` now returns a plain string:

```js
// NOTE: svgo's optimize() and readFileSync are both synchronous, so this
// shortcode must stay synchronous too. A leftover `async`/`await` (vestige of
// svgo v1's old Promise API) made it return a Promise, which the interlinker
// plugin silently drops inside deeply-nested includes (base→header→main-nav) —
// blanking the whole nav. Keep this sync.
export const svgShortcode = (svgName, ariaName = '', className = '', styleName = '') => {
  const svgData = readFileSync(`./src/assets/svg/${svgName}.svg`, 'utf8');

  const {data} = optimize(svgData);

  return data.replace(
    /<svg(.*?)>/,
    `<svg$1 ${ariaName ? `aria-label="${ariaName}"` : 'aria-hidden="true"'} ${className ? `class="${className}"` : ''} ${styleName ? `style="${styleName}"` : ''} >`
  );
};
```

With no Promise to drop, the include renders correctly inside the conditional, and `hideNav` does only what it says. The same commit added the `eleventy --serve` clause to the header conditional, so the nav stays testable in local dev while production keeps it hidden.

Pointers:

- **`{% if %}` around an include is only safe here because `{% svg %}` is sync.** Both `main-nav.njk` and `header.njk` carry warning comments to that effect. Any conditional wrapped around a template that calls shortcodes inherits this constraint on this site, as long as the interlinker is active.
- **Don't declare a shortcode `async` unless it actually awaits something.** A gratuitous `async` changes the return type from string to Promise, and not every consumer down the line resolves Promises. Here the failure mode was silent: a green build with missing markup.
- **A breakage and a concealment in one commit make the breakage silent.** The nav was broken from 2026-05-31 to 2026-06-03 and produced no signal, because "empty" and "hidden" look identical. When hiding something, verify separately that the hidden thing still works — for example behind a dev-only reveal, which is what the fix added.
- **Rendering shouldn't also compute the page graph.** The deeper design issue is that the interlinker resolves wikilinks by re-rendering every page mid-build. That couples link resolution to render timing (which is how a shortcode's return type could blank a menu), and it scales badly — measurements on this site showed the cost growing steeply with page count. Cross-reference data is better computed once, in a step before rendering, and handed to the templates as plain data.

{% endraw %}

The personal version of this story, written when the bug was found, is [[What the curtain hid]].
