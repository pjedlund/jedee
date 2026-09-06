---
description: "Why the tool that writes a file decides its data model, not the templates that read it — with the four times it happened on jedee."
date: 2026-07-31
---

Data models are usually designed from the consuming end. Someone works out what the templates, the queries or the API responses would like to receive, writes that shape down, and treats anything that doesn't match it as work still to do. On a system where content is *captured* rather than typed — by a browser clipper, a bulk import, a mobile endpoint, a form — that gets the causality backwards, because the shape is not actually up for negotiation. **Whatever writes the file decides the data model.**

The reason is asymmetric cost. A consumer that receives an awkward shape can absorb it: one mapping function, written once, in a place already under your control. A *producer* that can't emit the shape you designed has no such escape — a third-party clipper cannot be taught to nest a field, a platform's export contains whatever it contains, and the gap becomes a manual step repeated on every single item, forever. Ten minutes of editing per post is what a specification looks like when it lost this argument.

So the practical rule is to find out what will write a field before designing it, and to recognize the symptom when it appears in an existing system: **flat data where a specification wanted nesting is usually the writing tool's limit, not unfinished work.** Reading it as a gap produces a backlog of "missing" machinery that was never possible, and a plan to build things nothing can supply input to.

There is one legitimate escape, and it is worth naming because it is not "do it by hand": when a field genuinely must exist and no authoring tool can write it, compute it at build time from something they *can* write. That converts a permanent manual step into a one-off piece of code.

## In jedee

The shape of a post's front matter here is usually decided by whatever writes the file — the Obsidian Web Clipper, a Strava export, the Micropub endpoint — rather than by what the templates would prefer. It has happened often enough, and been mistaken for unfinished work often enough, to be worth collecting.

### Three times the clipper decided it

**1. Recipe structure moved into the body.** The spec planned `ingredients:` and `instructions:` as front-matter arrays, which forced a matching `recipe-body.njk` feed template (front matter is invisible to a feed) and a `schemas/Recipe.njk` to read them. Neither was written. The shipped recipe keeps both as ordinary markdown, with the reason recorded in `recipe.njk`:

```njk
{# Ingredients + instructions live in the note body as markdown (kepano shape) — the Obsidian Web Clipper can't emit a nested `recipe:` object, so a recipe is a body-driven post like every other type. #}
```

Two planned pieces of machinery evaporated with the nesting. See [[Per-type feeds]] and [[One JSON-LD envelope for sixteen types]].

**2. Covers stayed remote.** Bundling covers into the repo was declined twice; the second refusal (25 May 2026) turned on the clipper writing front matter and body text only — the local-images plugin pulls *body* images, never a front-matter `cover:`. Bundling would have meant a manual step on every clip to buy something the build already does. See [[Self-hosting remote images at build time]].

**3. A field's YAML type is decided by whichever template claimed the name first.** The clipper's property types are registered vault-wide by *name*, and a template's `type` is only a seed that never overrides an existing registration. So the raw clipper's `author` had to be `multitext` because the Standard Ebooks template had already registered that name as a list. A new template's data model is constrained by an old one it has nothing to do with. See [[Web Clipper templates]].

### And once the export decided it

The activities archive was imported in bulk from a Strava export, so its front matter records exactly what the export had — raw seconds, metric distance, the three URLs — and nothing derived. The permalink carries a date because the export's filenames were date-led and the same race recurs annually. Coordinates arrived later in two passes, from whichever source happened to publish them. See [[The activities archive]].

### The same force from other tools

- **Nunjucks reads a hyphen as subtraction**, so the IndieWeb `bookmark-of` becomes `bookmarkOf` in front matter and survives as the microformats class only on the rendered element — see [[The title-less post types]].
- **Micropub's payload uses the hyphenated names**, so the endpoint has to map across on the way in. The consumer absorbs the mismatch rather than the data model bending again.

### The escape hatch: compute it at build

When a field genuinely has to exist and no tool can write it, the answer is a build-time computation, not a manual step. Photo posts need EXIF, which nothing in the authoring path emits — so `photos.11tydata.js` computes `photoExif` during the build instead, the only type configured in JavaScript rather than JSON ([[Anatomy of a post type]]). Same move as pushing async work into a Nunjucks filter when a component can't do it.

**What this is not** is an argument that the tool is always right. It's an argument for finding out what the tool does *before* writing the spec — all three clipper cases above were specified first and discovered second, and two of them left planned templates that were never built and briefly looked like a backlog.
