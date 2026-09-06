---
description: "The microformats2 class vocabulary that makes HTML machine-readable, and why those classes are data the stylesheet must never touch."
date: 2026-08-01
---

[Microformats2](https://microformats.org/wiki/microformats2) (mf2) makes ordinary HTML machine-readable by adding agreed-upon class names to the elements that already carry the content. There is no separate data file: the visible page *is* the data. A parser reads the classes and extracts a structured object from the markup underneath them.

The vocabulary has two levels. **Root classes** mark what a thing is: `h-entry` (a post), `h-card` (a person or site), `h-event`, `h-cite` (a reference to someone else's post). **Property classes** inside a root mark its parts, and their prefix declares how to parse the value: `p-` plain text (`p-name`), `u-` a URL (`u-url`, `u-photo`), `dt-` a datetime (`dt-published`), `e-` a full HTML subtree (`e-content`).

Microformats are the parsing layer of the IndieWeb: webmention receivers, feed readers, and social readers all work by fetching a page and parsing its mf2. The alternative approach — duplicating the data in a separate machine-only block, as JSON-LD does — trades that directness for flexibility; the two coexist on this site and serve different consumers (see [[One JSON-LD envelope for sixteen types]]).

The one thing to internalize: **these classes look like CSS hooks but they are data.** Nothing in the stylesheet may reference them, so they always look unused — and removing one breaks external parsers silently: no build error, no visual change, the site just stops being machine-readable.

## In jedee: data, not style hooks

Every post body is wrapped in `<div class="e-content | flow">`. `e-content` is the [h-entry](https://microformats.org/wiki/h-entry) property marking the element whose contents are the post's actual writing. Webmention receivers and feed readers parse the page, find that class, and take everything inside it as the body — ignoring header, footer, and navigation. **The class exists for parsers. It was never meant to style anything.** Adding it still caused a site-wide spacing bug.

The `|` in the class list is a CUBE CSS convention with no effect in the browser: it visually separates the machine-readable class from the styling ones.

### The bug: a wrapper demotes content to grandchildren

Vertical rhythm comes from exactly one rule — the Every Layout Stack, in `compositions/flow.css`:

```css
.flow > * + * {
  margin-block-start: var(--flow-space, 1em);
}
```

It works only because the reset first zeroes every default margin. So a paragraph has two possible states: inside a flow context it gets `--flow-space`, outside one it gets zero.

The `<article>` already carried `flow`. When the `e-content` div was added inside it *without* its own `flow` class, every paragraph moved one level deeper. The child combinator reaches direct children only — the rule now selected the `e-content` div itself but not the paragraphs within. They were grandchildren, no rule reached them, and the reset's `margin: 0` was all that applied. **Every post body on the site collapsed to zero spacing at once**, with valid CSS, a green build, and no error.

The fix isn't removing the wrapper — parsers need it — but making one element carry both jobs: `class="e-content | flow"`. Same div, machine-readable marker *and* a new flow context, so its direct children get their margins back.

### The rules

- **Never rename or delete an mf2 class because it looks unused in the CSS.** `h-entry`, `p-name`, `e-content`, `dt-published`, `u-url` and the rest are read by external parsers.
- **The prefix tells you what a class is for** and is the reliable way to spot data classes in a class list: `e-` embedded HTML, `p-` plain text, `u-` URL, `dt-` datetime, `h-` a root.
- **`.flow > * + *` never crosses an element boundary.** Any wrapper introduced inside a flow context — for microformats, for a component, for anything — needs its own `flow` class if its content should keep its rhythm. That's by design: the Stack composes by nesting, it does not inherit downward.

### `wrapper-pass` — the same root cause, a different consequence

`post.njk` and `note.njk` use `class="e-content | wrapper-pass flow"`; most other layouts just `e-content | flow`. `wrapper-pass` (added June 2026, in `compositions/wrapper.css`) re-exposes the wrapper's named grid columns via `grid-template-columns: subgrid`, so breakout widths (`popout`, `feature`, `full`) work inside the body. Breakouts are grid-column assignments that only apply to direct children of `.wrapper` — so the same wrapper that broke the spacing also broke the breakouts, by the same demotion, needing a different fix. In browsers without subgrid, content simply stays at content width.

### The entry root sits on the `<article>` — in all sixteen layouts

`e-content` only means anything *inside* an `h-entry`. For a long stretch the only `h-entry` on a post page was the hidden authorship block, which left the visible body and every `u-*` property outside the entry — so a strict parser saw an entry with no content and a set of orphaned properties. Every one of the fifteen per-type specs documents this as a deferred caveat.

**It is no longer true.** All sixteen layouts now open the same way:

```njk
<article class="wrapper flow prose h-entry">
```

so the body, the properties, and the hidden `<data>` targets all parse as children of the entry. `hidden-author.njk` moved *inside* that root, where it supplies the entry's single `u-url`.

⚠ Two things are deliberately rendered **outside** the root: received webmentions (`webmentions.njk`) and the recovered This Is My Jam reactions (`jam-social.njk`). Both are `h-cite` cards about *other people's* posts, and nesting them inside the entry would make them read as children of it. The comments in those partials say so — don't tidy them into the `<article>`.

If a spec still describes the nesting caveat as open, the spec is out of date on that point.

**EE stock vs jedee:** `flow.css`, `wrapper.css`, and the reset are Eleventy Excellent's. The `e-content` wrapper, `wrapper-pass`, the entry root, and the mf2 vocabulary throughout the layouts are jedee's IndieWeb layer.

Related: [[The title-less post types]] — where a missing `p-name` is the correct data, not an omission.

Raw source: `src/_raw/dev-notes/How the e-content wrapper works.md`
