# Plan — h-entry root promotion (µf2 §6, the webmention-typing prerequisite)

**Status:** design approved 2026-06-06 (Johan). Implementation pending.
**Branch:** `feat/webmention-entry-root`.
**Supersedes the "µf2 h-entry nesting — DEFERRED" decision** in
`Plan - Phase 3 (10 new post types) - final.md` — flip that entry to *resolved* when this ships.

---

## 1. Problem

Every post-type layout in `src/_layouts/*.njk` has this shape:

```njk
<div class="region">
  <div class="wrapper flow prose">     ← visible content: <h1>, the u-*-of interaction, .e-content, dates
    …
  </div>
  <div hidden class="h-entry">          ← the ONLY h-entry: a hidden authorship beacon, a SIBLING of the content
    <a class="u-url" href="{permalink}">{{ title }}</a>
    <a class="p-name u-url" rel="author" href="{home}">{{ author }}</a>
    <img class="u-author h-card" src="{avatar}" alt="{author}" />
  </div>
</div>
```

The visible interaction properties (`u-like-of`, `u-in-reply-to`, `u-bookmark-of`,
`u-read-of`, `u-watch-of`, `u-listen-of`, …), `.e-content`, and `dt-published`
(`partials/date.njk`) sit in `.wrapper`, **outside** the only `h-entry`. A strict mf2
parser only collects properties that *descend from a root*, so:

- **Parse-verified 2026-05-29** (`microformats-parser` + `mf2py` on rebuilt `like.njk`):
  the visible `u-like-of` / `dt-published` / `e-content` are **dropped entirely** — the
  parsed `h-entry` contains only `author` + `url`. An outbound like/reply would be
  received as a generic `mention-of`, never a typed like/reply.
- **Three secondary warts** in the hidden block:
  1. entry `p-name` resolves to the *author's* name (from the `p-name u-url rel=author`
     anchor), not the post title;
  2. the entry carries **two** `u-url`s (permalink + home);
  3. the author `h-card` (on the bare `<img class="u-author h-card">`) has a name +
     photo but **no `url`**.

Inbound *attribution* still works today (webmention.io's authorship algorithm finds the
nested `u-author h-card`), which is why this has been moot while receiving was a stub
and sending is unwired. It stops being moot the moment we wire **outbound** sending —
hence this fix is the **prerequisite** for the outbound-webmention task.

## 2. Goal & scope

**Goal:** make the visible content a real `h-entry` root so the per-type interaction
property, `e-content`, `dt-published`, and `u-syndication` all parse *inside* the entry,
and clear the three warts — across all 15 post types in one systemic change.

**In scope:** the markup restructure + parser-based verification.

**Explicitly out of scope (next, separate task):** wiring outbound webmention sending
(Bridgy publishing / webmention.app / build hook). The plan sequences this work as
**restructure → re-parse per type → *then* wire sending.** This document covers only the
first two.

## 3. Decision — Approach 1 (promote `.wrapper` to the `h-entry` root via shared chrome)

