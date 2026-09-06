---
description: "The recurring case for publishing on a domain you control rather than inside a platform, the vocabulary it argues in, and the two separate claims — ownership and durability — that it usually runs together."
date: 2026-09-06
---

The argument is old enough to have a vocabulary. It says the canonical copy of what a person publishes should live at a URL they control, and that a platform account — however good, however large its audience — is a place to distribute from, not a place to keep things. It resurfaces roughly every time a large platform changes its terms, and the sources below span twenty years of that cycle without the argument itself changing much.

## The vocabulary

**Silo** is the [IndieWeb](https://indieweb.org/silo) term for a platform that holds content it did not create and does not let it out in full fidelity. The test is not whether an export button exists but whether what comes out is usable: URLs that still resolve, formats readable without the original app, the comments and dates that were attached to the thing.

**Digital sharecropping** is [Nicholas Carr's 2006 coinage](https://www.roughtype.com/?p=634) for the underlying economics: production distributed to the many, the returns concentrated in the few. The analogy is to post-Civil-War tenant farming — you work the land, the landholder takes the crop, and the arrangement ends when the landholder says so. Elizabeth Tai reaches for it directly, and it is the word doing the work in every "you are a tenant, not a homeowner" formulation since.

**Enshittification** is [Cory Doctorow's 2022 term](https://en.wikipedia.org/wiki/Enshittification) for the sequence a two-sided platform runs through: good to users to attract them, then good to business customers at the users' expense, then good to shareholders at everyone's. American Dialect Society word of the year for 2023. It is the mechanism the ownership argument predicts — not malice, just the order in which a platform's obligations get paid.

**Link rot** is the measurable end state, and it is the only part of this with numbers. Pew Research's [2024 study](https://www.pewresearch.org/data-labs/2024/05/17/when-online-content-disappears/) found that **38% of pages that existed in 2013 were unreachable ten years later**, and that a quarter of all pages sampled across 2013–2023 were gone. Most of those were individual pages deleted from sites that still work — the quiet failure mode, not the dramatic one.

## Two arguments that come apart

The sources tend to run these together, and they are worth separating because the remedies differ.

**Control**: the platform can change the rules while you are still using it. Tai's piece is entirely this one — a Substack with a custom domain is a tenancy with a good lease, a `something.substack.com` is not a lease at all, and either way the terms are written by someone else. The remedy is the domain.

**Durability**: the platform can simply stop. Zeldman's is the durability argument, and his framing is the useful one — the threat is no longer loss through destruction but *loss through indifference*. A house fire announces itself; a service that is quietly not worth maintaining does not. Nobody deletes your decade, they just stop paying for the shelf it was on.

These are not the same claim. A self-hosted site on a lapsed domain fails the durability test while passing the control test perfectly. Owning is not the same as enduring, and the ownership argument is often used as though it settled both.

## What owning actually requires

Four things, in descending order of how much they matter:

1. **A domain you control.** This is the whole of it. The URL is the identity; everything else is replaceable behind it.
2. **The content in a format you can read without the tool that made it.** Plain text beats a database export you would need to write a parser for.
3. **A host you can leave without changing your URLs.** Which is a property of the domain plus the content, not of the host.
4. **A way to be followed that isn't a platform** — a feed.

Hosting is last on purpose, and Tai's own example proves it: [John Scalzi](https://whatever.scalzi.com/) has published continuously for 28 years on hosted WordPress.com. He owns the domain, so the hosting is an implementation detail. Nothing in the argument requires running your own server, or a static site generator, or code at all.

## POSSE

The order of operations, not an abstinence pledge. **P**ublish (on your) **O**wn **S**ite, **S**yndicate **E**lsewhere: the post exists at your URL first, and the copies on platforms link back to it. Coined by Tantek Çelik around 2012; the inverse, PESOS, publishes to the platform and pulls a copy home. The IndieWeb's conclusion has never been "leave the platforms" — it is that the canonical copy has to be somewhere you control. See [[The IndieWeb]].

## The other half of the argument

Max Böck's *Make Free Stuff* is about the culture rather than the plumbing, and it is the piece that names what a reader actually experiences: cookie consent designed to be confusing, an app-install banner, a newsletter modal, a registration wall — a stack of interruptions in which "everything about that interaction is designed to extract value from your visit." His point is that the web's economics do not require this. Copies are free here; artificial scarcity is a choice, and imposing it is a business decision imported from markets where scarcity is real.

His example was Wordle, put online free with no monetization and no strings, and his own update a week later is the honest coda: it sold to the New York Times for seven figures on 1 February 2022. The argument survives the coda — the game was free while it mattered, and Wardle chose that — but a page that quotes it without the update is quoting a 2022 essay as though it ended where it stopped.

## In jedee

The site is the argument implemented, with the gaps recorded honestly.

- **The domain is the asset.** `johanedlund.se`, with every post a plain markdown file in a git repo. Netlify builds and serves it and could be swapped for anything that serves static files without a single URL changing. Nothing here needs Netlify to keep existing.
- **No extraction stack.** No cookie banner, no newsletter modal, no registration wall, no app-install prompt. Analytics is Umami — cookieless and carrying no personal data, which is why there is no consent banner to dismiss; it is also gated to deployed builds, so local development is not counted.
- **Feeds instead of a follow button.** Per-type Atom and JSON feeds across the site, which is the fourth requirement above; see [[Per-type feeds]].
- **POSSE is wired but barely used.** The `syndication:` front-matter field renders `u-syndication` links in the entry footer, and exactly **one** post currently sets it. The mechanism exists; the practice does not yet.
- **Durability is treated as a separate problem**, and mostly addressed backwards. Per-post `redirectFrom:` keeps old URLs alive through renames, [[Link checking]] scans for outbound rot, and two archives were reconstructed after the fact rather than kept: 119 posts recovered in [[Rebuilding an archive from the Wayback Machine]] and 157 in [[The activities archive]]. Both are the durability argument arriving late, which is the normal way it arrives.
- **The caveat the sources rarely state.** None of the above survives the domain not being renewed. Self-hosting moves the single point of failure from a company to a person; it does not remove it.

Raw sources: `src/_raw/Memories Can't Wait—or, How I Learned to Keep Worrying About the Web - State of the Web.md` (Jeffrey Zeldman, 2026-07-06) · `src/_raw/Substack writers, you need a website!.md` (Elizabeth Tai, 2026-06-10) · `src/_raw/Make Free Stuff.md` (Max Böck, 2022-01-25)
