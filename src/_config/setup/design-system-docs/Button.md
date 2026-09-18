# Button

One block with every variant as a data attribute, never a modifier class.

Colors derive from `--button-bg` through `color-mix()`, so a variant sets the background and the text, border and hover colors follow. That is why there is no `--button-hover-bg` to set: change the background and the rest stays in proportion.

## When to use

For actions and for links that should read as actions. Ordinary links inside prose stay links — the orange underline already carries them.

## Variants

- `data-button-variant="primary"` — the orange accent. At most one per view.
- `data-button-variant="secondary"` — the blue accent.
- `data-button-variant="tertiary"` — the page background tinted with accent green. Used for the draft badge.
- `data-ghost-button` — background drops to the page, border to the text color.
- `data-button-radius="hard"` — square corners instead of the pill.
- `data-small-button` — uppercase, tracked, `radius-medium`. Geometry matches the nav's MENU trigger; keep the two in step.
- `data-icon` — icon only. Holds a 48×48 hit area for WCAG 2.5.5 even though the glyph is small.

## What the consumer provides

An icon-only button needs a real `.visually-hidden` label — a `data-tooltip` is generated content and is not a reliable accessible name. `aria-current="page"` and `aria-pressed="true"` take the hover treatment automatically.
