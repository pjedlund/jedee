---
description: "Marking content language with lang and BCP 47 — the page default plus per-passage lang for foreign text, and how jedee marks its Swedish greeting, one Swedish note, and the mostly-Swedish activities."
date: 2026-08-01
---

`lang` declares the human language of content so browsers, screen readers and search engines handle it correctly — hyphenation, quotation marks, and above all pronunciation. Two levels: the whole page carries a `lang` on `<html>` ([WCAG 3.1.1 Language of Page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)), and any passage in a *different* language gets its own `lang` on a wrapping element ([3.1.2 Language of Parts](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html), AA). Without the second, a screen reader reads the foreign words with the page's voice — Swedish "hej" mangled by an English synthesiser.

Values are [BCP 47](https://www.rfc-editor.org/info/bcp47) tags. Use the **shortest adequate** one: `sv`, not `sv-SE` — a region subtag only earns its place when it changes meaning or pronunciation, and screen readers key off the primary subtag anyway. Two things you should *not* mark: 3.1.2 exempts **proper names** and **words that have become part of the surrounding vernacular**, so not every foreign word needs a span.

## In jedee

The site is `lang="en"` (`meta.lang`). Swedish appears in a few places, each marked at the smallest scope.

**Inline, on the homepage** — a span around the Swedish alone, never the English paragraph:

```html
<h1><span lang="sv">Hej hej!</span> I'm Johan.</h1>
```

"Malmö" beside it is left unmarked — a proper name.

**A whole-Swedish note** — `bethink-yourselves` is entirely a Swedish quote (English title). The layout is shared, so the body is wrapped in the content file, with blank lines so markdown-it still parses inside:

```markdown
<div lang="sv">

På sin tid suckade Jesus i förväntan …

</div>
```

**Activity captions** — almost all Swedish, so `activities.json` defaults `captionLang: sv` and `activity.njk` puts it on the `.e-content` wrapper; the one English caption overrides with `captionLang: en` in its front matter (front matter beats directory data).

**Activity titles** — a genuine Swedish/English mix from Strava that keeps importing, so the language is *detected*, not hand-tagged. `_config/utils/looks-swedish.js` flags a title Swedish only on a Swedish letter or word; `eleventyComputed` sets `titleLang` for activities; the shared `entry-header.njk` h1 and the breadcrumb leaf carry it. Conservative by design — English titles and bare proper-noun event codes ("Keps-OL") stay at `en`, which 3.1.2 exempts anyway. "Orientering" (sv) matches but "Orienteering" (en) doesn't; the spelling carries the language. The detector sits in `_config/utils/`, not `_data/`, because a named export beside a `_data/*.js` default export makes Eleventy drop the default.

The [[The accessibility test|pa11y test]] does not catch any of this: it flags *invalid* `lang` values, not *missing* ones, and its four configured paths include no activity or note page. The mixed-language titles are also a clean case of the pattern in [[The authoring tool decides the data model]] — when the authoring path (Strava) can't record a field reliably, compute it at build time.

Raw source: `src/_raw/dev-notes/How Swedish text is marked with lang.md`
