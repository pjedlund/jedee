---
description: "A small arrow after a link that leaves the site: when it needs announcing, how to draw it so it can change color, how to animate it without letting it wrap alone, and the specificity trap in its selector."
date: 2026-10-29
updated: 2026-10-31
---

An external-link icon is a small mark, usually ↗, after a link that leads to another site. It tells a reader before they click that they are about to leave. It is decoration when the link opens in the same tab. When a link opens a new tab or window, that has to be said in text, because the change of context is something a screen-reader user cannot see.

The usual way to add the icon is a `::after` on links whose `href` starts with `http`, with exclusions for the site's own domain, so internal links (written relative, `/about/`) never match.

## Drawing it so it can change color

An SVG used as `background-image` keeps the colors written into its file; it cannot follow `currentColor` or change on hover. Using the same SVG as a [`mask`](https://developer.mozilla.org/en-US/docs/Web/CSS/mask) with a `background-color` behind it gives an icon in any color the CSS sets:

```css
a::after {
  background-color: color-mix(in oklab, currentColor 45%, transparent);
  mask: url('/external.svg') no-repeat right top / 0.5em;
}

a:hover::after {
  background-color: var(--link-hover-color);
}
```

## Keeping it on the line

An empty `inline-block` for the icon is an atomic box: the line can break before it, leaving the arrow alone at the start of the next line. A plain inline box that holds a word joiner (`content: '\2060'`) cannot, because the joiner glues it to the link's last letter. The width for the icon then comes from padding.

The cost is motion. [`transform`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform) does not apply to a non-replaced inline box, so the icon cannot be nudged with `translate`. Moving `mask-position` (or `background-position`) inside a box with a little spare padding does the same job, and the spare padding is handed back with a negative margin so the text after the link does not move.

## ⚠ The exclusions out-rank the hover rule

Every `:not()` in the selector counts as much as its argument, so three exclusions such as `:not([href*='example.com']):not([href*='localhost']):not(.no-indicator)` lift the base rule above a simpler `a[href^='http']:hover::after`. The hover rule then silently loses: no error, the icon just never changes. Wrapping the exclusions in [`:where()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:where), which always counts for nothing, keeps the base rule as weak as its plain part:

```css
a[href^='http']:where(:not([href*='example.com'], [href*='localhost'], .no-indicator))::after { … }
```

If the dim color is mixed from `currentColor`, a link whose own color changes on hover will tint the icon anyway, which can make a broken hover rule look half-working.

## In jedee

Eleventy Excellent ships an `external-link.css` that marks every outbound link on the site except buttons, as an absolutely positioned `inline-block` from `/assets/images/template/external.svg`, with visually hidden text "(external link)" read out as its alternative. jedee replaced it with a decorative arrow scoped to body text: links open in the same tab, so nothing is announced.

The rule is `src/assets/css/local/external-link.css`, scoped to `:is(.prose, .design-system)` and using EE's SVG as a mask. At rest the arrow is `currentColor` at 45%, like the dimmed dots under an [[Abbreviations|abbreviation]]; on hover it turns `--color-accent-orange`, the link text's hover color, and lifts `--external-lift` (0.1em, about 2px) up and to the right by moving the mask. The lift eases in like a plane leaving a runway and settles back with `--ease-out-quad`; with reduced motion only the color changes (see [[Choreographing CSS animations]] for the site's other motion). `.no-indicator` opts a link out, for links whose content is a picture rather than words.

Outbound links still without an arrow, on purpose: the footer's SDG and JEDEE links (site chrome, not reading text) and the headline links on bookmark, like, RSVP and repost cards, which opt out with `no-indicator`.

Raw source: `src/_raw/dev-notes/How the external-link arrow works.md`
