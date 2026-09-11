---
description: "A git-based CMS that runs as one page inside a static site and edits its markdown through the GitHub API, and the traps met setting it up for sixteen post types."
date: 2026-09-11
---

A git-based CMS gives a static site an editing screen without giving it a database. It runs in the browser, reads the repo's markdown files through the GitHub API, shows their front matter as a form, and saves an edit as a commit, which then triggers the normal deploy. Netlify CMS started this kind of tool. It was renamed [Decap CMS](https://decapcms.org/) in 2023, and [Sveltia CMS](https://sveltiacms.app/) is a rewrite that its author offers as the successor: the same `config.yml` format, a much better phone interface, and direct uploads to Cloudflare R2. Sveltia is still in beta before 1.0 and mostly one developer's work, so its behavior can change between versions. Pin the version in the script address.

Setting it up takes two files in an `admin/` folder:

- `index.html`, which holds a single `<script>` tag and nothing else. The docs point out that AI assistants tend to add a stylesheet `<link>` or `type="module"`, and neither belongs there.
- `config.yml`, which lists **collections** (each maps to a content folder) and each collection's **fields** (each maps to a front matter key).

## The question that decides whether you can use one

What does the CMS do with front matter keys that aren't in its config? A site with a real data model has many keys nobody edits on a phone: media byte counts, syndication links, keys only one post type uses. A CMS that rebuilds the file from its field list deletes them all on the first save. A CMS that keeps them lets the config stay partial, so you declare only what you want to edit.

The docs rarely answer this, so check the source. Sveltia keeps them. Opening a post starts from a full copy of the parsed file, and saving writes the configured fields first, then "the remainder", every other key sorted alphabetically (`draft/create/index.js` → `buildDraft`, `draft/save/serialize.js` → `finalizeContent`, checked 2026-09-10). [Pages CMS](https://pagescms.org/) still deleted undeclared keys in 2.1.8. For this site that difference decided between the two.

## What a first save changes

Even when nothing is deleted, the first save of a file rewrites its shape. None of this loses data, and all of it shows in the git diff:

- **Key order.** Declared fields go first, in config order, and the rest follow alphabetically. ⚠ Sveltia sorts undeclared keys *at every depth*: it flattens them to paths like `photo.downloads.0.bytes` and sorts those, so the inside of a nested object gets reordered too.
- **Quote marks** around values are dropped or changed from double to single, which makes no difference to YAML.
- **Empty keys** get added for optional fields a post doesn't have, unless the config sets `output: { omit_empty_optional_fields: true }`.
- **Whitespace**: a blank line after the closing `---`, and a final newline if the file had none.

Declaring fields in the order most files already use keeps the first diff small.

## In jedee

Live at `/admin/` since 2026-09-10 (`admin/index.html` and `admin/config.yml`, copied through unchanged, `noindex`), pinned to `@sveltia/cms@0.209.1`, saving straight to `main`. It is the third way content gets into the site: [[Micropub]] creates posts from a phone, the [[Web Clipper templates|Web Clipper]] captures them from a source page, and Sveltia edits existing ones. It is also the only phone route for the post types Micropub doesn't handle (audio, video, event, recipe). Neither Eleventy Excellent nor indiee ships a CMS, so all of this is jedee's own.

All 16 post types are configured. Each shows a shared set of fields (title, description, date, tags, draft, body), response types add their link field, and photos and jams have a few more. New posts can only be created in notes and articles; everything else starts from Micropub or the clipper, which already know each type's shape (see [[The authoring tool decides the data model]]). `category` is never declared, because each folder's data file sets it and posts don't carry it.

```yaml
backend:
  name: github
  repo: pjedlund/jedee
  branch: main
  auth_scope: public_repo

output:
  omit_empty_optional_fields: true

slug:                     # keep Title-Case filenames for Obsidian
  lowercase: false
  sanitize_replacement: ' '
```

The post body uses the plain markdown mode (`widget: markdown`, `modes: [raw]`), so wikilinks, footnotes and `{:attrs}` are never rewritten. The rich-text mode once escaped `**bold**` on saves that only touched the title ([issue #556](https://github.com/sveltia/sveltia-cms/issues/556), fixed 2025-12). Plain mode avoids that whole kind of bug.

### Five traps, each found by a real save

- ⚠ **The datetime field drops seconds.** A stored `2026-06-15T21:02:11+02:00` came back as `21:02:00` on save, even with `step: 1`. The picker builds its value from hour and minute only (`date-time/helpers.js` → `formatDateTimeValue`), so every stored time with seconds reads back as `:00`, and saving writes that over the original. No option fixes it. `date` is therefore a plain text field with a `^\d{4}-\d{2}-\d{2}` pattern, and a new post's date is typed by hand.
- ⚠ **A collection lists only the files directly in its folder.** Posts in subfolders don't show up at all. Articles live in year folders, but Micropub writes new ones at the top level, so a `path: '{{year}}/{{slug}}'` pattern would have hidden the new ones. The fix is `nested: { depth: 2, subfolders: false }`, where the depth counts path segments including the filename. That reaches the top level and the year folders and skips anything deeper, such as the gitignored `-drafts/` and the starter's demo post. The 111 This Is My Jam posts in `jams/thisismyjam/` got their own collection instead. One book in its own folder moved up into `reading/`, and its URL stayed the same because it comes from the file name (see [[Permalinks and Obsidian-friendly filenames]]).
- ⚠ **The body is required by default.** A post without text (many jams, likes, photos) couldn't be saved until `body` got `required: false`. With `omit_empty_optional_fields`, an empty body is written as nothing after the closing `---`.
- **Object fields keep their undeclared subkeys.** A photo's `photo:` is an `object` field with alt, caption and the film details declared. `photo.src` and `photo.downloads` are deliberately left out, and a save keeps them, sorted after the declared ones. Declaring them would rewrite the image path or retype the R2 byte counts, which must match the served file (see [[Hosting large originals off-repo]]).
- **Filenames of new posts.** The default slug is lowercase with hyphens, and `lowercase: false` plus a space as the replacement keeps Title-Case names. Punctuation (commas, colons, apostrophes, `?`, `&`) still becomes a space, though, so a title with punctuation won't match its filename. Existing files are never renamed.

### Signing in

There are two ways in, both through GitHub:

- **An access token** is the narrowest: a fine-grained GitHub token limited to `pjedlund/jedee`, with read and write access to its contents, pasted once into the browser.
- **"Sign In with GitHub"** uses Netlify as the go-between, so the site needs no server of its own. It needs a GitHub OAuth App (callback `https://api.netlify.com/auth/done`) installed as a provider in Netlify, and it works on the live site only. Sveltia sends the page's host name as Netlify's site ID. ⚠ The scope defaults to `repo`, which grants write access to every repository including private ones, so the config narrows it to `public_repo`. That still covers every public repository, not just this one.

### How changes are checked

Adding a field is checked before anything is saved for real. `_local/tests/sveltia-roundtrip.mjs` reproduces Sveltia's first save for every post, using the same YAML library and settings and reading the field lists from `admin/config.yml`. It then checks what Eleventy reads back. It matched real saves from the admin byte for byte: a note, a photo, an RSVP, a jam and a year-folder article. Its `--write-all` mode rewrites every post for a full before/after build, and on the first run no page changed. Rerun it after adding any field. It still only warns on `number`, `image` and lists of objects, which the config doesn't use yet.

Raw source: `src/_raw/Getting Started  Sveltia CMS.md`, and the setup record `_local/design/Reference - Sveltia CMS as the edit layer.md` (§2, §4, §6), read on 2026-09-11.
