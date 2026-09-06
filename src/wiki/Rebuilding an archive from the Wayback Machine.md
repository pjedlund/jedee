---
description: "Using a shutdown data dump and the Wayback Machine to reconstruct a dead service, and how jedee rebuilt its This Is My Jam archive honestly."
date: 2026-07-31
---

When a service shuts down, what it leaves behind usually comes in two incompatible halves. A closing service that behaves well publishes a **data dump** — your own records, structured, but stripped of everything that made the site a place: other people's replies, the surrounding page, often the images. The [Wayback Machine](https://web.archive.org) has the opposite problem and the opposite virtue: it kept the rendered pages, other people included, but only where a crawler happened to pass, and with no structure at all.

**The technique is to use each for what the other lacks: the official dump gives you the skeleton, the Archive gives you everything the dump left out.**

Three things are worth knowing before starting one of these:

- **Find the captures programmatically.** The [CDX Server API](https://github.com/internetarchive/wayback/blob/master/wayback-cdx-server/README.md) lists every capture of a URL or prefix as plain text, which beats guessing timestamps. Appending `id_` to the timestamp in a Wayback URL (`/web/20150101000000id_/http://…`) returns the original resource without the Archive's injected toolbar — worth having when parsing.
- **Crawl politely.** The Wayback Machine throttles hard and will start refusing a scraper that hammers it. Backoff is not optional.
- **An archived social page contains other people's content**, usually in structurally similar wrappers right beside your own. This is the failure that matters, because it is silent: a selector that looks right can attribute a stranger's words to you and produce a perfectly plausible-looking result. Verify a sample by hand before trusting any selector.

There is also a presentation question that outlives the scraping. Recovered material is not the same as live material — dates are approximate, people's profiles are gone, and reactions came from a context that no longer exists. Showing it as though it arrived normally overstates what you actually know.

## In jedee

This Is My Jam let you feature one song at a time. It shut down in 2015, publishing a final per-user data dump; the Wayback Machine had crawled it while it was alive. The `pjedlund` account was rebuilt from those two sources — 119 jams became 113 posts (a few songs jammed twice were merged), and the likes and comments each jam received render beneath it.

### What the dump had, and what it didn't

The export listed only artist, title, date, and a link. Album, cover, genre, year, and `odesliUrl` were enriched afterwards from MusicBrainz, Bandcamp, and Apple Music lookups. The imported cohort is marked with a `thisismyjam` tag; layout, category, and permalink come from the folder data file like any other jam — **an imported post is an ordinary post**, not a special type.

### The trap that cost a day

Captions couldn't come from the live site: thisismyjam.com still exists, but every profile and jam URL now redirects to an anonymous song page with no usernames. The archived copies kept the real pages, with the caption in `<p class="archive-caption">`.

But the same archived pages *also* carry a `quote caption` class — a grid of **other users'** captions for the same song. An early pass read those and attributed two strangers' sentences to Johan. The scraper now documents the distinction in its docstring:

```python
def parse_caption(h):
    """Johan's OWN caption for this jam, from <p class="archive-caption">. This is the highlighted (?with=) jam's caption — NOT the song-wide `quote caption` grid, which lists OTHER users. Absent => Johan wrote no caption."""
```

This is the silent-attribution failure above, caught late: it cost a day, and it was found by reading a sample rather than by anything erroring.

### Recovering the reactions

The scraper fetched two archived endpoints per jam — the likers grid and the comments list — **politely, with backoff, because the Wayback Machine throttles hard**. The result was distilled into `src/_data/jamSocial.json`, keyed by each post's `page.fileSlug`.

- **Avatars are self-hosted.** The original photo server is long dead; each unique avatar was pulled from the Archive into `src/assets/images/jams-social/` and deduplicated by hash. An avatar the Archive never kept falls back to the site's default.
- **Each person links to an archived capture of their old profile**, not the live site — which would redirect them into anonymity.
- **Comment dates are approximate and rendered as month + year only.** The site showed relative timestamps ("8 years, 9 months ago"), converted against the capture date. Rendering a false precision the source never had would be a lie.

### Presenting recovered reactions honestly

`partials/jam-social.njk` looks the current page up in the data file and renders nothing without an entry. Likes become an avatar facepile, comments become `h-cite` cards — reusing `webmentions.css` while being **deliberately not presented as webmentions**. The heading and intro name the source: these happened on This Is My Jam between 2012 and 2015 and were recovered from the Archive.

⚠ **The block sits outside the post's `h-entry` root**, so parsers don't read decade-old reactions as children of the current page. That placement is the technical half of the same honesty — see [[Microformats]] and [[Webmentions]].

### Still pending

The dump also contains `likes.tsv` — the record of jams Johan *liked*, the outbound half of the social graph. Not imported; only inbound reactions are on the site so far.

Raw source: `src/_raw/dev-notes/How the This Is My Jam archive was rebuilt.md`
