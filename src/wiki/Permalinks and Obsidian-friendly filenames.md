---
description: "How the permalink pattern in each folder data file reconciles Obsidian filenames with clean web URLs."
date: 2026-07-31
---

The posts folder is an Obsidian vault as well as an Eleventy source, and the two want opposite things from a filename. Obsidian wants `Anna Karenina.md`, because `[[Anna Karenina]]` has to resolve by filename. The web wants `/reading/anna-karenina/`. The permalink pattern in each folder data file is what reconciles them.

## The standard form

```json
"permalink": "/notes/{{ page.fileSlug | slugify }}/index.html"
```

Eleven of the sixteen types use exactly this (ten in JSON, plus photo in its `.11tydata.js` — see [[Anatomy of a post type]]). `page.fileSlug` is the filename without its extension; `slugify` lowercases it, strips punctuation and diacritics, and joins words with hyphens. So the file keeps its Title Case, spaces and umlauts for Obsidian, and the URL comes out clean without anything being written twice.

⚠ The `nice-permalinks` skill documents an `{{ id }}`-based pattern. It does not apply here — jedee posts carry no `id:` field, and `page.fileSlug` is the convention.

## Four types take an override

Three types allow a hand-written slug to win:

```json
"permalink": "/watching/{{ (slug or page.fileSlug) | slugify }}/index.html"
```

`jams`, `reading` and `watching` use this form. It exists because a title can be a bad URL. The only post currently using it is `O Brother, Where Art Thou.md`, whose front matter sets `slug: o-brother` — the filename keeps the full title for the wikilink, and the URL doesn't have to carry it.

**Article is the exception, and it slugs from the wrong thing:**

```json
"permalink": "/articles/{{ (slug or title) | slugify }}/index.html"
```

Articles derive their URL from the `title` field, not the filename. That makes `title` load-bearing: an article with no title produces an empty slug and a broken permalink, silently, with nothing enforcing it. This is EE's stock behavior inherited from `articles.json` — every type added since deliberately slugs from `page.fileSlug` instead, and the specs for the later types each say so explicitly. Note the practical consequence: **renaming an article's title changes its URL**, while renaming any other type's title does not.

## Activities carries a date in the URL

```json
"permalink": "/activities/{{ date | formatDate('YYYY-MM-DD') }}-{{ page.fileSlug | slugify }}/index.html"
```

The sixteenth type is the only one whose URL is not the slug alone. Its filenames are already date-led (`2021-09-14-parkol-trelleborg.md`) because the archive was imported in bulk from a Strava export where the date is the only reliable distinguishing feature — the same race at the same venue recurs year after year. The date is in the permalink pattern rather than left in the filename slug so the format is guaranteed rather than a filename convention that a hand-written post could forget.

## Page bundles slug from the file, not the folder

A post that carries its own images can live in a folder of its own, EE's page-bundle layout. **The slug still comes from the `.md` filename** — Eleventy's `page.fileSlug` is the file's, not the folder's.

`src/posts/reading/` has exactly one, and it shows the difference clearly:

```
Drottningar i Kungahalla/                        ← folder, ASCII
  Drottningar i Kungahälla - Selma Lagerlöf.md   ← file, umlauts + author
```

The URL comes out of the file: `/reading/drottningar-i-kungahalla-selma-lagerlof/`. The folder name is free to differ, and here it does. Worth knowing before renaming a folder in the hope of changing a URL — it won't.

## Redirects when a URL does change

Renaming a file breaks its URL. EE ships the fix: `redirectFrom: ['/old-path/']` in a post's front matter, which `_redirects.njk` collects into a single Netlify redirects file at build. Never hand-edit the generated file — see the `netlify` skill.

Related: [[Anatomy of a post type]] · [[Wikilinks]]
