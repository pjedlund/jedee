# ThemeToggle

A single control that shows the *current* theme — sun in light, moon in dark — and morphs between them.

Adapted from Adam Argyle's web.dev theme switch (MIT), retokenized.

## When to use

Once, in the header. The theme itself lives on `<html data-theme>`, set before paint by an inline script, so there is no flash of the wrong theme on load.

## Accessibility contract

The SVG is decorative and marked `aria-hidden`. The accessible name is a `.visually-hidden` label and does not change with the theme. The state rides on `aria-pressed`.

The visible tooltip *does* follow the theme — "Show dark mode" / "Show light mode" — which is why the script sets it rather than the markup. There is deliberately no `title` attribute: it would show a second tooltip alongside the first.

## What the consumer provides

The button lives inside `<is-land on:idle>` so it only appears once JS has upgraded it — a toggle that cannot run should not be visible. The no-flash theme is set independently of this button, so hiding it never leaves a reader stuck.
