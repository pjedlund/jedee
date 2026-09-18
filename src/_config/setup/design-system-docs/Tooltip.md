# Tooltip

A label under an icon-only control, on hover and on keyboard focus.

Content comes from `data-tooltip`. It is CSS-only — there is no script and no timer.

## When to use

Only on a control whose meaning is carried by an icon alone. Never as a substitute for a visible label on anything that has room for one, and never for text that matters: generated content is not a reliable accessible name, so the control still needs its own `.visually-hidden` label.

## Placement

Centred below the control by default. Two exceptions combine freely:

- `data-tooltip-align="start"` / `"end"` — anchor to that edge. A centred tooltip on a control at the page edge overflows the viewport.
- `data-tooltip-position="top"` — open upward. A hidden tooltip still takes part in layout, so one below a control near the foot of the page adds dead scroll.

## Behaviour worth knowing

A control marked `aria-current` shows no tooltip — it is inert on the page you are already on. Pressing a control dismisses its own tooltip, which would otherwise sit under the cursor; the control's script clears that when the pointer or focus leaves.
