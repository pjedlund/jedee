---
description: "Which files in this repo belong to one site and which are shared machinery, how a theme, the switches and the post-type list let another site reuse the shared part, and the tests that keep the line from blurring."
date: 2026-10-31
---

A site built on a starter is two things tangled together: the machinery that turns files into pages, and the files that are one particular site. A fork never separates them, so the first time a second site wants the machinery it finds Johan's name in a footer, his fonts in the stylesheet and his sixteen post types in the menu. What a site *owns* is the answer to "which of these files would I replace, and which would I keep?" Drawing that line is what makes a starter reusable, and the line only holds if something checks it.

Hugo and WordPress draw it with a lookup order, so a site's files sit on top of a theme's ([[Themes and starters]] explains why Eleventy has no such thing). Without that, the line has to be kept by convention and enforced by tests.

## In jedee

The shared part is everything outside the site-owned list. The list is `tests/site-owned.json`, one pattern per line, and it is the definition: a file is the site's own if a pattern matches it, shared if none does. It covers the posts, the pages, the wiki, the settings, the featured list, the navigation, the images that are Johan's, the CMS configuration, the licence and the readme, and one folder of the theme code, `src/_includes/themes/jedee/`.

Four things let a second site reuse the shared part without editing it:

- **A theme is a folder.** `settings.theme` names a folder in `src/_includes/themes/`; its logo, fonts, colours, tokens, start page, footer credit, wording and CSS all live there, and the `sample` theme is a neutral one to copy. A name with no folder stops the build.
- **Switches.** Every part that was always on, such as the header, menu, breadcrumb, footer, light/dark button, keyboard shortcuts, tooltips, service worker, feeds, webmentions and Micropub, has a yes/no setting under `switches`, on unless set to false.
- **A post-type list.** `settings.postTypes` names the post types a site builds; a type left out has no posts, archive page, feed or menu link. `[]` builds none. The admin form treats an empty selection as "not set" and never saves it, so `[]` is a hand edit.
- **Words.** Interface text is in language files plus the theme's `words.yaml`, so the shared templates carry no first-person text of their own.

Switching a part off also removes its CSS, not only its markup. A piece of CSS is loaded by the thing that needs it, so a page with no header carries no header rules. That is measured by building a bare page with every switch off, no post types and the `sample` theme (`npm run bare`). At the time of writing it came to 25.8 KB in total (7.1 KB compressed), against 88 KB before the work: 21.7 KB of shared CSS, no page-only CSS, and 4.1 KB of everything that is not CSS. Run it again after any change to shared CSS; the figure is a ceiling to stay under, not a promise.

Three tests guard the line. `tests/no-personal-details.test.js` fails if a shared file contains the owner's name, address or analytics id. `tests/compare-builds.mjs` builds the site and checks it against a saved build page by page, and with pictures, so a change meant for a second site cannot change johanedlund.se; `tests/compare-allowed.json` lists the differences that were intended, each with a reason. `tests/switches.test.js`, `tests/css-split.test.js` and `tests/post-types.test.js` build throwaway copies of the site with one setting changed and check what appears and what does not.

⚠ A new file that mentions Johan fails the personal-details test, and the fix is nearly always to move the text into the theme or the settings, not to add the file to the site-owned list. The list is meant to stay short.
