---
title: How the Web Clipper finds the right vault
description: A dev note on Obsidian vault naming — why every Eleventy vault on this machine is called `src`, and how the hidden vault ID routes Web Clipper saves to the right one.
date: 2026-07-05
tags:
  - obsidian
  - indieweb
draft: true
---

This site's content is an Obsidian vault: the [Obsidian Web Clipper](https://obsidian.md/clipper) saves a clipped page as a `.md` file directly into `src/posts/`, one template per source. For that to work, the Clipper has to know *which* vault to save into — and on a machine that runs several Eleventy sites, the vault name is no help at all.

## The name collision

Obsidian names a vault after the folder it opens. This site keeps its content in `src/` — the same folder name every Eleventy site uses for its source. So this vault is named `src`, and so is the vault of every other Eleventy site on the machine. Pointing the Clipper at the vault "src" is ambiguous: several vaults answer to that name, and there is no way to tell them apart by it.

## The vault ID

Underneath the name, each vault has a hidden sixteen-character ID, minted when Obsidian first opens the folder. The IDs live in Obsidian's own registry file — on macOS, `~/Library/Application Support/obsidian/obsidian.json` — keyed by ID, with the folder path as the value:

```json
{
  "vaults": {
    "262cea0685d5b4ac": {
      "path": "/Users/johanedlund/Projects/JEDEE/src",
      "ts": 1778916250098
    },
    "…": { "path": "…/website/src" }
  }
}
```

The fix is to put the ID, not the name, in the Web Clipper's **Vaults** field in its settings. `262cea0685d5b4ac` identifies exactly one vault; "src" identifies four. With the ID registered, every clip lands in this site's `src/` and nowhere else.

Pointers:

- **The ID is stable.** It is created once, when Obsidian first opens the folder, and does not change afterward — safe to hard-code in the Clipper settings.
- **Other vaults in `obsidian.json` show the scale of the collision.** On this machine the file lists several vaults whose paths all end in `/src`; only the ID column differs.
- **Until a vault is registered in the Clipper, the save button reads "Save file…".** It downloads the clip as a plain file instead of saving into Obsidian. The button is a split button — click the chevron and pick "Add to Obsidian" once the vault is in place.

## Why the collision is a feature

The same sameness works in the other direction. A fork of this site keeps its content in `src/` too, so Obsidian names the forker's vault `src` as well. That means the clipper templates in this repo (`src/_obsidian/clipper/`) can target the vault *name* "src" and work unchanged for anyone who forks — no ID required, because on their machine "src" is probably the only vault by that name. The ID is only needed here, where many sites share it. The collision that forces the ID locally is exactly what makes the templates portable.

The personal-voice version of this story is in [[Every vault answers to the same name]].
