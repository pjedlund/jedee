---
title: How the e-content wrapper works
description: A dev note on the e-content wrapper — the microformats2 class that marks a post's body for webmention parsers and feed readers, the Stack spacing rule it collided with, and why both classes now sit on the same element.
date: 2026-07-05
tags:
  - css
  - indieweb
draft: true
---

Every post body on this site is wrapped in a `<div>` with the class `e-content`. It is a [microformats2](https://microformats.org/wiki/h-entry) property: inside an `h-entry`, `e-content` marks the element whose contents are the post's actual writing. Webmention receivers and feed readers parse the page, find that class, and take everything inside it as the body — ignoring the header, footer, and navigation around it. The class exists for those parsers; it was never meant to style anything. Adding it still caused a site-wide spacing bug, documented below.

## The markup

Every post-type layout in `src/_layouts/` wraps the rendered markdown the same way. From `src/_layouts/post.njk`:

{% raw %}

```html
<article class="wrapper flow prose h-entry">
  {% include 'partials/entry-header.njk' %}

  <div class="e-content | wrapper-pass flow">
    {{ content | safe }}
  </div>
  ...
</article>
```

{% endraw %}

Most layouts (`jam.njk`, `reading.njk`, `watching.njk`, `like.njk`, and the rest) use the shorter `class="e-content | flow"`; `post.njk` and `note.njk` add `wrapper-pass`, which re-exposes the wrapper's named grid columns via subgrid so breakout widths (`popout`, `feature`, `full`) work inside the body (see `src/assets/css/global/compositions/wrapper.css`). The pipe character in the class list is a CUBE CSS convention with no effect in the browser — it visually separates the machine-readable class from the styling classes.

## The spacing rule

Vertical rhythm between paragraphs, headings, and lists comes from a single rule — the Every Layout Stack pattern, implemented in `src/assets/css/global/compositions/flow.css`:

```css
.flow > * + * {
  margin-block-start: var(--flow-space, 1em);
}
```

The `* + *` part (the "owl selector") matches any element that directly follows a sibling. Every element inside a `.flow` container except the first one gets a top margin. There is only this one rule; nothing else spaces the prose.

That rule only works because the reset first removes all default margins. In `src/assets/css/global/base/reset.css`:

```css
body,
h1,
h2,
h3,
h4,
p,
figure,
blockquote,
dl,
dd {
  margin: 0;
}
```

So a paragraph has exactly two possible states: inside a flow context it gets `--flow-space` of margin, outside one it gets zero.

## The bug

The `<article>` element already carried `flow`. When the `e-content` div was first added inside it *without* its own `flow` class, every paragraph moved one level deeper in the tree. The child combinator in `.flow > * + *` only reaches an element's direct children — the rule now selected the `e-content` div itself, but not the paragraphs inside it. Those paragraphs were grandchildren of the flow context, no rule reached them, and the reset's `margin: 0` was all that applied. Every post body on the site collapsed to zero spacing at once, with no error anywhere: the CSS was valid, the build was green, the pages just rendered wrong.

The fix was not to remove the wrapper — the parsers need it — but to make the wrapping element carry both jobs: `class="e-content | flow"`. The same div is the machine-readable body marker *and* a new flow context, so its direct children (the paragraphs) get their margins back.

Pointers:

- **Microformats classes are data, not style hooks.** `h-entry`, `p-name`, `e-content`, `dt-published`, `u-url` and the rest are read by external parsers. Renaming one to something "cleaner", or removing one that appears unused in the CSS, silently breaks webmentions and feed parsing — no build error, no visual change, the site just stops being machine-readable. Grep the CSS before assuming a class is dead; if it starts with `h-`, `p-`, `u-`, `dt-`, or `e-`, leave it alone.
- **`.flow > * + *` never crosses an element boundary.** Any wrapper introduced inside a flow context — for microformats, for a component, for anything — needs its own `flow` class if the content inside it should keep its rhythm. This is by design: the Stack composes by nesting, it does not inherit downward.
- **The prefix tells you what a class is for.** The mf2 vocabulary is prefixed (`e-` = embedded HTML, `p-` = plain text, `u-` = URL, `dt-` = datetime), which is the reliable way to spot data classes in a class list. The `|` separator in this codebase's class attributes makes the same distinction readable at a glance.
- **`wrapper-pass` is unrelated to the spacing fix.** It was added later (June 2026) to solve a different consequence of the same wrapper: breakout image widths are grid-column assignments that only work on direct children of `.wrapper`, so the `e-content` div passes the columns through with `grid-template-columns: subgrid`. Same root cause — a wrapper demoting content to grandchildren — different mechanism and fix.

The story of how this bug felt from the inside is in [[Not every class is a place to hang a style]].
