---
title: How the This Is My Jam archive was rebuilt
description: A dev note on the This Is My Jam import — how the pjedlund jams became posts, how the captions were recovered from Internet Archive snapshots, and how the recovered likes and comments render under each jam.
date: 2026-07-05
tags:
  - music
  - archive
draft: true
---

This Is My Jam let you feature one song at a time. The service shut down in 2015, but it published a final data dump per user, and the Wayback Machine crawled it while it was alive. This site rebuilt the `pjedlund` account from those two sources: every jam is now a regular Jam post, and the likes and comments each jam received render under it in a "From This Is My Jam" block. This note documents the pieces; the companion note gives the personal version.

## The jam posts

The official export (`_generated/timj-import/pjedlund-jams.tsv`) lists 119 jams. A few songs had been jammed twice and those duplicates were merged into single posts, so today 113 posts sit in `src/posts/jams/thisismyjam/`, alongside the jams posted since. Each one is an ordinary markdown post — here is `Ahriman.md` in full:

```yaml
---
title: "Ahriman"
draft: false
date: 2012-08-17
artist: "[[HORSEBACK]]"
album: "Half Blood"
source: https://music.apple.com/us/album/ahriman/516343179
cover: https://is1-ssl.mzstatic.com/image/thumb/Music/v4/f2/46/ff/f246ff1a-e344-3ebc-9b3a-04078eb54fc8/halfblood_1400.jpg/1000x1000bb.jpg
genre:
  - "[[Rock]]"
year: 2012
odesliUrl: https://song.link/i/516343185
tags:
  - posts
  - thisismyjam
---
Sounds a bit like a psychedelic Slint with black metal growls.
```

Pointers:

- **The body is the original caption.** The line under the frontmatter is what I wrote on This Is My Jam in August 2012. 30 of the 119 jams had a caption; the rest have an empty body.
- **The dump only had artist, title, date, and a link.** The album, cover, genre, year, and `odesliUrl` fields were enriched afterwards (MusicBrainz, Bandcamp, and Apple Music lookups — the scripts are in `_generated/timj-import/`).
- **The `thisismyjam` tag** marks the imported cohort. Layout, category, and permalink come from the folder data file `src/posts/jams/jams.json`, same as any other jam.

## Recovering the captions

The captions could not come from the live site: thisismyjam.com still exists, but every profile and jam URL now redirects to an anonymous song page with no usernames on it. The archived copies in the Wayback Machine kept the real pages, and the caption text sits in the markup in a `<p class="archive-caption">` element on the highlighted jam.

One trap cost a day: the same archived song pages also carry a `quote caption` class, which holds a grid of *other users'* captions for the same song. An early pass read those and attributed two strangers' sentences to me. The scraper (`_generated/timj-import/scrape_social.py`) documents the distinction:

```python
def parse_caption(h):
    """Johan's OWN caption for this jam, from <p class="archive-caption">. This is
    the highlighted (?with=) jam's caption — NOT the song-wide `quote caption` grid,
    which lists OTHER users. Absent => Johan wrote no caption."""
    m = re.search(r'<p class="archive-caption\s*">(.*?)</p>', h, re.S)
```

## The likes and comments

The same scraper fetched two archived endpoints per jam — the likers grid and the comments list — politely, with backoff, because the Wayback Machine throttles hard. The result was distilled by `_generated/timj-import/build_jam_social.py` into `src/_data/jamSocial.json`, a single data file keyed by each post's `page.fileSlug`. A short real entry:

```json
"No Future No Past": {
  "likes": [
    {
      "name": "Alex Moeller",
      "username": "Winsord",
      "photo": "/assets/images/jams-social/avtr_45174976810b2080ed6eb6c2d890bd83.jpg",
      "url": "https://web.archive.org/web/2id_/https://www.thisismyjam.com/Winsord"
    }
  ],
  "comments": []
}
```

Pointers:

- **The avatars are self-hosted.** This Is My Jam served them from a photo server that is long dead; each unique avatar was pulled from the Wayback Machine into `src/assets/images/jams-social/` and deduplicated by hash. An avatar the Archive never kept renders the site's fallback avatar instead (`"photo": ""`).
- **Each person links to an archived capture of their old profile**, not to the live site (which would redirect them into anonymity).
- **Comment dates are approximate.** The site showed relative timestamps ("8 years, 9 months ago"), converted against the capture date and rendered as month + year only.

## The "From This Is My Jam" block

The jam layout (`src/_layouts/jam.njk`) includes `src/_includes/partials/jam-social.njk`, which looks the current page up in the data file and renders nothing if there is no entry:

{% raw %}

```jinja2
{% set social = jamSocial[page.fileSlug] %}

{% if social and (social.likes | length or social.comments | length) %}
  <aside class="webmentions | wrapper flow region prose">
    <h2 id="thisismyjam">From This Is My Jam</h2>
    <p class="text-step-min-1">
      The likes and comments this jam received on This Is My Jam (2012–2015),
      recovered from the
      <a href="https://web.archive.org/" rel="noreferrer">Internet Archive</a>.
    </p>
```

Likes render as an avatar facepile, comments as `h-cite` cards — the block reuses the webmention styling (`webmentions.css`) but is deliberately not presented as webmentions. The heading and intro name the source: these reactions happened on This Is My Jam between 2012 and 2015 and were recovered from the Archive. The block also sits outside the post's `h-entry` root, so parsers don't read the old reactions as children of the current page.

{% endraw %}

## Still pending

The data dump also contains a `likes.tsv` — the record of jams *I* liked, the outbound half of the social graph. It has not been imported; only the inbound likes and comments recovered from the Archive are on the site so far.

For what it felt like to get this back, see [[The company my jams kept]].
