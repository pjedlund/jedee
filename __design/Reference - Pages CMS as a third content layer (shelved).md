# Reference — Pages CMS as a third content layer (shelved)

**Status:** Evaluated 2026-06-07, **shelved by decision**. Not built. Revisit once the
photo (and other rich) post-type frontmatter has settled — see *Prerequisite* below.

**Goal that prompted this:** a third content-authoring layer alongside the two we have —
**Micropub** (post-from-anywhere create) and the **Obsidian Web Clipper** (capture an
external thing into a post) — specifically to **edit and add posts from a phone or
tablet while on the go**. Local copy of Pages CMS for reference:
`/Users/johanedlund/Projects/pagescms-main` (v2.1.7).

---

## 1. What Pages CMS is (architecture)

[Pages CMS](https://pagescms.org) is a Next.js app (v16, React 19, Postgres + Drizzle,
better-auth, GitHub App auth) that edits content **in a GitHub repo by committing through
a GitHub App** — the *same delivery mechanism* the JEDEE Micropub endpoint already uses
(an edit → a shape-correct `.md` committed to `pjedlund/jedee`). It is driven by a single
**`.pages.yml`** config file at the repo root that declares:

- **collections** — a folder of like entries (→ each of JEDEE's 15 `src/posts/<type>/` folders), and
- **fields** — the form for each entry (→ the type's frontmatter), plus a **media** config.

Two deployment models:

- **Hosted** — `app.pagescms.org`. Install their GitHub App on the repo, add `.pages.yml`,
  edit from any device. **Zero infra** (no Postgres, no Next.js host, no GitHub App to
  create). **← chosen** (matches JEDEE's lean-web ethos).
- **Self-host** the Next.js app — needs Postgres + a self-created GitHub App + hosting +
  secrets. Rejected as too much infra for a single-user site.

**The local copy was only ever for understanding** — choosing hosted means we never run it.

## 2. The niche it fills (vs. Micropub + Clipper)

This is the framing that makes the feature worth doing at all:

| Layer | Verb | What it's for |
|---|---|---|
| **Micropub** | *create* | notes, replies, likes; films/books/albums via Sparkles editors |
| **Web Clipper** | *capture* | pull an external book/film/album/bookmarked page into a post |
| **Pages CMS** | *browse + edit* | open any existing post, fix a typo, change a field, manage a draft — **and it is the only mobile path for the four hand-only types** (audio/video/event/recipe) Micropub deliberately blocks |

So Pages CMS is the **manage/edit-on-the-go** layer, not just another *create* layer.
That's the value, and it's real.

## 3. Decisions reached during the brainstorm (carry these forward)

1. **Hosted**, not self-hosted (§1).
2. **Scope = all 15 post types** (the IndieWeb response types are nearly free to add).
3. **Photos:** edit all frontmatter + upload the **display image** (`photo.src`) into
   `src/assets/images/photos/` via the CMS; the **R2 original**
   (`photo.downloads.original` + `bytes`/`width`/`height`) **stays a manual/laptop step** —
   Pages CMS uploads only ever commit into the git repo, it cannot push to
   Cloudflare R2. See [[project_jedee_media_host]].
4. **Body = raw-markdown editor**, never rich-text. Rich-text round-trips through turndown
   and would mangle `[[wikilinks]]`, footnotes, and `{:attributes}` (same silent-data-loss
   class as §4). JEDEE's markdown-it stack (footnotes, wikilinks, attributes, abbr, anchors)
   makes raw markdown mandatory.
5. **Never declare `category`.** It is the *post type* (drives collections) and is inherited
   from each `<type>.json` directory data file — the same collision the Micropub build
   learned (Micropub `category` = user *tags* → `tags`; this stack's `category` = the type).
   See [[project_jedee_micropub_skill]].

## 4. THE decisive finding — Pages CMS silently strips unmodeled frontmatter

**Pages CMS does not preserve frontmatter keys it doesn't know about. On the *read* path,
before the editor even loads, any key not declared in `.pages.yml` is dropped — so on
save the file is rewritten with declared fields + body only.**

Code evidence (in the local copy):

- `lib/schema.ts` → `deepMap` (lines ~24–82): builds the result object by iterating
  **`schema.forEach(field => …)`** and reading `data[field.name]`. Keys present in the file
  but absent from the field list are **never copied into the result.**
- `app/api/[owner]/[repo]/[branch]/entries/[path]/route.ts` → `parseContent` (line ~157):
  parses the file to a full object, then runs that same `deepMap` over **only**
  `schema.fields`. The strip happens at **load time**; the form only ever holds declared
  fields; the save writes them back.
- `lib/serialization.ts` parses/stringifies the whole object (body special-cased), but the
  field-level filtering above is what governs survival. No merge-back-into-original exists
  on the write path (grepped: no `merge`/`preserve`/`...rest`).

**Consequence — the load-bearing constraint:** every collection must model **every**
frontmatter key that type can carry, *faithfully*, or **editing a post deletes the
unmodeled keys** (e.g. open a photo, save, and lose `syndication` or `photo.downloads`).
A half-built config is **worse than no CMS** — the damage is silent and committed straight
to `main`. Any future round-trip test must be: *open a real existing post → save unchanged
→ assert the git diff is empty.*

## 5. Per-type difficulty (for when we build it)

- **Trivial** (flat frontmatter + body): `notes`, `articles`, and the response types
  `likes`/`replies`/`reposts`/`rsvps`/`bookmarks`. Bonus: the **camelCase URL-target keys**
  (`likeOf`, `inReplyTo`, `repostOf`, `bookmarkOf`) that forced *engine patches* in Micropub
  are **free** here — Pages CMS writes exactly the field names you declare, so the whole mf2
  hyphen-vs-camelCase problem disappears.
- **Mild** (structured → `object`/`list` fields): `events` (start/end/location),
  `recipes` (ingredient + step lists), `reading`/`watching`/`jams` (cover + rating +
  the optional `slug:` override).
- **Hard** — `photos`: nested `photo` object **and** the two-image split (repo display image
  vs. R2 original, §3.3). The trickiest type, and the one still most in flux.

**Cross-cutting:** filenames must stay **Title-Case** (Obsidian wikilinks) while URLs
slugify — Pages CMS's per-collection `filename` template handles this; the permalink
families are `{{ page.fileSlug }}` (most types) vs. `{{ (slug or …) }}`
(articles/jams/reading/watching honor an optional `slug:`).

## 6. Why it was shelved (the actual decision)

The §4 strip behavior turns **"is my frontmatter schema frozen?"** into a *hard
prerequisite*. JEDEE's **photo** schema (and probably `events`/`recipes`/the capture types)
is still evolving — Johan can feel that more frontmatter edits are coming. Adopting Pages
CMS now would **couple the CMS config to a moving schema**: every future field change would
have to be mirrored into `.pages.yml` in lockstep, and any drift wouldn't error — it would
**silently delete** the field from the next post edited. Building the CMS layer on top of an
in-flux schema is premature. **Decision: capture the findings, shelve the build.**

(The flat/settled types — notes/articles/response types — carry no such risk and *could*
have gone first as a safe slice; recorded here in case a "stable types now" slice is wanted
before the full schema work is done.)

## 7. Prerequisite before revisiting

1. **Settle the `photo` post-type frontmatter** (and audit the other rich types:
   `events`, `recipes`, `reading`/`watching`/`jams`) as its own piece of work — independent
   of Pages CMS. Output: a frozen, documented per-type frontmatter contract.
   (Related: [[project_jedee_micropub_frontmatter_vocab]] already froze the
   status/visibility/slug spine + per-type contract for the *Micropub* tier — extend that
   thinking to the photo/rich shapes.)
2. **Then** build Pages CMS against the frozen target: hosted install + `.pages.yml`,
   **faithful, type-by-type, each round-trip-tested** (open → save → empty diff) before the
   next. Consider a **stable-types-first** slice if value-now is wanted.

## 8. References

- Pages CMS docs: <https://pagescms.org/docs> · config (`.pages.yml`), fields, media.
- Local copy: `/Users/johanedlund/Projects/pagescms-main` (v2.1.7) — reference only.
- Sibling layers: `__project_docs/micropub-pattern.html`,
  `__project_docs/web-clipper-pattern.html`; skills `micropub`, `web-clipper`.
- Media host: [[project_jedee_media_host]] (Cloudflare R2 / `r2.dev`).
- Post-type model: `__design/Plan - Phase 3 (10 new post types) - final.md`,
  `__design/Plan - Photo post type (Phase 3b design).md`.
