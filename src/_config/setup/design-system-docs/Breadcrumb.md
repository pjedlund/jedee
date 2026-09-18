# Breadcrumb

Top-left wayfinding that replaced the site logo.

The home crumb is the logomark; the last crumb carries the page title. Separators are CSS-drawn chevrons, not characters — the `›` glyph is not in the font subset — and they are inert to assistive tech.

## When to use

On every page. It shares the header row with the theme toggle and the search control.

## Behaviour worth knowing

The trail shrinks so its last crumb can truncate, while the controls stay pinned to the end — the header row stays on one line and never grows. The home page has no leaf, so a shared line height keeps the row from jumping between home and everywhere else.

Muted ancestor links sit at 85% of the text color against the background, which is what keeps them above 4.5:1; 60% rendered at 2.92:1 and failed.

## What the consumer provides

A `<nav aria-label="Breadcrumb">` around an ordered list, the last crumb as a `<span aria-current="page">` rather than a link, and a `.visually-hidden` label on the logomark.
