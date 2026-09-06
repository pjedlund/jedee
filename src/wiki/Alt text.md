---
description: "The text alternative on an image — what it is for, why an empty alt is a real answer rather than a missing one, and how jedee's cover images carry it."
date: 2026-08-08
---

The `alt` attribute gives an image a text alternative: what a person gets instead of the picture when the picture is not available to them. That covers a screen-reader user, a broken image URL, a text-only browser, and a search engine. It is the oldest accessibility feature in HTML and still the most frequently got wrong, because the correct value depends entirely on what the image is *doing* on the page, not on what it depicts.

The decision that matters is informative versus decorative:

- **Informative** — the image carries content the surrounding text does not. It needs alt text conveying that content. A photograph of a beach in an article about that beach; a chart; a screenshot of an error message.
- **Decorative** — the image adds nothing a reader would miss. It takes `alt=""`, which tells assistive technology to skip it entirely. A background texture, an icon beside a text label that says the same thing, a book cover printed directly beneath the book's title.

**`alt=""` and no `alt` attribute are not the same thing.** An empty `alt` is a positive statement: this image has been considered and has no textual content. A *missing* `alt` is an absence of information, and screen readers fall back to announcing something unhelpful — commonly the filename or URL. Getting a decorative image right therefore means writing the empty attribute, not omitting it.

The W3C's [alt decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/) walks the cases, and [WCAG 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html) is the criterion. Note what an automated checker can and cannot do here: a rule engine can see that `alt` is missing, and cannot see that the alt text is wrong — see [[The accessibility test]].

## In jedee

Alt text reaches an image by a different route depending on which image pipeline it went through, and jedee has two (see [[Self-hosting remote images at build time]]):

- **The `{% image %}` / `{% imageKeys %}` shortcodes** take `alt` as a parameter. Eleventy Excellent stock. The photo type passes `photo.alt`, the audio type passes `posterAlt`.
- **A plain `<img>`**, which the HTML Transform post-processes. This is the route every remote cover has to take, because the shortcodes break on a remote URL. The alt is written into the template by hand.

### Cover images: `coverAlt`, added 2026-08-08

Five post types render a cover image — activity, jam, reading, recipe, watching — and until this date all five, plus the four archive cards showing the same covers in listings, **hardcoded the alt text in the template**:

```njk
<img class="cover" src="{{ cover | safe }}" alt="Cover for {{ title }}" …>
```

That is jedee's own code, not EE stock — these post types are jedee additions. The effect was that a cover image could not be described at all: the value was a generated sentence naming the post, identical on every post of that type.

All nine now read an optional `coverAlt` and fall back to the string they used to emit:

```njk
alt="{{ coverAlt | default('Cover for ' + title) }}"
```

### ⚠ Use `default`, not `or`, when an empty value is meaningful

`{{ coverAlt or '…' }}` is the reflex and is wrong here. Nunjucks' `or` is a truthiness test and an empty string is falsy, so `coverAlt: ""` would fall back to the generated sentence — making the decorative case impossible to express.

Nunjucks' `default` filter substitutes **only on `undefined`** unless its third argument is true:

> `default(value, default, boolean)` — if `boolean` is true, any JavaScript falsy value returns the default.

Left off, one expression yields all three behaviors:

| front matter | rendered |
|---|---|
| no `coverAlt` | `Cover for A Confession` |
| `coverAlt: A worn cloth binding…` | the author's text |
| `coverAlt: ""` | empty — decorative |

The empty case is the one that motivated the choice. A book cover or film poster sitting directly under the title it depicts is decorative by the definition above, and `alt="Cover for Anna Karenina"` beneath a heading reading *Anna Karenina* announces the title twice.

### ⚠ An empty alt looks like a missing one in the built HTML

Checking the decorative case by grepping the output is misleading. `alt=""` does not appear:

```
$ curl -s …/reading/a-confession/ | grep -o 'alt="[^"]*"'
alt="Johan Edlund"
```

The cover image looks like it has no `alt` at all — which would be the exact bug the field was added to prevent. It does not. eleventy-img's HTML Transform serializes it in HTML's **empty attribute syntax**, the bare name with no value:

```html
<img loading="lazy" decoding="async" alt width="448" …>
```

Per the HTML spec that form is valid and identical in meaning to `alt=""` — "the attribute value is implicitly the empty string". The parsed DOM confirms it:

```js
const i = document.querySelector('img.cover');
i.hasAttribute('alt')  // true
i.alt === ''           // true
```

The general point outlives this attribute: **a grep over serialized HTML cannot reliably prove an attribute absent**, because the serializer chooses the form. Check the DOM.

### What is not solved

Nothing backfills alt text onto existing posts, and the Web Clipper templates that create reading, watching and jam posts cannot generate it — describing a picture means looking at it (see [[Web Clipper templates]]). The fallback keeps those posts from having no `alt` at all, which is the most a default can do.

Raw source: `src/_raw/dev-notes/How cover images got real alt text.md`
