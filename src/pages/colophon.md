---
title: Colophon
description: How this site is made — the tools, the people whose work it stands on, and how it is given away.
date: 2026-09-11
layout: page
permalink: /colophon/index.html
draft: true
tags:
  - searchable
---

A colophon is the note at the back of a book about how it was made. This is that note for this website.

## Soli Deo Gloria

Bach wrote *Soli Deo Gloria* — to God alone be the glory — at the end of his manuscripts. It is at the foot of every page here too, for the same reason: I don't think anything I make is really mine. So everything on this site, words, photos, recordings and code, is dedicated to the public domain under the [<abbr title="Soli Deo Gloria">SDG</abbr> dedication]({{ settings.repos.licence }}), which rests on [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Copy it, change it, use it, no permission needed.

<!-- TODO Johan: a sentence or two in your own words on why — Tolstoy, giving freely? -->

## Built with

- [Eleventy](https://www.11ty.dev), a static site generator — every page is plain HTML built ahead of time.
- [Eleventy Excellent](https://github.com/madrilene/eleventy-excellent), Lene Saile's starter, which this site began as and still follows closely.
- CSS written the [CUBE CSS](https://cube.fyi) way, with layouts from [Every Layout](https://every-layout.dev) and fluid type and spacing from [Utopia](https://utopia.fyi).
- Design tokens kept in the repository, with a mirror in Sketch for sketching new pages.
- [MapLibre](https://maplibre.org) for the maps, drawn from a [Protomaps](https://protomaps.com) file of [OpenStreetMap](https://www.openstreetmap.org/copyright) data that the site hosts itself, [PhotoSwipe](https://photoswipe.com) for the photo lightbox, and [lite-youtube-embed](https://github.com/paulirish/lite-youtube-embed) so a video loads nothing from Google until you press play.
- Hosted on [Netlify](https://www.netlify.com); photo originals and audio live on Cloudflare R2.

## Type

Set in [Source Serif](https://github.com/adobe-fonts/source-serif), [Source Sans](https://github.com/adobe-fonts/source-sans) and [Source Code Pro](https://github.com/adobe-fonts/source-code-pro), designed by Frank Grießhammer and Paul D. Hunt for Adobe and released under the SIL Open Font License. The fonts are served from this site, cut down to the characters it uses.

## Writing and posting

I write in [Obsidian](https://obsidian.md), and the site's source folder is my Obsidian vault. Films, books and music are saved with the Obsidian Web Clipper, short posts can come from my phone through [Micropub](https://indieweb.org/Micropub), and I edit on the go in [Sveltia CMS](https://github.com/sveltia/sveltia-cms).

## Part of the IndieWeb

This is an [IndieWeb](https://indieweb.org) site: I own my posts, and they can talk to other sites. Pages carry [microformats](https://microformats.org), replies and likes from elsewhere arrive as [webmentions](https://indieweb.org/Webmention), and every kind of post has its own feed.

## How it was built, in detail

- [The wiki](/wiki/) — notes on the web techniques behind this site and how each part of it works.
- [How I use AI](/ai/) — what was made with Claude, and what wasn't.
- [The source code](https://github.com/pjedlund/jedee) on GitHub.

## Thanks

To Lene Saile for Eleventy Excellent, Zach Leatherman and everyone behind Eleventy, Andy Bell and Heydon Pickering for CUBE CSS and Every Layout, Set Studio for the Cube boilerplate, and the IndieWeb community.