Chosen over the alternative (give only the response types a self-contained `h-entry`,
leaving the existing types' warts and duplicating the entry logic per layout). One
systemic change fixes all 15 types + the three warts + lets the event `h-event` nest
inside `h-entry` as already specced.

### Prior art (both confirm Approach 1)

- **Lene Saile** (`lenesaile.com-main`, the EE author) — `post.njk` keeps an
  authorship-only *hidden* h-entry and renders received webmentions **fully outside** it.
  She never promotes content to an entry root because her site has **no response types**
  and sends no typed webmentions. Confirms: **received webmentions stay outside the root.**
- **Max Böck** (`mxb.dev`) — a site that *does* have response types and *does* send
  webmentions — puts `h-entry` on the **visible `<article>`**, `p-name` on the visible
  `<h1>`, `e-content` on the visible content, the authorship as a **hidden block inside
  the entry** (`<p class="h-card p-author">` wrapping name/url/photo), and received
  webmentions in a **separate sibling section outside** the article. This *is* Approach 1,
  and it supplies the exact authorship-block shape that clears our three warts.

Two independent IndieWeb authors, same structure: **visible content = the h-entry root;
authorship hidden inside it; received webmentions outside it.**

## 4. Target structure

### 4.1 Generic post type (e.g. `like.njk`)

```njk
---
layout: base
schema: BlogPosting
---

<div class="region" style="--region-space-top: var(--space-xl-2xl)">
  <article class="wrapper flow prose h-entry">
    {% include 'partials/entry-header.njk' %}   {# <h1 class="p-name">, image, dt-published via date.njk #}

    <p>Liked <a class="u-like-of" href="{{ likeOf }}">{{ likeOf }}</a></p>

    <div class="e-content | flow">
      {{ content | safe }}
    </div>

    {% include 'partials/entry-footer.njk' %}    {# tags, u-syndication, CTA, edit-on — now inside the entry #}
    {% include 'partials/hidden-author.njk' %}   {# hidden: entry u-url(permalink) + p-author h-card #}
  </article>
</div>

{%- css "local" -%}…{%- endcss -%}
```

Notes:
- `h-entry` is **data, not style** — no CSS targets it (CUBE: it's not a block/utility).
  It's appended to the existing class list; no `|` separator, no new CSS rule.
- `entry-footer.njk` is unchanged but now sits inside the entry, so `u-syndication`
  (POSSE "Also on") finally parses as an entry property — a bonus fix.
- `backlinks.njk` (where included), the response CTA, and the edit-on link are
  **mf2-inert** plain links; harmless inside the entry, left in place.

### 4.2 Webmention-bearing layouts (`post.njk`, `note.njk`, `photo.njk` only)

The received-webmention include moves to a **sibling after `</article>`**, still inside
`.region` — exactly the Lene/Max placement, so received `h-cite`/`h-card`s never nest
into the post's own entry:

```njk
  </article>

  {# received webmentions — OUTSIDE the h-entry root. Bare include (interlinker-safe);
     the partial + its card call zero shortcodes and gate their own empty state. #}
  {% set webmentionUrl = page.url | url | absoluteUrl(meta.url) %}
  {% include "partials/webmentions.njk" %}
</div>
```

This keeps the same visual column: `partials/webmentions.njk` is an
`<aside class="webmentions | flow region prose">`, so it carries its own width/spacing
as a direct `.region` child.

### 4.3 `event.njk`

Same restructure. The visible `h-event` block now sits *inside* the `h-entry`, nesting
as a child root — the behavior `Plan - Phase 3` already specced. The h-event's
`<data class="p-name">` is the *event's* name (its own root); the entry's `p-name` comes
from the entry-header `<h1>`. No conflict.

### 4.4 New shared partial — `partials/hidden-author.njk`

Replaces the 15 copy-pasted hidden blocks (one per post-type layout) with one source of
truth, placed inside the entry. Max-style: the entry gets a single direct-child `u-url` (the permalink); the
author identity is wrapped in `p-author h-card` so its `p-name`/`u-url`/`u-photo` belong
to the *card*, not the entry.

```njk
{# Hidden authorship for Webmention discovery — https://indieweb.org/authorship
   Lives INSIDE the post's h-entry root. Provides the entry's single u-url (the
   permalink) and a nested p-author h-card (name + url + photo). Bare include, zero
   shortcodes (plain <img eleventy:ignore>) — interlinker-safe. #}
<div hidden>
  <a class="u-url" href="{{ page.url | url | absoluteUrl(meta.url) }}">{{ title }}</a>
  <p class="p-author h-card">
    <a class="p-name u-url" rel="author" href="{{ meta.url }}">{{ meta.author.name }}</a>
    <img
      eleventy:ignore
      class="u-photo"
      src="{{ meta.author.avatar | url | absoluteUrl(meta.url) }}"
      alt="{{ meta.author.name }}"
    />
  </p>
</div>
```

### How the warts clear

| Wart | Before | After |
|---|---|---|
| 1 — entry `p-name` = author name | the `p-name u-url rel=author` anchor was a direct child of the entry | entry `p-name` = the visible `<h1>`; the author name's `p-name` is scoped *inside* the `h-card` |
| 2 — entry has two `u-url`s | permalink anchor + the author/home anchor both direct children | one direct-child `u-url` (permalink); the home URL lives inside the `h-card` |
| 3 — author `h-card` has no `url` | `u-author h-card` on a bare `<img>` (name + photo only) | `p-author h-card` with `p-name` + `u-url` (home) + `u-photo` |

## 5. Files touched

1. **`src/_includes/partials/entry-header.njk`** — `<h1>` → `<h1 class="p-name">`.
   (Shared. Title-less types — note/like/reply/repost/bookmark/rsvp — render no `<h1>`
   under the `{% if title %}` guard, so they correctly stay nameless = a *note*, not an
   *article*, per [post-type-discovery](https://indieweb.org/post-type-discovery).)
2. **`src/_includes/partials/hidden-author.njk`** — new (§4.4).
3. **The 15 post-type layouts** —
   `article` (`post.njk`) · `note` · `reply` · `rsvp` · `like` · `repost` · `bookmark` ·
   `reading` · `watching` · `jam` · `photo` · `audio` · `video` · `recipe` · `event`:
   - `<div class="wrapper flow prose">` → `<article class="wrapper flow prose h-entry">`
     (and the matching close tag);
   - delete the old sibling `<div hidden class="h-entry">…</div>`;
   - add `{% include 'partials/hidden-author.njk' %}` inside the article;
   - **`post.njk` / `note.njk` / `photo.njk` only:** move the `{% set webmentionUrl %}`
     + `{% include "partials/webmentions.njk" %}` to a sibling *after* `</article>`.

Not touched: `base.njk`, `page.njk`, `pageIndex.njk`, `tags.njk` (not post entries).

## 6. Verification

1. **Local parse test** — add `microformats-parser` (the lib the 2026-05-29 parse used)
   as a devDependency; write `_tests/microformats.test.js` (`node --test`, matching the
   existing gitignored `_tests/` files). Build with `BUILD_DRAFTS=1 npm run build` (so the
   draft sample posts exist), then for one built page per type assert:
   - the type's `u-*-of` (or media identity), `e-content`, and `dt-published` parse
     **inside** the entry's properties;
   - the entry has **exactly one** `u-url` (the permalink) and, for titled types,
     `p-name` = the post title;
   - `p-author` resolves to an `h-card` with name + url + photo;
   - on article/note/photo, received-mention `h-cite`s are **not** in the entry's
     `children` and reactor `h-card`s are **not** entry `u-url`s.
   - ⚠ `_tests/` is gitignored (local-only, Johan's call), so the test won't be
     committed while the devDep would be tracked — flag this mismatch; option is to keep
     the parse as a throwaway `npx` script instead. **Open for Johan at implementation.**
2. **Manual spot-check** — paste one built URL per representative kind (a titled post, a
   note, a like, an event) into <https://php.microformats.io/> / <https://pin13.net/mf2/>
   / <https://indiewebify.me/> and eyeball the JSON.
3. **Regression** — `npm run build` green; `npm run test:a11y` 0 errors (markup change).

## 7. Docs to update on completion

- `Plan - Phase 3 (10 new post types) - final.md` — flip "µf2 h-entry nesting — DEFERRED"
  to *resolved*.
- `microformats` skill — replace the "Known caveat — properties outside the entry root"
  section with the resolved structure (visible `h-entry` root + `hidden-author.njk`).
- `indieweb` skill — refresh the status-at-a-glance table.
- `TODO.md` §6 → done; `LOG.md` entry.
- Memory `project_jedee_webmentions` — note the entry-root promotion.

## 8. Risks / watch-items

- **Interlinker trap** — the moved webmention include stays a **bare** include (no
  `{% if %}`/`{% for %}` wrapper) and calls zero shortcodes, so it's safe. `hidden-author.njk`
  likewise: bare include, plain `<img eleventy:ignore>`, no `{% image %}`/`{% svg %}`.
- **`<div>` → `<article>`** — adds article semantics to the post column; verify no CSS
  keyed on `.wrapper` being a `<div>` (it's a class selector, so element change is safe)
  and that nesting an `<article>` inside `<main>` is valid (it is).
- **event double-`p-name`** — confirmed distinct roots; verify in the parse test.
