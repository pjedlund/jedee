---
description: "Why an Eleventy project is called a site rather than a theme: Hugo and WordPress separate presentation into an overridable layer, Eleventy has no such layer, and its unit of reuse is a starter you fork and own."
date: 2026-09-05
---

"Theme" is the everyday word for what a designer builds on WordPress, and it does not transfer to Eleventy. The word exists because WordPress splits a site in two — content in a database, presentation in a swappable layer on top — so the presentation half is a nameable thing that can be replaced without touching the content. [Hugo](https://gohugo.io/) keeps the same split without the database. Eleventy keeps neither half separate: output-producing templates, layouts, partials, CSS, data files and build config are one tree, and swapping "the theme" means swapping the site.

So there is no sub-unit to name, and the term for an Eleventy project is **site**, or **site repo**. *Static site* describes what it produces — plain HTML files, no server thinking per request. *SSG project* works in writing. *Jamstack site* was the 2019–2022 label and has faded. **App** is wrong: it implies a running server or a client-side application holding state, and a static site has neither.

## A theme layer is a lookup order, not a folder

The mechanism that makes a theme replaceable is per-file resolution order. Hugo's [template lookup order](https://gohugo.io/templates/lookup-order/) consults the project's own `layouts/` before the theme's, path by path, so any single file can be overridden without editing the theme; [Hugo Modules](https://gohugo.io/hugo-modules/) (0.56, 2019) generalize this into mountable, composable Go modules. WordPress does the equivalent with its [template hierarchy](https://developer.wordpress.org/themes/basics/template-hierarchy/) plus child themes.

Both pay the same price: an override is a *copy*. Upstream changes its version of the file, the local copy keeps winning, and nothing reports it. The staleness is silent by construction — the same failure shape as a quoted code snippet that no longer matches the code it quotes.

## Eleventy has no such layer

Two things would have to exist, and neither does. Measured against `@11ty/eleventy` 3.1.6 on 2026-09-05.

**There is no fallback chain.** `dir.includes` and `dir.layouts` are each exactly one directory — `ProjectDirectories.js` normalizes each through a single `setIncludes()` / `setLayouts()` call, with no array form. There is nowhere for a theme's files to sit underneath the project's own.

**Virtual templates are additive, not underlaid.** `eleventyConfig.addTemplate()` ([3.0+](https://www.11ty.dev/docs/virtual-templates/)) lets a plugin register a template from code with no file on disk, which is the closest Eleventy comes to shipping templates in a package. It is not a lookup order. A collision throws:

```js
// EleventyFiles.js
paths = paths.concat(virtualTemplates);

// Virtual templates can not live at the same place as files on the file system!
if (paths.length !== new Set(paths).size) {
  throw new Error(
    `A virtual template had the same path as a file on the file system: "${path}"`
  );
}
```

And layouts and includes never reach that check: the paths are first filtered by `this.dirs.isTemplateFile(path)`, which returns `false` for anything under `layouts` or `includes`. A plugin can therefore add pages, but cannot ship a layout or a partial, and cannot replace anything.

This is deliberate rather than missing. Eleventy's stated position is that it does not dictate project structure, and a tool that does not know what the layers are cannot offer to override one.

## The unit of reuse is a starter

What Eleventy has instead is the starter: a complete repo you copy and then own outright. [Eleventy Excellent](https://github.com/madrilene/eleventy-excellent) is one. Lene Saile calls it a starter rather than a theme, which is the accurate word — the moment it is copied it stops being a layer and becomes the site.

The trade against Hugo is not one-sided. A forked starter is uglier to upgrade, because the upgrade is a merge rather than a version bump. But a merge conflict is a *message*: it names the file and shows both versions. A stale Hugo override says nothing at all. In practice a heavily customized Hugo site also accumulates a `layouts/` full of copied theme files — the same fork, without git tracking which upstream version each copy came from.

## In jedee

jedee is a fork of Eleventy Excellent, not an installation of it. The consequences follow directly from the above:

- **Upgrades are a git merge**, handled by hand, and the seam between stock and fork exists only as a written record — [[What jedee kept from Eleventy Excellent]] is that record.
- **The folder structure carries no layer boundary**, which is what makes it read as untidy next to Hugo's. Nothing in `src/` marks which files came from the starter and which are this site's own.
- **One genuine piece of mess is EE's own choice, not Eleventy's**: compiled CSS and JS are written into `src/_includes/css/` and `src/_includes/scripts/` so a template can inline them, which puts build output inside a source directory. That arrangement is the precondition for the rebuild loop described in [[Watch loops]].
- **The underscore convention is inconsistent** — `_data` and `_includes` are marked, `assets` and `posts` are not, and nothing in the tree explains the difference.

Reorganizing toward an explicit stock/fork separation was considered on 2026-09-05 and deferred: without a lookup order in the tool, any separation would be convention only, enforced by nothing.

Raw source: `src/_raw/dev-notes/How an Eleventy project has no theme layer.md`
