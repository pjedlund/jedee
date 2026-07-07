# Fable plan — Jam metadata block (This Is My Jam Job 2C, the last remainder)

**Goal:** every jam page shows a visible metadata block — artist · album · year, the genre list, and (when present) a linked "Favourite track" row. This closes the final open job of the This Is My Jam import arc (Job 2C).

**Authoritative build aid:** `_generated/Reference - Jam metadata fields (Job 2C build aid).md` — field shapes, coverage counts, ready-to-paste snippets, verify targets. Read it in full before starting; this plan adds ordering, the working-tree precondition, and acceptance criteria on top of it.

**Design note:** Johan owns the visual polish. This plan ships a working, modestly styled block following the house prior art (`photo-meta.css`), structured so he can restyle without touching the template again.

---

## House rules

- Invoke `cube-css`, `every-layout`, `eleventy-excellent` before any CSS/class work (project requirement); `microformats` ONLY if you decide to add µf2 classes (default: don't — see edge cases).
- Branch (suggested `feat/jam-meta-block`), merge `--no-ff` to `main` when green. **Never push.** No `Co-Authored-By` trailer. US English.
- Node 22 via `source ~/.nvm/nvm.sh && nvm use`. Update `TODO.md` + `LOG.md` (gitignored — edit only).

## Precondition — settle the working tree FIRST

As of 2026-07-07 the working tree holds a **complete, unrelated in-flight feature**: self-hosted YouTube posters (`src/_config/filters/youtube-poster.js` new + edits to `eleventy.config.js`, `src/_config/filters.js`, `src/_includes/webc/custom-youtube.webc`, `src/_layouts/jam.njk`, `src/_layouts/video.njk`, one watching post). It touches `jam.njk` — the same file this plan edits.

Before starting: check `git status`. If that diff is still uncommitted, **commit it first as its own commit** (verify `npm run test:unit` + a production build pass first; message like "Self-host YouTube poster thumbnails at build time"). Do not mix it into the jam-meta branch's feature commits, and do not discard it. If the tree is already clean, proceed.

(The `unwikilink` filter this block depends on is **already committed** — `531c610` — registered in `eleventy.config.js` and exported from `filters.js`. Despite older notes saying otherwise, do not re-create it.)

## Files to touch

1. `src/_layouts/jam.njk` — the block markup, inline (NOT an include — see edge cases).
2. `src/assets/css/local/jam-meta.css` — new local CSS block.
3. `src/_layouts/jam.njk`'s existing `{% css "local" %}` list — add `{%- include 'css/jam-meta.css' -%}`.

## The fields (from the build aid — trust these shapes)

| field | shape | coverage (of 118) | render as |
|---|---|---|---|
| `artist` | scalar, always `[[wikilink]]` | 117 | `{{ artist | unwikilink }}` |
| `album` | scalar, plain | 98 | `{{ album }}` |
| `year` | number | 96 | `{{ year }}` |
| `genre` | **list** of `[[wikilink]]` | 95 | `{{ genre | unwikilink | join(" · ") }}` |
| `favoriteTrack` / `favoriteTrackUrl` | scalar / URL | **3** | linked "Favourite track" row, only when set |

Do **not** render: `title` (already the `<h1 class="p-name">`), `cover` (already the `.cover` img), `youtubeSlug` (already the embed), `source` (stays the hidden `u-listen-of` `<data>` — no visible "Listen" link, the embed covers playback), `odesliUrl` (data-only by decision), `description`/`date`/`draft` (already handled elsewhere).

## Steps, in order

1. Settle the working tree (precondition above).
2. Invoke the skill trio. Read `src/assets/css/local/photo-meta.css` — the house prior art for a detail-page metadata block (custom props up top, semantic color tokens, `--size-step-min-1` scale, logical properties).
3. **Markup in `jam.njk`**, placed directly after `{% include 'partials/entry-header.njk' %}` (before the cover `<img>` — it reads as a byline under the title). Keep it inline Nunjucks; shape:
   ```njk
   {% if artist or album or year or genre or favoriteTrack %}
   <div class="jam-meta">
     <p class="jam-meta-line">
       {%- if artist %}<span class="jam-artist">{{ artist | unwikilink }}</span>{% endif -%}
       {%- if album %}<span class="jam-album">{{ album }}</span>{% endif -%}
       {%- if year %}<span class="jam-year">{{ year }}</span>{% endif -%}
     </p>
     {% if genre %}<p class="jam-genres">{{ genre | unwikilink | join(" · ") }}</p>{% endif %}
     {% if favoriteTrack %}
       <p class="jam-favorite">Favourite track:
         {% if favoriteTrackUrl %}<a href="{{ favoriteTrackUrl }}">{{ favoriteTrack }}</a>{% else %}{{ favoriteTrack }}{% endif %}
       </p>
     {% endif %}
   </div>
   {% endif %}
   ```
   Separators between artist/album/year: do them in CSS (`.jam-meta-line span + span::before { content: ' · ' }` or a gap-based cluster) so a missing field never leaves a dangling "·". Do NOT hardcode separators in the template between conditionals.
4. **CSS** `src/assets/css/local/jam-meta.css`: a CUBE block, custom props at top, `font-size: var(--size-step-min-1)`, labels/accents via `--color-text-accent`, spacing via the space scale. Keep it quiet — a byline, not a hero. Add the include line to the `{% css "local" %}` block.
5. **Verify** (below), commit, update the durable docs mention only if trivially at hand (the full jam-spec rewrite is Job 2D — out of scope), `TODO.md`/`LOG.md`, merge `--no-ff`.

## Edge cases a weaker model would miss

- **Coverage is ragged — guard every field.** ~20 jams miss album/year/genre; the Boiler Room DJ-mix has **no artist**; `favoriteTrack` exists on just 3 of 118. Every piece must vanish gracefully (hence CSS-drawn separators).
- **Keep the markup inline in `jam.njk`.** Moving it to an `{% include %}` wrapped in `{% if %}` walks into the interlinker trap that silently blanks partials. Inline avoids the whole class of problem.
- **`artist` is always a wikilink on disk** (`[[Woo York]]`) — raw output would print the brackets. `genre` is a **list** of wikilinks — needs `unwikilink` then `join`. `album` is plain — no filter.
- **`artist`/`genre` are NOT site tags.** Plain text only; artist/genre pages don't exist. Don't link them.
- **Microformats: leave them alone by default.** The hidden `u-listen-of` + `hidden-author` already satisfy parsers; this block is display text. If you add classes anyway, consult the `microformats` skill first — µf2 classes are data, not styling hooks.
- **CSS goes in a `local` bundle, not global** — jam pages are the only consumer.
- **British "Favourite" is the label text from the plan** — but the house rule is US English. Use **"Favorite track:"** (US) for the label; keep the frontmatter key `favoriteTrack` exactly as-is (it's data).
- The uncommitted YouTube-poster diff shares `jam.njk` — precondition section above.

## Acceptance criteria (build with `BUILD_DRAFTS=1 npm run build`, then inspect/serve `dist/`)

1. `/jams/chasing-the-dream/` — full block: artist, album, year, genres, and the linked Favorite-track row.
2. `/jams/50ft-queenie/` (or any This Is My Jam import) — artist/album/year/genre, **no** favorite-track row, no dangling separator.
3. The Boiler Room DJ-mix jam — block renders without the artist piece, no leading separator.
4. A hypothetical jam with none of the fields would render no empty `.jam-meta` div (the outer `{% if %}`).
5. No visible link for `source`/`odesliUrl` anywhere on jam pages; the hidden `u-listen-of` `<data>` still present in the HTML.
6. `npm run test:unit` green (105+); production build green.
7. Merged `--no-ff` to `main`, unpushed; `TODO.md` (TIMJ §) + `LOG.md` updated; memory note "only remainder: Job 2C" is now satisfiable — say so in the session summary so it gets updated.
