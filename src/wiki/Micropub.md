---
description: "The W3C publishing API that lets any client post to any site, and how a static site uses it to gain an editor without giving up the static build."
date: 2026-09-06
---

[Micropub](https://www.w3.org/TR/micropub/) (W3C Recommendation, 2017) is a publishing API: a client sends a post to a server, and the server decides where it lives and what it looks like. Its point is the split. The app you write in and the site you publish to stop being the same product, so one editor can post to any site that implements the spec, and one site can accept posts from any client — [Quill](https://quill.p3k.io/), [Sparkles](https://sparkles.sploot.com/), iA Writer, a shortcut on a phone.

A request is either form-encoded or JSON, and carries `h=entry` plus the [microformats2](https://microformats.org/wiki/microformats2) properties of the post — `content`, `name`, `category`, `in-reply-to`, `like-of` and so on. Authorization is a bearer token from [IndieAuth](https://indieauth.spec.indieweb.org/): the client sends the user to their own domain to sign in, and gets back a token scoped to `create`. The server advertises itself with `<link rel="micropub">` in the head, next to the `authorization_endpoint` and `token_endpoint` links a client needs to complete that handshake.

The spec deliberately says nothing about storage. A Micropub server can write to a database, a file, or a git commit — the response is a `201` and a `Location` header naming the new post's URL, and how it got there is the implementation's business. See [[The IndieWeb]] for where this sits among the other building blocks.

## Why a static site wants one

A static site has no admin interface by construction: publishing means writing a file and rebuilding. That is fine at a desk and useless everywhere else. Micropub closes the gap without touching the build — a small server-side endpoint accepts the post, commits a markdown file, and the ordinary deploy hook does the rest. The site stays static; only the *authoring* path gains a server.

The consequence worth naming is that this makes the authoring tool a second author of the data model, alongside whatever the layouts expect. See [[The authoring tool decides the data model]].

## In jedee

One Netlify Function at `/api/micropub` (`netlify/functions/micropub.js`, ~470 lines), the site's first. It turns an incoming `h-entry` into a shape-correct `.md` committed through the GitHub Contents API — the same kind of file, in the same `src/posts/<type>/` folder, that an Obsidian Web Clipper clip produces. The two are complementary authoring paths over one content layer; see [[Web Clipper templates]].

The engine is `@benjifs/micropub` 2.0.1 plus `@benjifs/github-store`, used **vendor-but-patch**: the engine's conventions are steered through its documented constructor options rather than by editing its source. Three of those conventions do not match this site, and each needed a seam.

**1. The filename prefix.** The engine prefixes a titled post's slug with a unix timestamp — `1733436000-anna-karenina`. jedee's filenames are the title alone, because they double as Obsidian wikilink targets ([[Permalinks and Obsidian-friendly filenames]]). `formatSlug` strips it:

```js
export const formatSlug = (type = 'note', slug = '') =>
  `${TYPE_DIR[type] || type}/${slug.replace(/^\d+-/, '')}`
```

**2. Lowercasing.** The engine slugifies titles to kebab-case, which is right for the URL and wrong for the filename. The store wrapper rewrites it back.

**3. Hyphenated keys.** mf2 property names are hyphenated (`in-reply-to`, `like-of`), and Nunjucks reads a hyphen as subtraction — so the frontmatter keys are camelCase, and a `KEY_MAP` translates on the way in. This is the same constraint that shapes [[The title-less post types]].

### ⚠ The `category` collision

The one trap that will bite anyone reading the spec against this codebase. **Micropub's `category` is the post's user-visible tags.** **jedee's `category` is the post *type*** — the thing that drives `byCategory()` collections and the layout ([[Anatomy of a post type]]). They are different fields with the same name.

The Function resolves it by never writing `category` at all. Micropub `category` becomes `tags`, and the post type falls out of the data cascade from the destination folder's directory-data JSON. Routing a post is therefore purely *choosing its folder*:

```js
export const TYPE_DIR = {
  note: 'notes', reply: 'replies', like: 'likes', bookmark: 'bookmarks',
  repost: 'reposts', rsvp: 'rsvps', article: 'articles', photo: 'photos',
  watch: 'watching', read: 'reading', listen: 'jams'   // ← the asymmetries
}
```

### The rest of the wrapper

- **Every post gets a title**, derived if the client sent none, so nothing lands blank in `<title>`, the OG tags, the feeds or a card. A title-less post's slug comes from the first ~10 words of its body, or — for a reply, repost or RSVP — the last meaningful path segment of its target URL, so the filename, the URL and the `<h1>` all agree instead of reading as a bare timestamp.
- **`visibility` is translated into jedee's own vocabulary**, interpreted centrally at build time in `drafts.js`. `unlisted` keeps the native key and the build drops the post from every collection, feed and the sitemap while its permalink still resolves. `private` reuses the `draft` mechanism, because **there is no true private on a public static build** — a documented limitation, not encryption. Anything else is dropped so no stray `visibility:` line leaks into frontmatter.
- **Cover URLs are upgraded to full resolution.** Sparkles' Movie/Book/Listen editors hand over thumbnails — Apple Music's `100x100bb`, OpenLibrary's `-M` — and the `.cover` block caps width without upscaling, so a thumbnail renders tiny. Known providers are rewritten (`/1000x1000bb.`, `-L`); unknown hosts pass through.
- **Workouts arrive through the same door.** An Apple Watch → iOS Shortcut posts a flat `h-entry` with `activity`, `distance`, `heart-rate` and friends. There is no engine post-type for a workout, so the engine routes it as a `note` and the store wrapper detects `activity` and reroutes it to `src/posts/activities/` ([[The activities archive]]). Pace is derived at render, never stored — only recorded raw numbers land in frontmatter.

### What is not wired

v1 is **create-only, text post-types**. The media endpoint, updates and deletes are all supported by the engine and simply not connected. Auth is hosted IndieAuth (`indieauth.com/auth` and `tokens.indieauth.com/token`) rather than a self-hosted authorization server, which means real client auth presupposes the public `me` domain being live with bidirectional `rel="me"` — the endpoint and the domain go live together or not at all.

Unit tests live in `_local/tests/micropub.test.js`, run by `npm run test:unit`. The helpers are exported from the Function purely so they can be tested.

Raw source: `netlify/functions/micropub.js` and `_local/project_docs/micropub-pattern.html`, read on 2026-09-06.
