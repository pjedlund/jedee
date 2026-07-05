---
title: How backlinks work
description: A dev note on the site's wikilink and backlink machinery — the interlinker plugin, the backlinks partial, which layouts render it, and why no backlink list appears anywhere yet.
date: 2026-07-05
tags:
  - obsidian
  - indieweb
draft: true
---

Posts on this site can link to each other with Obsidian-style wikilinks: double brackets around a page title, written directly in the post body. When the target page exists, the wikilink becomes a regular link, and the target page gets a "Backlinks" list naming every page that points at it. Every post type renders that list as of yesterday's tidying pass. This note documents the machinery; a companion note, linked at the end, covers the same discovery in a different register.

## Writing a wikilink

The syntax is the Obsidian one:

```markdown
I finished another novel by [[Selma Lagerlöf]] this week.
```

Because this site's source files live inside an Obsidian vault, and because the vault convention here is filename = title (`Selma Lagerlöf.md`, not `selma-lagerlof.md`), the exact same string is a working link in Obsidian and a working link on the built site. Nothing needs translating between the two. The clean URL comes later, from the permalink setup, which slugifies the file slug — the wikilink itself always uses the human-readable title.

## The plugin

Wikilink support comes from `@photogabble/eleventy-plugin-interlinker`. It is imported in `src/_config/plugins.js`:

```js
//obsidian style wikilinks
import interlinker from "@photogabble/eleventy-plugin-interlinker";
```

and registered in `eleventy.config.js` with no options, so all the defaults apply:

```js
eleventyConfig.addPlugin(plugins.interlinker);
```

The backlink collection is computed data. The plugin registers a global `eleventyComputed.outboundLinks` property; while Eleventy computes each page's data, the plugin reads that page's raw content, finds every wikilink (and every internal HTML link), looks each one up in the page directory, and — this is the key part, from the plugin's `src/interlinker.js` — pushes the current page onto the *target* page's `backlinks` array:

```js
// If the linked page exists we can add the linking page to its backlinks array
if (link.exists) {
  if (!link.page.data.backlinks) link.page.data.backlinks = [];
  if (link.page.data.backlinks.findIndex((backlink => backlink.url === currentPage.url)) === -1) {
    link.page.data.backlinks.push({
      url: currentPage.url,
      title: currentPage.data.title,
    });
  }
}
```

So `backlinks` is not a collection you query; it is a data value that appears on a page when other pages link to it, holding `{ url, title }` pairs, deduplicated by URL.

## The "linked from" list

{% raw %}

Rendering is one small partial, `src/_includes/partials/backlinks.njk`, quoted in full:

```jinja2
{% if backlinks.length > 0 %}
    <nav aria-label="Backlinks">
        <h4>Backlinks</h4>
        <ul>
            {% for link in backlinks %}
                <li><a href="{{ link.url }}">{{ link.title }}</a></li>
            {% endfor %}
        </ul>
    </nav>
{% endif %}
```

The whole partial sits inside the `if`, so a page with no backlinks renders nothing at all — no empty heading, no empty list.

All 16 post-type layouts in `src/_layouts/` include it (`{% include 'partials/backlinks.njk' %}`): note, post, activity, audio, bookmark, event, jam, like, photo, reading, recipe, reply, repost, rsvp, video, and watching. Articles (`post.njk`) and workouts (`activity.njk`) were the last two, wired up in yesterday's tidying pass.

{% endraw %}

## Links to pages that don't exist

A wikilink to a page that has not been written yet breaks nothing. The plugin's default resolving function (`src/resolvers.js` in the package) returns the raw wikilink text when the lookup finds no page:

```js
return href === false ? link.link : `<a href="${href}">${text}</a>`;
```

`link.link` is the original double-bracketed string, so an unresolved wikilink stays in the output exactly as typed — plain text, no anchor tag. The plugin also collects every unresolved link and prints a dead-link report to the console at build time (the `deadLinkReport: 'console'` default).

Right now, that is the state of every wikilink on this site. A grep across `src/posts/` finds about 300 double-bracket pairs in the source files, pointing at 187 distinct titles. Nine of those titles are other notes that exist only as drafts, so they are absent from a normal build; the remaining 178 — `Selma Lagerlöf`, `Fiction`, `Aylmer Maude`, and 175 more — have no page at all. That matches the count of 178 in the companion note. Most of the raw occurrences sit in Jam frontmatter fields (artist and genre); the backlink computation reads post bodies, but the conclusion is the same either way: no wikilink on the site currently resolves, so the partial's `if` is false on every page and no backlink list renders anywhere.

The mechanism cuts both ways, and instantly: the first time one of those 178 pages is written, every page that ever linked to it lands in its `backlinks` data on the next build, and its backlink list appears fully populated on day one.

The story of finding that out is in [[The pages I haven't written yet]].
