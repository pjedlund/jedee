---
description: "The community and building blocks behind independent publishing — microformats, Webmention, Micropub, IndieAuth, POSSE — and the on-ramp problem that keeps the movement made of developers."
date: 2026-09-06
---

The IndieWeb is a community and a set of building blocks, not an organization or a single protocol. It started with [IndieWebCamp](https://indieweb.org/IndieWebCamp) in Portland in 2011 — Tantek Çelik, Aaron Parecki, Amber Case and Crystal Beasley — around the position that your content, your identity and your metadata should live at a domain you control. [[Personal websites]] covers that argument on its own terms; this page is about the machinery built to act on it, and about who can actually use it.

## Principles

The [stated principles](https://indieweb.org/principles) are as much about how the community works as about the web:

- **Own your data** — your content, identity and metadata under your own domain.
- **Scratch your own itch** — build what you need for your own site rather than a product for a hypothetical user.
- **Use what you make** ("selfdogfood") — run it on your live site before recommending it.
- **Document what you do** — the wiki is the deliverable, not a side-effect.
- **Open source**, and **plurality over monoculture** — many implementations of a spec rather than one canonical stack.
- **UX and design first**, protocols second.

The second and third principles explain a lot of the movement's character, including its problems. A community that builds for itself and ships to itself first will produce tools shaped like its own members.

## The building blocks

Most of these went through the W3C, which is why they interoperate across independent implementations.

- **[microformats2](https://microformats.org/wiki/microformats2)** — the class vocabulary that makes an ordinary HTML page machine-readable, so no separate data format is needed. The parsing layer everything else sits on. See [[Microformats]].
- **[Webmention](https://www.w3.org/TR/webmention/)** (W3C Recommendation, 2017) — a cross-site notification: this page over here links to that page over there. The open-web replacement for comments and likes living on someone else's server. See [[Webmentions]].
- **[Micropub](https://www.w3.org/TR/micropub/)** (W3C Recommendation, 2017) — a publishing API, so any client can post to any site that implements it. This is what decouples the writing app from the site. See [[Micropub]].
- **[IndieAuth](https://indieauth.spec.indieweb.org/)** (W3C Note, 2022) — signing in with your domain instead of an account, built on OAuth 2.
- **`rel="me"`** — bidirectional links between your domain and your profiles elsewhere, which is how a parser establishes that both are the same person. Mastodon's verified-link checkmark is this and nothing more.
- **POSSE / PESOS** — the two syndication directions. Publish on your own site and syndicate out, or publish to a platform and pull a copy home.
- **Feeds** — RSS, Atom, JSON Feed. The oldest block, and the only one most people already have.

## The on-ramp problem

The strongest criticism of the IndieWeb comes from inside it, and three of this page's sources make the same argument from different angles.

**Max Böck's** [*The IndieWeb for Everyone*](https://mxb.dev/blog/the-indieweb-for-everyone/) (2022) opens by asking a developer to imagine being a regular user, typing "mastodon" into a search box and landing on a server picker full of tildes and furries and Belgian companies. His axis is the general form: **the more independence a technology gives you, the higher its barrier to adoption.** He does not exempt professionals — his line is that even for professional devs it is hard to wire all the different parts together into a working alternative to social media. The specific moment has aged (this is the November 2022 Twitter exodus, and Mastodon's onboarding has since changed), but the axis has not.

**Lily Mara's** [*Technoelitism and the IndieWeb movement*](https://lilymara.xyz/posts/2024/07/technoelitism/) (2024) makes the community version, and her sharpest observation is not about difficulty at all. Browsing new IndieWeb sites, she was struck by how many of them were *about computers*. The early personal web she and others get nostalgic for was mostly about other things — fandoms, recipes, birdwatching — and those people are the ones who left for the silos and have not come back. What remains is largely developers writing about the web. She quotes a non-technical blogger calling the IndieWeb "a social club for developers", notes that he recanted a few days later, and argues it should not be waved away for that.

**The Jolly Teapot's** [*Why are static site generators so complicated to use?*](https://thejollyteapot.com/2024/10/15/why-are-static-site-generators-so-complicated-to-use) (2024) is the tooling version, framed as Dark Souls: a game where dying repeatedly is the mechanic, and where the reward is intense enough that you forget how hard it was. Twenty to thirty hours with Hugo to get posts in reverse-chronological order, then abandonment; Eleventy easier at first, until images. The pointed part is the closing question. His counter-example is [Blot](https://blot.im/), also a static site generator, which needs no terminal, no Node, no Git and no GitHub account — and he asks why the powerful generators have not produced simpler tools in their own image. He also notes the ecosystem's habit of routing independence through Microsoft (GitHub, VS Code) and free Netlify tiers.

Taken together the criticism is not that the blocks are badly designed. It is that a movement premised on everyone owning their content built tools usable by the people who build tools. The counter-examples exist and mostly predate the criticism — [Micro.blog](https://micro.blog/) ships Micropub, Webmention, IndieAuth and a custom domain hosted, [Bear Blog](https://bearblog.dev/), [Neocities](https://neocities.org/), [omg.lol](https://omg.lol/), Blot, WordPress.com — and the fact that they are the answer rather than the norm is roughly Böck's point.

## In jedee

Every block above is wired, which places this site squarely on the far side of every barrier the criticism names.

- **microformats2** on all sixteen post-type layouts, including the response types that carry `u-like-of` and `in-reply-to`.
- **Webmentions received** through a hosted endpoint and fetched at build time, with Bridgy backfeed — see [[Webmentions]].
- **Micropub live** at `/api/micropub`, a Netlify Function that turns an incoming `h-entry` into a shape-correct markdown file committed to the repo — see [[Micropub]]. Posting from a phone with the laptop off, which is the one thing a static site otherwise cannot do.
- **IndieAuth** via a hosted provider, with `authorization_endpoint` and `token_endpoint` discovery links in the head next to `rel="micropub"`.
- **`rel="me"`** on all seven platform links in the footer.
- **Feeds** per post type — see [[Per-type feeds]]. **POSSE** exists as the `syndication:` field and is used by one post.

Getting there took a forked starter ([[Themes and starters]]), a Node build, a git workflow, a Netlify account and nine wiring points per post type ([[Anatomy of a post type]]). That is a description, not a defence: it is exactly the stack Böck says should not be the price of owning your content.

Two things worth recording against the sources.

**Mara's observation is why the wiki is unfeatured.** Her "I was struck by how many of them were *about* computers" describes a real genre — the personal site whose main subject is how the personal site was built. This wiki is precisely that material, and it is deliberately kept off the front of the site: public and linkable since 2026-09-05, but with no feed, no navigation entry, and reachable only by following a link. The site's own dev-note genre was retired on 2026-07-31 for the same reason, with the factual writing moved here.

**Böck's chart has no position for the on-ramp that actually worked here.** His barrier axis in 2022 ran from hosted platforms at the low end to self-rolled IndieWeb at the high end, with nothing in between except more code. The thing that got these blocks wired on this site was an AI assistant doing the work he describes as hard "even for professional devs" — which is not a simpler tool in Blot's sense, since it still requires the git repo and the Node build underneath, but it does move where the barrier sits. Whether it lowers the on-ramp for the birdwatchers Mara wants back is a different question, and this site is not evidence either way.

Raw sources: `src/_raw/The IndieWeb for Everyone.md` (Max Böck, 2022-11-12) · `src/_raw/Technoelitism and the IndieWeb movement.md` (Lily Mara, 2024-07-20) · `src/_raw/Why are static site generators so complicated to use – The Jolly Teapot.md` (2024-10-15)
