---
description: "Making a site usable by people with disabilities: WCAG's four principles and three levels, what can be checked automatically, and where each part of the work lives in this wiki."
date: 2026-09-14
---

Web accessibility means building pages that people with disabilities can perceive, operate and understand: people who use a screen reader, a keyboard or a switch instead of a mouse, who magnify the page, who are color-blind or have low vision, who get motion sickness from animation, or who have cognitive disabilities. Much of it is simply building a page well for everyone: text at a readable length, controls that say what they do, a page that does not move under the reader.

The reference standard is the W3C's [Web Content Accessibility Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/) (WCAG). WCAG 2.2 has been the current Recommendation since October 2023. Most laws and accessibility statements still cite 2.1 (2018); 2.2 mostly adds criteria, and retires one, 4.1.1 Parsing. Its success criteria sit under four principles:

| Principle | The question | For example |
| --- | --- | --- |
| Perceivable | Can the content reach the senses the reader has? | text alternatives, contrast, not relying on color alone |
| Operable | Can every control be used, with any input? | keyboard access, visible focus, motion that can be avoided |
| Understandable | Can the reader follow it? | the page's language, predictable navigation, clear labels |
| Robust | Can assistive technology read it? | a name, role and state on every control |

Each criterion has a level: A, AA or AAA. AA is the usual target and what most legislation references, including the EU's EN 301 549. The W3C advises against requiring AAA for a whole site, because some AAA criteria cannot be met for some content; single AAA criteria are still worth meeting where they cost little.

Automated testing covers only what a rule engine can decide from markup and computed styles: a missing `alt`, a contrast ratio, a field with no label. Whether an alt text is *good*, whether the keyboard order makes sense, whether a screen reader announces a change — those need a person. [[The accessibility test]] covers what jedee's rule engine sees and what it cannot.

## In jedee

The site's public [accessibility statement](/accessibility/) targets **WCAG 2.1 Level AA** and names pa11y-ci as its test. ⚠ Two criteria new in 2.2, 2.4.11 Focus Not Obscured (Minimum) and 2.5.8 Target Size (Minimum), both AA, have not been checked here.

### What is tested

`npm run test:a11y` runs pa11y-ci with HTML_CodeSniffer's `WCAG2AA` rules over the paths listed in `meta.js`. Three limits, each written up on [[The accessibility test]]:

- ⚠ It is a spot check of **ten pages**, chosen to cover the layout shapes, not the whole site.
- ⚠ It sees **light mode only**. Dark mode is checked by a separate script, `_local/tests/a11y-nojs.js`, which also covers the no-JavaScript rendering pa11y cannot load.
- ⚠ A passing contrast rule over a `color-mix()` color can mean the engine could not read the color, not that it passed. The style guide's primary button measured 3.45:1 on 2026-08-04 while pa11y reported nothing.

### What came from Eleventy Excellent

| Convention | WCAG | Eleventy Excellent | jedee |
| --- | --- | --- | --- |
| Skip link to `#main` (`skip-link.css`, `header.njk`) | 2.4.1 Bypass Blocks (A) | stock | stock |
| A strong `:focus-visible` ring, with the plain `:focus` ring removed | 2.4.7 Focus Visible (AA) | 3 `:focus-visible` rules | 16 |
| Reduced motion: the reset shortens every animation under `reduce`, and effects opt in under `no-preference` | 2.3.3 Animation from Interactions (AAA) | 3 `prefers-reduced-motion` rules | 12 |
| `.visually-hidden` text labels on icon-only controls | 4.1.2 Name, Role, Value (A) | stock | in 17 places in templates |
| `forced-colors` rules for Windows high-contrast mode | — | none | 5, in the main menu, search and place map |

Counted in both repositories' `src/assets/css/` on 2026-09-14.

### Where the rest lives

- **Perceivable:** [[Alt text]] (1.1.1 Non-text Content); [[Syntax highlighting]], whose Colors section checks the code palette under simulated red–green color blindness (1.4.1 Use of Color); [[Typographic conventions]], with what each book-typography rule costs in accessibility; [[Line length]] (the 80-character limit in 1.4.8 Visual Presentation, AAA).
- **Operable:** [[Focus rings and paint containment]] (2.4.7, and a focus ring that clipping hides); [[The main menu]] (a disclosure that works by keyboard and without JavaScript); [[The theme toggle]] (reduced motion, and the control's label).
- **Understandable:** [[The lang attribute]] (3.1.1 Language of Page, 3.1.2 Language of Parts); [[Abbreviations]] (3.1.4 Abbreviations, AAA).
- **Robust:** [[Tooltips]] (4.1.2 — generated content is not a dependable accessible name).

### Decisions

- **Low contrast on decoration is not a defect.** An `aria-hidden` icon beside a text label carries no information of its own, so neither 1.4.3 Contrast (Minimum) nor 1.4.11 Non-text Contrast applies to it. On the mega-menu pass (2026-08-01) one such icon was raised to 4.97:1 and then reverted; its contrast is a design choice, not a fix.
- **AA, plus AAA where it comes cheap.** The 60ch measure sets about 72 characters per line, inside the width part of 1.4.8. Wiki pages expand their abbreviations through a shared glossary (3.1.4), and motion honors `prefers-reduced-motion` (2.3.3). None of this is a claim of AAA conformance.

Raw source: `src/pages/accessibility.md`, `src/_data/meta.js`, `src/assets/css/` in jedee and in Eleventy Excellent, and the pages linked above, read on 2026-09-14; WCAG 2.2 at w3.org.
