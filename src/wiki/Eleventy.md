---
description: "How Eleventy turns a folder of files into a website — templates, the data cascade, layouts, collections and the config file — and why it draws no line between a site's content and its design."
date: 2026-10-31
updated: 2026-11-02
redirectFrom:
  - /wiki/shared-files-and-site-files/
---

[Eleventy](https://www.11ty.dev/) (also written 11ty) is a static site generator: a Node.js program that reads a folder of files, combines each one with the data that applies to it, and writes plain HTML to an output folder. Nothing of Eleventy runs in the browser, and nothing runs on a server when a page is requested; any JavaScript a page carries is something the site added. Zach Leatherman released it in 2017 as a JavaScript take on Jekyll; version 3 (2024) made the configuration an ES module.

## How a build works

**Input and output.** Eleventy reads an input folder and writes to an output folder. Every file in the input with a known template extension becomes a page. Anything else is ignored unless the configuration copies it through untouched (a *passthrough copy*, used for fonts, images and scripts).

**Template languages.** A page can be Markdown, Nunjucks, Liquid, HTML, WebC or plain JavaScript (`.11ty.js`), and one project can mix them. A Markdown file is also run through a second language, Liquid by default, which is why `{{ title }}` works inside Markdown.

**Front matter and the data cascade.** A page usually starts with YAML front matter, and every page renders against one merged data object. Eleventy builds it from several sources, and where two set the same key, the one higher in this list wins ([Data Cascade](https://www.11ty.dev/docs/data-cascade/)):

1. computed data (`eleventyComputed`), which can derive values from everything below it
2. the page's front matter
3. a data file named after the page (`hello.11tydata.js` beside `hello.md`)
4. directory data files, the nearest folder first
5. front matter in the page's layouts
6. global data added in the configuration (`addGlobalData`)
7. global data files in `_data/`

Objects and arrays merge rather than replace. Most "why is this value wrong" questions in Eleventy come down to which of these sources won.

**Layouts.** `layout: post.njk` wraps a page's rendered content in another template, which can name a layout of its own, so a post sits inside a post frame inside the base HTML document. Layouts and partials live in their folders (`_includes` by default) and never become pages.

**Collections.** A page with `tags: post` joins `collections.post`, and `collections.all` holds every page. The configuration can build other collections with a function, by folder, date or any rule. A template loops over a collection to make an archive, a feed or a sitemap, and *pagination* turns one template into many pages, such as one page per tag.

**Permalinks.** A page's address follows its file path (`posts/hello.md` becomes `/posts/hello/`) unless `permalink:` sets another. `permalink: false` keeps a page in the data without writing a file.

**The configuration file.** `eleventy.config.js` exports a function that registers everything else: plugins, filters and shortcodes for templates, collections, passthrough copies, transforms that rewrite each page's HTML after rendering, and the folder names. A plugin is a function that makes the same calls, so a plugin can do nothing the configuration could not.

## No line between content and design

Eleventy does not divide a project into content and presentation. A blog post, the layout around it, the template that writes the RSS feed and the JSON file of site settings sit in the same input folder, and the tool calls each of them a template or data. Its [glossary](https://www.11ty.dev/docs/glossary/) defines a template as "a content file written in a format such as Markdown", and a layout as a template that wraps another: one word for the writing and for the frame around it.

The folder names don't draw the line either. The only folders Eleventy treats specially are the includes, layouts and data folders, marked with a leading underscore by convention. Everything else (posts, pages, CSS, images) is whatever the project makes of it. Data crosses both sides: a front-matter key can be text a reader sees (`title`), a design choice (`layout`), or both.

This is deliberate. Eleventy's stated position is that it does not dictate project structure, and that freedom is why it suits a hand-built personal site. The cost shows when the same machinery has to serve a second site, or when a starter it came from is upgraded: nothing in the tool says which files are the site's writing and which are its design, so the project has to draw that line itself, by convention, by a written list or by tests. Hugo and WordPress do separate the two, with a lookup order rather than a folder; [[Themes and starters]] makes that comparison and explains why the Eleventy word is *starter*, not *theme*.

## In jedee

jedee runs Eleventy 3.1, forked from the [Eleventy Excellent](https://github.com/madrilene/eleventy-excellent) starter. Input is `src/`, output `dist/`, layouts are in `src/_layouts/`, partials in `src/_includes/`, and Markdown's second language is Nunjucks (`markdownTemplateEngine: 'njk'`), all EE stock. So is the configuration's split into `src/_config/` (collections, filters, shortcodes, plugins, events); [[What jedee kept from Eleventy Excellent]] lists what jedee changed. The parts of Eleventy with a page of their own here: [[Anatomy of a post type]] for collections and directory data, [[Permalinks and Obsidian-friendly filenames]], [[WebC]], [[is-land]], [[The interlinker's second render pass]], [[The dev server's memory]] and [[Watch loops]].

jedee draws the line Eleventy leaves out, inside the one repo, in four ways:

- **A list of site files.** `tests/site-files.json` holds one pattern per line, and a file belongs to this site if a pattern matches it: the posts, pages, wiki, settings, featured list, navigation, images, CMS configuration, license, readme and the theme folder `src/_includes/themes/jedee/`. Everything else is the shared machinery.
- **A theme is a folder.** `settings.theme` names a folder in `src/_includes/themes/`; its logo, fonts, colors, tokens, start page, footer credit, wording and CSS all live there. `sample` is a neutral theme beside `jedee`. A name with no folder stops the build.
- **Switches and a post-type list.** Every part that was always on (header, menu, breadcrumb, footer, light/dark button, keyboard shortcuts, tooltips, service worker, feeds, webmentions, Micropub) has a yes/no setting under `switches` in `settings.yaml`, on unless set to false. `settings.postTypes` names the post types to build; a type left out has no posts, archive page, feed or menu link. `[]` builds none, and is a hand edit: the admin form never saves an empty selection.
- **Words.** Interface text is in language files plus the theme's `words.yaml`, so the shared layouts and partials carry no first-person text.

Switching a part off removes its CSS as well as its markup, because each piece of CSS is loaded by the thing that needs it: the `blocks` layer has no `@import`, and a block arrives through a page's local CSS. `npm run bare` builds a page with every switch off, no post types and the `sample` theme. On 2026-10-31 that came to 25.4 KB in total (7.1 KB compressed), against 88 KB before the split; run it again after any change to shared CSS.

Tests keep the line from blurring. `tests/no-personal-details.test.js` fails if a shared file contains this site's name, address or analytics id. `npm run compare` (`tests/compare-builds.mjs`) checks a build against a saved one page by page, with pictures, and `tests/compare-allowed.json` lists the intended differences, each with a reason. `tests/switches.test.js`, `tests/css-split.test.js` and `tests/post-types.test.js` build throwaway copies of the site with one setting changed and check what appears and what does not.
