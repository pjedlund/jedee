# Card

The archive card for every post type, as a `<custom-card>` WebC component.

It is a named grid — `image`, `headline`, `meta`, `desc`, `footer` — so a slot with nothing in it collapses instead of leaving a gap. That is what lets one card serve sixteen post types with very different content.

## When to use

Any listing of posts. Not for a single post's own page.

## Variants

- `clickable` — the whole card becomes the hit area, via an overlay stretched from the heading link. The border picks up the orange accent on hover and focus-within.
- `img-square` — 1:1, for album covers.
- `data-poster` — 2:3, for books and films.
- `data-photo` — the image's natural ratio, for the masonry photo grid.
- `no-padding` — transparent, square corners, border only.
- `data-video` — adds a play affordance over the poster as a grid pseudo-element.

Default image ratio is 16:9.

## What the consumer provides

A heading containing the link, and whatever slots the post type has. Cards carry a faint jedee mark behind the picture: a cover that loads hides it, and one that failed at build shows it, so a missing image is visible rather than silent.
