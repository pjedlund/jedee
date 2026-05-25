---
title: Every site hides its metadata differently
description: Building Obsidian Web Clipper templates for music, film, and bookmarks — and what each site's structured data does and doesn't give up.
date: 2026-05-25
tags:
  - obsidian
  - indieweb
draft: true
---

I've been wiring up [Obsidian Web Clipper](https://obsidian.md/clipper) templates so the things I listen to, watch, and bookmark land here as proper posts instead of dying in a browser tab. One template per source: Bandcamp and Apple Music for music, Letterboxd and IMDb for films and TV, plus catch-all bookmark and RSVP templates.

The premise is simple. Most pages carry [schema.org](https://schema.org) JSON-LD, so the clipper can read a `MusicAlbum` or a `Movie` straight off the page and drop the title, cover, year, and cast into frontmatter. The reality is that every site buries that data somewhere slightly different, and the gaps are where it gets interesting.

Bandcamp exposes no genre at all — the tags hide in a `keywords` array, mixed in with city names. Apple Music *does* give you a real genre, but it wraps the artist in an array and quietly slips a junk "Music" entry into the list. Same schema, three dialects.

IMDb was the stubborn one. It blocks plain server-side requests outright — every `curl` comes back as a bot-challenge with no data. So to see what its pages actually emit, I drove a real browser and read the JSON-LD out of the live DOM. Worth it: a single template with unscoped schema lookups turns out to cover films, series, and individual episodes alike. The catch I'd never have guessed without looking — a TV episode's structured data doesn't link back to its series at all. No series, no season, no episode number. If I want that thread, it has to come from scraping the page, not the schema.

Then the wall: recipes. My recipe layout wants ingredients and instructions as nested lists in the frontmatter, but the clipper only writes flat fields and a plain body. The two models don't meet. That one isn't a template I can write — it's a decision about how a recipe should be shaped, and it's waiting for a quieter afternoon.

The rest are done, sitting in the vault, ready to catch the next thing worth keeping.
