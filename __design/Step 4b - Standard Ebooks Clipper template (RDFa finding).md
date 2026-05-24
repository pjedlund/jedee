# Step 4b — Standard Ebooks Clipper template + the RDFa finding

Date: 2026-05-24 (autonomous research session while Johan was away)
Repo: `/Users/johanedlund/Projects/JEDEE`
Branch: `feat/14-post-types`
Status: **Research complete + one verified artifact shipped** (`_resources/standard-ebooks-clipper.json`). Not committed (Johan pushes/commits himself). Extends `_generated/Step 4 - Clipper layer design.md`.

---

## What Johan asked for

Two things, while stepping away:
1. Add the Obsidian Web Clipper templates so he can **test adding content** to the site.
2. Add a **Standard Ebooks** template for Reading — and make it **the default template for reading**. (He's currently reading *A Confession* by Tolstoy: <https://standardebooks.org/ebooks/leo-tolstoy/a-confession/aylmer-maude>.)

This pulls Standard Ebooks **forward** from where Step 4 parked it. Step 4 picked **Open Library** as the v1 Reading source and explicitly listed *"Standard Ebooks / Bokus / Adlibris deferred … add when a real clip of a non-supported source happens often enough to be worth maintaining."* That condition has now been met: Johan reads from Standard Ebooks, so it becomes the primary Reading template.

---

## THE headline finding (changes a Step 4 assumption)

**Standard Ebooks marks up its pages with RDFa, not JSON-LD or microdata. Obsidian Web Clipper's `{{schema:…}}` selector reads JSON-LD only. So the `{{schema:@Book:name}}` approach Step 4 sketched for Reading does NOT work on Standard Ebooks.**

Verified against the live *A Confession* page (`curl` of the server-rendered HTML):

| Probe | Result |
|---|---|
| `<script type="application/ld+json">` blocks | **0** |
| microdata `itemprop=` / `itemtype=` attributes | **0** |
| RDFa `property="schema:…"` attributes | **64** (e.g. `property="schema:name"`, `schema:author`, `schema:wordCount`, `schema:datePublished`) |
| RDFa `typeof="…"` | `typeof="schema:Book"`, `typeof="schema:Person"`, `typeof="schema:Organization"`, etc. |

And from the Obsidian Help docs (`obsidian.md/help/web-clipper/variables`): the schema.org variable *"returns values from schema data"* / *"schema.org JSON-LD on the page"* — **no mention of RDFa or microdata support.**

**Consequence:** the Standard Ebooks template is built from **OpenGraph/meta variables + CSS selectors**, not `{{schema:}}`. This is fine — and actually robust — because:
- SE is a **single site with a stable, hand-crafted DOM** (the usual "CSS selectors are fragile" argument is about heterogeneous sites; it doesn't apply to one homogeneous source).
- SE's RDFa `property="schema:…"` attributes are themselves **targetable via CSS attribute selectors** (`meta[property="schema:wordCount"]`), which are semantic and unlikely to drift.

**Wider lesson for the rest of the template matrix:** *do not assume a source emits JSON-LD.* Verify the structured-data format **per source, in the rendered DOM**, before trusting any `{{schema:}}` selector. (Spot check this session: a `curl` of two Open Library pages returned **0** `ld+json` in the raw HTML too — Step 4 assumed OL has "clean JSON-LD Book markup." OL is a heavy JS app, so it *may* inject JSON-LD client-side, which Clipper-in-browser would see but `curl` would not. **Flagged for in-browser verification, not assumed.**)

---

## The shipped artifact

**`_resources/standard-ebooks-clipper.json`** — created this session, valid JSON, sits next to the existing `letterboxd-clipper.json` / `note-to-_sources-clipper.json`. Field shape matches what the **current** `reading.njk` layout + `card-reading.njk` actually consume, so it works **with zero layout changes** — import and test immediately.

### Field → selector → why

| Frontmatter field | Type | Clipper value | Resolves to (A Confession) | Notes |
|---|---|---|---|---|
| `title` | text | `{{selector:article.ebook h1}}` | `A Confession` | The book `<h1 property="schema:name">`. Clean — `{{title}}`/`og:title` are the messy *"A Confession, by Leo Tolstoy. Translated by Aylmer Maude - Free ebook download"*. |
| `draft` | checkbox | `true` | `true` | Hardcoded, like the Letterboxd template. Review before publishing. |
| `date` | text | `{{date}}` | clip date | When you logged it. |
| `author` | text | `{{selector:hgroup a span}}` | `Leo Tolstoy` | The author link's `<span>`. |
| `translator` | text | `{{selector:#reading-ease p a}}` | `Aylmer Maude` | SE always credits translators for classics — new field vs the old samples, genuinely useful. Empty for original-English works (no "Translated by" line). |
| `cover` | text | `{{meta:property:og:image}}` | `…/downloads/cover.jpg` | Clean, stable URL (always `{book-url}/downloads/cover.jpg`). Rendered by `reading.njk` as a plain `<img>`; HTML Transform self-hosts at build time — **aligns with the locked build-time-fetch cover strategy.** |
| `link` | text | `{{url}}` | the SE page URL | **Feeds `u-read-of`.** `reading.njk` does `{% if link %}<data class="u-read-of" value="{{ link }}">`. See "Field-name decision" below. |
| `description` | text | `{{selector:article.ebook > meta[property="schema:description"]?content}}` | *"A brief meditation on depression, philosophy, religion, and the meaning of life."* | The clean one-liner. Powers `card-reading.njk`. ⚠️ uses a quoted attribute selector — see verification note. |
| `genre` | multitext | `{{selector:#reading-ease ul.tags a\|wikilink}}` | `["[[Philosophy]]", "[[Spirituality]]"]` | SE "subjects". Wikilinked to seed the Obsidian graph (shared-genre navigation — the point of Obsidian-as-CMS). |
| `wordCount` | number | `{{selector:article.ebook meta[property="schema:wordCount"]?content}}` | `25946` | SE gives **word count, not page count.** Ebooks have no fixed pages, so this is the honest field (old samples used `totalPage`). ⚠️ quoted attribute selector. |

- **`noteNameFormat`**: `{{selector:article.ebook h1|safe_name}} - {{selector:hgroup a span|safe_name}}` → `A Confession - Leo Tolstoy` — matches the existing `Anna Karenina - Leo Tolstoy.md` convention (filename = title for Obsidian wikilinks; Eleventy slugifies for the URL).
- **`noteContentFormat`**: `""` (empty body) — like the Letterboxd template. The post body is left for **your own reading notes**, not the publisher blurb. (To instead capture SE's full description into the body, set it to `{{selectorHtml:#description > p|markdown}}` — that grabs exactly the two description paragraphs and skips the donation aside.)
- **`triggers`**: `["https://standardebooks.org/ebooks/"]` — URL-prefix, auto-fires on any SE ebook page.
- **`path`**: `posts/reading/`.

### ⚠️ Verification status — read before trusting it blindly

The selectors are **markup-verified** (I confirmed every one resolves the correct value against the live *A Confession* HTML) but **extension-untested** (I can't run the browser extension). On Johan's first clip, check:

1. **The two quoted attribute selectors** (`description`, `wordCount`). Standard `\"` JSON escaping is used and the *filter-argument* precedent in `letterboxd-clipper.json` shows quotes survive — but Clipper's *selector* parser handling of inline `"` is the one thing I couldn't exercise. **If either field comes back empty**, the quote-free fallbacks are:
   - `description`: `{{description}}` (always works, but prefixed with *"Free epub ebook download of the Standard Ebooks edition of A Confession: …"* — trim on review).
   - `wordCount`: drop it, or accept the wordy `{{selector:#reading-ease p}}` first sentence.
2. **Selectors inside `noteNameFormat`** — the working templates use `{{schema:…}}`/`{{title}}` there; selectors *should* interpolate identically, but confirm the filename comes out `A Confession - Leo Tolstoy`. Fallback: `{{title|safe_name}}` (messy).
3. **`genre` wikilink on a selector array** — `wikilink` is documented for arrays and used in `note-to-_sources` (`split:", "|wikilink|join`); confirm it yields `[[Philosophy]]`, `[[Spirituality]]`.

### How to import + test (for Johan)

1. Clipper extension → Settings → Templates → **Import** → pick `_resources/standard-ebooks-clipper.json`.
2. Go to the *A Confession* page, open Clipper. It should auto-select **"Standard Ebooks"** (URL trigger).
3. Eyeball the captured properties against the table above; Save.
4. `npm start`, visit `/reading/a-confession/`, confirm the cover renders (build-time fetch) and the card shows the blurb.
5. Tell me what the three ⚠️ items did, and I'll lock the selectors.

---

## "Default template for reading" — the Clipper nuance

Clipper has **no per-post-type "default."** It has (a) first-match-wins **triggers**, and (b) a built-in fallback template named *"Default"* used when nothing matches. So "make Standard Ebooks the default for reading" maps cleanly to: **give it a URL-prefix trigger on `standardebooks.org/ebooks/`** so it auto-fires whenever you clip from your actual reading source. That's what the shipped template does. (If you ever want a generic any-book-site reading fallback, that's a *second*, trigger-less template you pick manually — but SE-as-auto-trigger is the right primary.)

Open Library stays as the documented **alternate** Reading source (Step 4's pick), to be built when you clip a book that isn't on SE — pending the in-browser JSON-LD check noted above.

---

## Field-name decision: `link` vs `read-of` (why I chose `link`)

Step 4 talks about Reading using `read-of` (the Micropub/µf2 vocab). But the **actual implemented** layouts all use a *plain* field name rendered *into* the hyphenated microformat class — verified this session:

| Layout | Frontmatter field it reads | Renders into |
|---|---|---|
| `reading.njk` | `link` | `<data class="u-read-of">` |
| `watching.njk` | `url` | `<data class="u-watch-of">` |
| `jam.njk` | `source` | `<data class="u-listen-of">` |

The hyphenated names are **never frontmatter keys** (Nunjucks can't read `read-of` as a bare variable — the hyphen parses as subtraction). So the template emits **`link`** to light up `u-read-of` with zero layout edits. This is the test-now-correct choice and consistent with all three sibling layouts. The eventual canonical rename (`link → read-of` via bracket access or `eleventyComputed`) is a separate, project-wide decision — out of scope for shipping a working template today.

---

## Status of the broader "add the Clipper templates" ask

Step 4 designed a 9-template v1 matrix. Here's where each stands **after** the RDFa lesson (which means every `{{schema:}}`-based template needs a per-source, in-browser structured-data check before it's trustworthy):

| Template | Step 4 source | Structured-data reality | Status |
|---|---|---|---|
| **Standard Ebooks** (Reading) | *(new — this doc)* | RDFa → meta + CSS selectors | ✅ **Built + markup-verified** |
| Letterboxd (Watching) | JSON-LD `Movie` | Already working in repo | ✅ Exists; Step 4 wants wikilink + `personalUrl` edits |
| Open Library (Reading, alternate) | JSON-LD `Book` | ⚠️ raw HTML had 0 `ld+json` — verify in-browser | ⏳ Pending source verification |
| Bandcamp (Jam) | JSON-LD `MusicAlbum` | Bandcamp does emit JSON-LD (verify) | ⏳ Ready to build + verify |
| Bookmark | generic `{{title}}`/`{{url}}` | No structured data needed | ⏳ Low-risk, ready to build |
| RSVP | schema trigger `@Event` | JSON-LD-dependent | ⏳ Verify event-site JSON-LD |
| Recipe | schema trigger `@Recipe` | JSON-LD widely deployed (verify) | ⏳ Ready to build + verify |
| IMDB ×3 (Watching) | schema `@Movie`/`@TVEpisode`/`@TVSeries` | IMDB emits JSON-LD | ⏳ Ready to build + verify |

I shipped **only the one I could fully verify**. The rest are "ready to build pending a ~5-minute per-source DOM check" rather than shipped-unverified. I can knock several out in a follow-up once we confirm their markup — Bookmark (no structured data) and Letterboxd-edits are the safest quick wins; Bandcamp + Recipe next.

---

## Open questions for Johan

1. **`description` body vs frontmatter** — shipped template puts SE's one-line blurb in `description:` and leaves the **body empty for your notes**. Prefer the full SE description auto-dropped into the body instead? (one-line `noteContentFormat` change, noted above.)
2. **`wordCount` vs `pages`** — kept the honest `wordCount` (SE has no pages). OK to retire `totalPage` for SE-sourced reads, or do you want a derived page estimate?
3. **Wikilink `author`/`translator` too?** — I left them as plain strings (matches old samples; the layout doesn't render them). Wikilinking would seed the graph (`[[Leo Tolstoy]]`) like `genre` does. Easy to flip on.
4. **Build the next batch?** — say the word and I'll do Bookmark + the Letterboxd edits (safest), then Bandcamp + Recipe, each verified against live markup.

---

## Project rules re-honoured

- `_generated/` is gitignored — this doc lives here; don't `git add` it.
- `_resources/standard-ebooks-clipper.json` **is** git-tracked (next to the other templates) — **Johan reviews + commits/pushes himself.** I did not commit or push.
- No `Co-Authored-By: Claude` trailer. `gh` calls need `--repo pjedlund/JEDEE`. US English. Permalinks use `{{ page.fileSlug | slugify }}`.
- Cover strategy: build-time fetch only — the template emits a remote `cover:` URL; the HTML Transform self-hosts it. No colocate machinery (locked 2026-05-23).
