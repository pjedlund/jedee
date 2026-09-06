---
description: "Where a browser clipper gets its data and why the tool constrains the front matter, plus jedee's one-JSON-template-per-source setup."
date: 2026-07-31
---

A large share of the posts on a personal site are about *someone else's* thing: an album, a film, a book, a page worth keeping. Typing that metadata by hand is usually the reason those posts never get written, so the practical question is how to turn a source page into a post in the site's own format with as few steps as possible.

Browser clippers do this by reading the page you are on and writing a file. The [Obsidian Web Clipper](https://obsidian.md/clipper) is the one organized around templates: a per-source configuration says which fields to extract, where each one comes from, and what file to write. Extraction draws on four sources, in descending order of reliability:

- **[JSON-LD](https://json-ld.org/) structured data**, where the site publishes it — the cleanest option, because it is data the site deliberately made machine-readable.
- **`<meta>` tags**, especially Open Graph, which almost every site has and which cover title, description and image.
- **Microdata and RDFa** — the other two schema.org encodings. They live in HTML attributes rather than a script block, so a reader built for JSON-LD cannot see them at all, and a source using them looks identical to one publishing nothing.
- **CSS selectors** against the page's markup: always available, and always the first thing to break when the source redesigns.

The constraint worth absorbing before designing any of this: **what the clipper can emit decides what the front matter may look like**, not the other way round. A field shape no clipper can produce becomes a manual step on every post forever — see [[The authoring tool decides the data model]].

## In jedee

Right-click a source page and the clipper writes a frontmatter-complete markdown file into the right `src/posts/<type>/` folder. The unit of configuration is one JSON template per source, git-tracked at `src/_obsidian/clipper/*.json`.

> The exhaustive per-type ledger is `_local/project_docs/web-clipper-pattern.html`, and the portable authoring guidance is the `web-clipper` skill. **Read those before editing a template** — this page is the orientation, not the reference.

### The shape

```json
{
  "name": "Bandcamp",
  "noteContentFormat": "{{schema:@MusicAlbum:track.itemListElement|map:…|template:\"- [${name}](${url})\\n\"}}",
  "properties": [
    {"name": "artist", "value": "{{schema:@MusicAlbum:byArtist.name|wikilink}}", "type": "text"},
    {"name": "genre",  "value": "{{schema:@MusicAlbum:keywords|wikilink}}", "type": "multitext"}
  ],
  "triggers": ["/bandcamp\\.com/album/"],
  "noteNameFormat": "{{schema:@MusicAlbum:name|safe_name}}",
  "path": "posts/jams/"
}
```

- **`path` decides the post type.** `category`, `layout`, and `permalink` are inherited from that folder's data file — the template never emits them. (Note the terminology collision: Micropub's `category` means *tags*, while this stack's `category` is the post *type*.)
- **`noteNameFormat` is the filename — title only, through `|safe_name`**, because the filename is both the Obsidian wikilink target and the Eleventy slug. No author or year suffix. `safe_name` strips filesystem-illegal characters, nothing more.
- **`cover` is a remote URL as plain `text`** — the build self-hosts it ([[Self-hosting remote images at build time]]).

### The three traps

**1. `type` decides the YAML, and it lives in three places.** `multitext` writes a YAML list *and splits the value on commas*, so a description on `multitext` shatters into a list at every comma. Worse, the JSON's `type` is only a **seed** — it applies the first time a registry meets a property *name*, and never overrides one already registered. The type actually lives in the Web Clipper's own Properties tab and in the vault's `src/.obsidian/types.json`. A field stuck as a list must be changed in those two places; re-importing cannot fix it. Because names are shared across all templates, a new template inherits whatever an older one registered — the raw clipper's `author` had to be `multitext` for exactly this reason.

**2. `{{schema:}}` reads JSON-LD and nothing else.** A source publishing RDFa or microdata leaves every field empty, with no error. Standard Ebooks is that case, so its template is built on `{{selector:…}}` and `{{meta:…}}` instead. **Check the rendered DOM of a real source page before writing a single `{{schema:}}`.**

**3. A regex trigger must be wrapped in forward slashes.** The clipper decides a trigger's kind by delimiters alone. An unwrapped regex is read as a literal URL prefix — and since no real URL contains `\.` or `[^/]+`, it silently never matches and the page falls back to the default template. This bit three templates at once.

### Two copies that drift

The git-tracked export is the source of truth; the live copy inside the extension is what runs at clip time. Editing one doesn't update the other. Re-export after any extension edit, re-import after any repo edit — a drifted export shows in `git diff`. And **import never overwrites**: importing a template whose name already exists appends "Name (1)" and keeps the old one, which can keep winning. Fix a live template by editing its fields in place.

### Finding the right vault

Obsidian names a vault after the folder it opens. This site's content is in `src/` — **the same folder name every Eleventy site uses**, so every Eleventy vault on the machine is named `src` and pointing the Clipper at the name is ambiguous.

Underneath the name each vault has a stable sixteen-character ID, minted when Obsidian first opens the folder, listed in `~/Library/Application Support/obsidian/obsidian.json` keyed by ID with the path as value. **Put the ID, not the name, in the Clipper's Vaults field.** `262cea0685d5b4ac` identifies exactly one vault; "src" identifies four.

The collision is a feature in the other direction: a fork keeps its content in `src/` too, so the templates in this repo can target the *name* and work unchanged for anyone who forks — on their machine "src" is probably the only vault by that name. The sameness that forces an ID locally is what makes the templates portable.

⚠ Until a vault is registered, the save button reads "Save file…" and downloads the clip instead of saving it. It's a split button — click the chevron and pick "Add to Obsidian" once.

Raw sources: `src/_raw/dev-notes/How the Web Clipper templates work.md`, `src/_raw/dev-notes/How the Web Clipper finds the right vault.md`
