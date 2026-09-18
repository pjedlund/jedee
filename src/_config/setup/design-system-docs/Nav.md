# Nav

The post-type mega-menu: one disclosure that drops a two-column table of contents of every post type — icon, name, leader dots, count.

Built on Manuel Matuzović's layered pattern: plain `<a>` list, then `<ul role="list">`, then a `<nav>` landmark, then a JS-injected toggle. Each layer works if the one above it fails.

## When to use

It is the site's one main navigation. There is no second menu.

## The layer that matters

The MENU button is cloned from a `<template>` by script and inserted *before* the list, so tab order is button then first link. Without JS no button exists and the panel is a plain visible list — that is the fallback, not a degradation. Never write the button into static HTML.

Visibility is driven off the button's `aria-expanded`, not a class on the list, and it hides with `visibility` rather than `opacity` or a transform, so hidden links are not still tabbable. Escape closes and returns focus to the button; a click outside closes it.

## What the consumer provides

`aria-current="page"` on at most one link. The counts come from each collection's length. Never `role="menu"` or `role="menuitem"` — those are for application command menus and put screen readers into a mode that hides the rest of the page.
