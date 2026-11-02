---
description: "Marking content language with lang and BCP 47 — the page default plus per-passage lang for foreign text, and how jedee marks its Swedish greeting, its Swedish notes and pages, language twins, and the mostly-Swedish activities."
date: 2026-08-01
updated: 2026-10-18
---

`lang` declares the human language of content so browsers, screen readers and search engines handle it correctly — hyphenation, quotation marks, and above all pronunciation. Two levels: the whole page carries a `lang` on `<html>` ([WCAG 3.1.1 Language of Page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)), and any passage in a *different* language gets its `lang` on a wrapping element ([3.1.2 Language of Parts](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html), AA). Without the second, a screen reader reads the foreign words with the page's voice — Swedish "hej" mangled by an English synthesiser.

Values are [BCP 47](https://www.rfc-editor.org/info/bcp47) tags. Use the **shortest adequate** one: `sv`, not `sv-SE` — a region subtag only earns its place when it changes meaning or pronunciation, and screen readers key off the primary subtag anyway. Two things you should *not* mark: 3.1.2 exempts **proper names** and **words that have become part of the surrounding vernacular**, so not every foreign word needs a span.

## In jedee

The site is `lang="en"` (`meta.lang`). Swedish appears in a few places, each marked at the smallest scope. This is the light way to be bilingual, chosen over full two-language support: no `/sv/` folder, and the menu, footer, dates and labels stay English on a Swedish page.

**A whole Swedish page** — `lang: sv` in front matter. `base.njk` writes `<html lang="{{ lang or meta.lang }}">`, so the title, body and everything else on the page are Swedish without a wrapper. The same key sets the page's JSON-LD `inLanguage` to `sv-SE` and `og:locale` to `sv_SE` (the full forms those formats ask for, matching `en-US` / `en_US`), and its entry in every Atom and JSON feed gets `xml:lang="sv"` / `"language": "sv"`.

**Language twins** — two versions of one page, one per language. Either page names the other with `translation: /url/of/the/other/`; the other side finds it, through the `twinOf` filter (`_config/filters/twin.js`). The pair then gets three things:

- a small button under the heading, labelled in the twin's language and marked with it: `<a … hreflang="sv" lang="sv" rel="alternate">Läs på svenska</a>`, or "Read in English" the other way
- two `<link rel="alternate" hreflang>` lines in the head, one for each version, so search engines treat them as one page in two languages
- one shared set of [[Webmentions]]: a like on either version shows on both

**Inline, on the homepage** — a span around the Swedish alone, never the English paragraph:

```html
<h1><span lang="sv">Hej hej!</span> I'm Johan.</h1>
```

"Malmö" beside it is left unmarked — a proper name.

**A Swedish body under an English title** — `bethink-yourselves` is entirely a Swedish quote with an English title, so `lang: sv` would mislabel the title. The body is wrapped in the content file instead, with blank lines so markdown-it still parses inside:

```markdown
<div lang="sv">

På sin tid suckade Jesus i förväntan …

</div>
```

**A Swedish title** — `hej-fran-min-telefon` is Swedish in both title and body, written before page-level `lang: sv` existed. The body is wrapped as above; the title sets `titleLang: sv` in front matter, which the entry-header h1 carries. A new post like it would just set `lang: sv`. A front-matter `titleLang` wins over the activity detection below, so any post type can use it.

**Activity captions** — almost all Swedish, so `activities.json` defaults `captionLang: sv` and `activity.njk` puts it on the `.e-content` wrapper; the one English caption overrides with `captionLang: en` in its front matter (front matter beats directory data).

**Activity titles** — a genuine Swedish/English mix from Strava that keeps importing, so the language is *detected*, not hand-tagged. `_config/utils/looks-swedish.js` flags a title Swedish only on a Swedish letter or word; `eleventyComputed` sets `titleLang` for activities; the shared `entry-header.njk` h1 and the breadcrumb leaf carry it. Conservative by design — English titles and bare proper-noun event codes ("Keps-OL") stay at `en`, which 3.1.2 exempts anyway. "Orientering" (sv) matches but "Orienteering" (en) doesn't; the spelling carries the language. The detector sits in `_config/utils/`, not `_data/`, because a named export beside a `_data/*.js` default export makes Eleventy drop the default.

The [[The accessibility test|pa11y test]] does not catch any of this: it flags *invalid* `lang` values, not *missing* ones, and its ten configured paths include no activity post or note (`/activities/` is the index, not an activity page). The mixed-language titles are also a clean case of the pattern in [[The authoring tool decides the data model]] — when the authoring path (Strava) can't record a field reliably, compute it at build time.

Raw source: `src/_raw/dev-notes/How Swedish text is marked with lang.md`
