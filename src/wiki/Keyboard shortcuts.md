---
description: "Keyboard shortcuts on a website: which key combinations WCAG allows, the browser keys a site must not take, why an Option shortcut has to be read from the key's position, and a shortcuts list in a native dialog."
date: 2026-10-07
---

A website can listen for key presses and give them meaning: `/` or ⌘K to search, `j` and `k` to move between posts. Done carelessly it takes keys away from the people who need them most, so WCAG sets a rule and the browsers set a few more.

## Single keys and WCAG 2.1.4

[WCAG 2.1.4 Character Key Shortcuts](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html) (Level A) covers shortcuts made of a single character: a letter, a number, punctuation or a symbol, with or without Shift. Someone using speech input who dictates a sentence sends a stream of letters, and every one that happens to be a shortcut fires. Someone with a tremor or a switch device hits keys they did not mean. So a single-character shortcut is allowed only if one of these holds:

- it can be **turned off**,
- it can be **remapped** to include a modifier key (Ctrl, Alt/Option, Cmd),
- it only works **while a particular control has focus**, like the arrow keys inside a listbox.

Shift does not count as a modifier, because Shift+G still types a character. A combination with Ctrl, Alt/Option or Cmd is outside the criterion, so it needs none of the three.

## Keys a site should not take

Some combinations already belong to the browser or the operating system, and a page that calls `preventDefault()` on them breaks something people rely on, if the browser lets it at all.

- **Ctrl plus a letter on Windows and Linux** is mostly taken: Ctrl+F find, Ctrl+G find next, Ctrl+L the address bar, Ctrl+V paste. Ctrl+K is the one sites have settled on for search, though some browsers bind it too.
- **Alt plus a letter** opens a menu in Firefox on Windows and Linux: F, E, V, S, B, T and H (File, Edit, View, History, Bookmarks, Tools, Help). Any other letter is free.
- **Cmd plus a letter on a Mac** is mostly the browser's: ⌘F, ⌘G, ⌘L, ⌘R, ⌘T, ⌘W. ⌘K is the usual site search key, matching Ctrl+K.

## Reading an Option key

On a Mac, Option changes the character a key types: ⌥G types ©, ⌥R ®, ⌥L ¬. A handler that checks `event.key === 'g'` never sees the shortcut. `event.code` names the physical key instead (`KeyG`), so an Option shortcut has to be matched on it:

```js
document.addEventListener('keydown', event => {
  if (event.code !== 'KeyG' || !event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  toggleGrid();
});
```

`event.code` has two costs. It is the key's position on a US layout, so on an AZERTY keyboard "KeyG" is still the key where G sits on QWERTY. And it can arrive empty from a virtual keyboard or some assistive technology. A Cmd or Ctrl shortcut does not change the character, so it can use `event.key`, which follows the layout. The early return for form fields matters for Option shortcuts in particular: someone typing © in a text field must still get ©.

## Listing them

A shortcut nobody knows about is wasted, so sites that have several list them. [Ariel Salminen's site](https://arielsalminen.com) puts hers in a modal opened with ⌥L, one sentence per key: "Press ⌥ + A to toggle the layout grid."

The native `<dialog>` does most of the work: `showModal()` makes the rest of the page inert, keeps focus inside, closes on Esc and returns focus to whatever opened it. A `<form method="dialog">` holding the Close button closes it with no script. The [`closedby="any"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) attribute adds closing on a click outside the box; where it is not yet supported, a click handler covers it by checking that the click landed outside the dialog's rectangle (a click on the backdrop is reported with the dialog itself as its target, and so is a click on the dialog's own padding). Keys are written with `<kbd>`, which is the element for user input.

## In jedee

Since 2026-10-07 the whole site has four shortcuts, listed in a dialog:

| keys | does |
| --- | --- |
| ⌘K / Ctrl+K | opens the search and puts the cursor in it |
| ⌥G / Alt+G | shows or hides the column grid |
| ⌥R / Alt+R | shows or hides the rhythm lines ([[Vertical rhythm]]) |
| ⌥L / Alt+L | opens the list of shortcuts |

Inside the search, ↑ and ↓ move through the results and Enter opens one; those only work while the search has focus, which is the third way through 2.1.4. The grid and rhythm overlays began as a development aid on bare G and V. Taking them to the live site was what forced the change: they became ⌥G and ⌥R, and the rhythm key moved off V because Alt+V opens Firefox's View menu.

The dialog is `partials/shortcuts.njk`, included from `base.njk`, with `bundle/shortcuts.js` and `local/shortcuts.css`. The markup uses the Mac symbols; on any other system the script swaps each `<kbd data-pc="Ctrl">⌘</kbd>` for its `data-pc` text. `⌘` and `⌥` were added to the Source Sans subset for the key caps ([[Font subsetting]]).

The footer has a **Keyboard shortcuts** button that opens the same dialog. It is rendered with `hidden`, and the script removes that, so without JavaScript the button never appears. It is also hidden on touch-only devices (`(hover: none) and (pointer: coarse)`), which have no keyboard to use it with. A tablet with a keyboard but no trackpad may still report a coarse pointer and lose the button; the shortcuts work there regardless.

Raw source: `src/_raw/dev-notes/How the keyboard shortcuts came to the live site.md` (the session of 2026-10-07).
