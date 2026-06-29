// JEDEE's Micropub server — the site's first Netlify Function.
//
// One endpoint at /api/micropub that turns an incoming h-entry (from any
// Micropub client: Sparkles, Quill, iA Writer…) into a shape-correct .md
// committed to the repo via the GitHub Contents API. A Micropub post lands as
// the *same* kind of .md, in the *same* src/posts/<type>/ folder, as an Obsidian
// Web Clipper clip — the two are complementary authoring paths over one content
// layer. See the `micropub` skill and __project_docs/micropub-pattern.html.
//
// Engine: @benjifs/micropub (auth, routing, frontmatter, CRUD) +
// @benjifs/github-store (the GitHub backend). We "vendor-but-patch": the engine
// (v2.0.1) exposes its conventions only through constructor options, so we steer
// it through those documented seams rather than editing its source —
//   • contentDir  -> src/posts
//   • formatSlug  -> map the engine post-type to this site's folder, and strip
//                    the engine's leading unix-timestamp prefix (patch points 1+2)
//   • store       -> a wrapper that rewrites the committed frontmatter to this
//                    site's conventions before the GitHub commit (patch point 3):
//                    camelCase target keys, no `category` (inherited from the
//                    folder JSON), merged `tags`, full-res cover URLs, a derived
//                    `title` for every post (so none lands blank in
//                    <title>/OG/feeds/cards), and — for a title-less post — that
//                    same title as a clean slug so its filename, URL, and <h1>
//                    all match (not a bare timestamp).
//
// v1 is create-only, text post-types; the media/update/delete surface the engine
// already supports is simply not wired. Real-client auth presupposes the public
// `me` domain being live — see the sequencing note in the design doc.

import MicropubEndpoint from '@benjifs/micropub'
import GitHubStore from '@benjifs/github-store'
import matter from 'gray-matter'

// --- environment (set in Netlify) ---------------------------------------
const {
  ME,
  TOKEN_ENDPOINT = 'https://tokens.indieauth.com/token',
  GITHUB_TOKEN,
  GITHUB_USER,
  GITHUB_REPO,
  GITHUB_BRANCH // optional — unset commits to the repo's default branch (main)
} = process.env

const CONTENT_DIR = 'src/posts'
const FIREHOSE_TAG = 'posts' // every post carries tags:"posts" via its folder JSON

// Engine post-type -> destination folder under CONTENT_DIR. The post `category`
// (the post *type* that drives byCategory() collections) is inherited from each
// folder's directory-data JSON, so the Function never writes it — routing a post
// is purely choosing its folder, and `category` falls out of the data cascade.
// Note the asymmetries: listen -> jams, watch -> watching, read -> reading.
export const TYPE_DIR = {
  note: 'notes',
  reply: 'replies',
  like: 'likes',
  bookmark: 'bookmarks',
  repost: 'reposts',
  rsvp: 'rsvps',
  watch: 'watching',
  read: 'reading',
  listen: 'jams',
  article: 'articles',
  photo: 'photos'
}

// Micropub kebab property -> this site's frontmatter key (what the layouts read).
// name/category/published are already translated by the engine's translateProps;
// these are the simple target-URL keys it leaves hyphenated (a string value).
export const KEY_MAP = {
  'in-reply-to': 'inReplyTo',
  'like-of': 'likeOf',
  'bookmark-of': 'bookmarkOf',
  'repost-of': 'repostOf'
}

// watch/read/listen are richer: Sparkles' Movie/Book/Listen editors nest the
// media's identity in an h-cite (name/photo/url/published/author/content) and
// resend the poster top-level as `featured`. The cite's url becomes the layout's
// identity key (url/link/source, confirmed against src/_layouts/{watching,reading,
// jam}.njk); the rest is destructured into title/cover/year/(artist|author)/plot
// below. A jam diverges: the cite name also fills `album`, and the cite author is
// the `artist` (film/book keep `author`) — matching the jam clippers + layout.
export const MEDIA_KEY = {
  'watch-of': 'url',
  'read-of': 'link',
  'listen-of': 'source'
}

// Workout post (Apple Watch -> iOS Shortcut -> /api/micropub). There is no native
// engine post-type for a workout, so the Shortcut POSTs a plain h-entry with these
// flat properties and the engine routes it as a `note`; the store wrapper detects
// the `activity` property and reroutes it to src/posts/training/ (see workoutFile).
// Pace/speed is DERIVED at render (paceOrSpeed filter), never stored — so only the
// recorded raw numbers land here. Numeric props are coerced; the rest stay strings.
export const WORKOUT_KEY = {
  activity: 'activityType',
  distance: 'distanceKm',
  duration: 'duration',
  'heart-rate': 'hrAvg',
  hr: 'hrAvg',
  energy: 'energyKcal',
  strava: 'stravaUrl',
  livelox: 'liveloxUrl'
}
const WORKOUT_NUMERIC = new Set(['distanceKm', 'duration', 'hrAvg', 'energyKcal'])

// --- helpers (exported for unit tests) -----------------------------------

// Mirror the engine's slugify (lowercase, kebab, drop punctuation).
export const slugify = (s = '') =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

// Strip HTML tags + entities so markup in the body (e.g. an <a href>, which
// some clients send) never leaks into the slug.
export const stripHtml = (s = '') =>
  String(s).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')

// First ~10 words of the body, slugified and capped — for title-less notes.
export const contentSlug = (body = '') => {
  const s = slugify(stripHtml(body)).split('-').filter(Boolean).slice(0, 10).join('-')
  return s.slice(0, 70).replace(/-+$/, '')
}

// Last meaningful path segment of a target URL — for title-less replies/rsvps/reposts.
export const targetSlug = (data = {}) => {
  const target = data.inReplyTo || data.repostOf || data.bookmarkOf || data.likeOf
  if (!target || typeof target !== 'string') return ''
  try {
    const u = new URL(target)
    const seg = u.pathname.split('/').filter(Boolean).pop()
    return slugify(seg || u.hostname)
  } catch {
    return ''
  }
}

// Flatten a jf2 value that may arrive as an array or a nested h-cite object down
// to the plain string the layouts expect (e.g. href="{{ likeOf }}").
export const flatten = (v) => {
  if (Array.isArray(v)) v = v[0]
  if (v && typeof v === 'object') return v.url || v.value || v.name || ''
  return v
}

// Sparkles' Movie/Book/Listen editors hand over a thumbnail-sized cover URL
// (Apple Music's 100x100, OpenLibrary's -M, ~180px). The .cover block only caps
// width — it never upscales — so a thumbnail renders tiny. Rewrite the known
// providers to a full-resolution variant so the build self-hosts a sharp image
// instead of a blurry one. Unknown hosts pass through unchanged.
export const upgradeCoverUrl = (url = '') => {
  if (!url || typeof url !== 'string') return url
  // Apple Music / iTunes artwork (mzstatic): the trailing `{w}x{h}bb.<ext>`
  // segment is the requested render size — ask for 1000x1000.
  if (url.includes('mzstatic.com')) {
    return url.replace(/\/\d+x\d+bb\.(jpe?g|png|webp)$/i, '/1000x1000bb.$1')
  }
  // OpenLibrary covers come in -S / -M / -L; -L (the largest) is the only upgrade.
  if (url.includes('covers.openlibrary.org')) {
    return url.replace(/-[SM](\.(?:jpe?g|png))$/i, '-L$1')
  }
  return url
}

// folder/slug for the engine; strips the leading unix-timestamp prefix it adds
// to titled posts (e.g. `1733436000-anna-karenina` -> `anna-karenina`). A bare
// timestamp (title-less post) has no trailing `-`, so it passes through here and
// is upgraded later in the store.
export const formatSlug = (type = 'note', slug = '') =>
  `${TYPE_DIR[type] || type}/${slug.replace(/^\d+-/, '')}`

// Rewrite the engine's frontmatter to JEDEE conventions. Pure: returns the new
// frontmatter object; the body is left untouched.
export const rewriteFrontmatter = (data = {}) => {
  const out = {}
  let mediaSeen = false
  for (const [key, value] of Object.entries(data)) {
    if (key === 'content' || key === 'access_token') continue // body, secret
    if (key === 'type' || key === 'client_id') continue // mf2/engine noise
    if (key.startsWith('mp-')) continue // client directives (mp-slug, mp-syndicate-to…)
    if (key === 'featured') continue // poster — folded into `cover` from the media cite below

    if (key === 'post-status') {
      if (value === 'draft') out.draft = true // else published -> omit (publish on commit)
      continue
    }
    if (key === 'visibility') {
      // Micropub `visibility` -> JEDEE's native vocabulary, interpreted at build
      // time (see src/_config/plugins/drafts.js):
      //   unlisted -> keep the native key; the build drops it from every
      //               collection/feed + the sitemap and emits `noindex`, while
      //               its permalink still resolves.
      //   private  -> there is no true "private" on a public static build, so
      //               reuse the `draft` mechanism (unpublished). A documented
      //               limitation — not encryption/auth-gating.
      //   public / absent / anything else -> dropped, so the catch-all below
      //               never leaks a stray `visibility:` line into frontmatter.
      if (value === 'unlisted') out.visibility = 'unlisted'
      else if (value === 'private') out.draft = true
      continue
    }
    // A workout's flat property -> the training post's frontmatter key. Numeric
    // props (distance/duration/hr/energy) are coerced; empty/non-numeric ones are
    // skipped so they never write a null or NaN line.
    if (key in WORKOUT_KEY) {
      const target = WORKOUT_KEY[key]
      const v = flatten(value)
      if (v === '' || v == null) continue
      if (WORKOUT_NUMERIC.has(target)) {
        const n = Number(v)
        if (!Number.isNaN(n)) out[target] = n
      } else {
        out[target] = v
      }
      continue
    }
    // A watch/read/listen h-cite: take its url as the identity key, then recover
    // the title/cover/year/(artist|author)/plot the layouts (and Obsidian filenames)
    // need. A jam diverges from film/book in two cite fields (see below), so the
    // listen case is split out.
    if (MEDIA_KEY[key]) {
      mediaSeen = true
      const isListen = key === 'listen-of'
      const url = flatten(value)
      if (url) out[MEDIA_KEY[key]] = url
      const cite =
        value && typeof value === 'object' && !Array.isArray(value)
          ? value
          : Array.isArray(value) && value[0] && typeof value[0] === 'object'
            ? value[0]
            : null
      if (cite) {
        if (cite.name && !out.title) out.title = flatten(cite.name)
        // A jam's cite name is also its release: the Listen editor only knows the
        // album, so mirror it into `album` (film/book have no album concept).
        if (isListen && cite.name && !('album' in out)) out.album = flatten(cite.name)
        if (cite.photo && !out.cover) out.cover = flatten(cite.photo)
        if (cite.published && !('year' in out)) out.year = flatten(cite.published)
        // The cite's creator is the performer on a jam -> `artist` (matching the
        // clippers + the jam layout), but the director/author on a film/book -> `author`.
        const creatorKey = isListen ? 'artist' : 'author'
        if (cite.author && !(creatorKey in out)) out[creatorKey] = flatten(cite.author)
        if (cite.content && !('plot' in out)) out.plot = flatten(cite.content)
      }
      continue
    }
    if (KEY_MAP[key]) {
      out[KEY_MAP[key]] = flatten(value)
      continue
    }
    out[key] = value
  }

  // The media editors also send the poster top-level as `featured`; use it as a
  // `cover` fallback only inside a media post (never let it pollute other types).
  if (mediaSeen && data.featured && !out.cover) out.cover = flatten(data.featured)

  // Upgrade a thumbnail cover URL (Apple Music / OpenLibrary) to full-res so the
  // build self-hosts a sharp image rather than a tiny upscale.
  if (out.cover) out.cover = upgradeCoverUrl(out.cover)

  // A custom `mp-slug` on a TITLED post becomes a `slug` URL field — the titled-type
  // permalinks honor it (`(slug or page.fileSlug) | slugify`), so the file keeps its
  // Obsidian Title-Case name while the slug drives the URL. On a title-less post the
  // engine already used the mp-slug as the filename, so don't duplicate it here.
  if (out.title && data['mp-slug']) out.slug = flatten(data['mp-slug'])

  // tags: the folder JSON's tags:"posts" is added by Eleventy's data cascade
  // (deep merge concatenates `tags`), so front matter carries ONLY the user tags
  // (engine mapped Micropub `category` -> `tags`). Re-adding the firehose tag here
  // would double it — folder "posts" + this "posts" — so strip it out instead.
  if ('tags' in out) {
    const user = (Array.isArray(out.tags) ? out.tags : [out.tags]).filter(Boolean)
    const userTags = [...new Set(user)].filter((tag) => tag !== FIREHOSE_TAG)
    if (userTags.length) out.tags = userTags
    else delete out.tags // inherit tags:"posts" from the folder JSON
  }

  // A workout carries no `name`, so give it a title for <title>/OG/feeds/card/p-name:
  // the activity, plus the distance when there is one ("Run · 5.2 km" / "Strength").
  if (out.activityType && !out.title) {
    out.title = out.distanceKm ? `${out.activityType} · ${out.distanceKm} km` : out.activityType
  }

  return out
}

// Turn a post title into an Obsidian-friendly filename: keep Title Case, spaces,
// commas and apostrophes (so `[[wikilinks]]` read naturally and match the clipper's
// `Paris, Texas.md`), stripping only the characters Obsidian / most filesystems
// forbid in a name.
export const titleToFilename = (title = '') =>
  String(title)
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// Decide the final committed filename for a post. Two cases:
//   1. a titled post (film/book/jam/article) -> an Obsidian Title-Case `<title>.md`
//      filename (patch point #2) so `[[wikilinks]]` resolve. A custom URL slug
//      (written to `data.slug` by rewriteFrontmatter when a client sends `mp-slug`)
//      drives the URL via the titled-type permalink — it never hijacks the filename.
//   2. a title-less post the engine named with a *bare* unix timestamp (`^\d+$`)
//      -> upgrade to a slug derived from `derivedTitle` (the post's own derived
//      title, so the filename, URL, and <h1> all match), falling back to a
//      content/target slug. A title-less `mp-slug` already named the file (not a
//      bare timestamp), so it passes straight through untouched.
// Pure (no I/O). `data` is the already-rewritten frontmatter; `derivedTitle` is the
// guaranteed title (from ensureTitle). Returns the path and the public URL it
// implies (null when unchanged / ME unset).
export const resolveFilename = (filename, data = {}, content = '', derivedTitle = '') => {
  const unchanged = { finalName: filename, location: null }
  const m = filename.match(/^(.*)\/([^/]+)\/([^/]+)\.md$/)
  if (!m) return unchanged
  const [, dir, folder, slug] = m
  const publicUrl = (name) => (ME ? `${ME.replace(/\/$/, '')}/${folder}/${name}` : null)

  if (data.title) {
    const name = titleToFilename(data.title)
    if (!name) return unchanged
    // the URL uses a custom `slug` when present, else the slugified title
    const urlSlug = slugify(data.slug || name)
    return { finalName: `${dir}/${folder}/${name}.md`, location: publicUrl(urlSlug) }
  }

  if (!/^\d+$/.test(slug)) return unchanged // already named (not a bare timestamp)
  const better = slugify(derivedTitle) || contentSlug(content) || targetSlug(data)
  if (!better || better === slug) return unchanged
  return { finalName: `${dir}/${folder}/${better}.md`, location: publicUrl(better) }
}

// YYYY-MM-DD from an ISO date string (the engine's `date`); '' if unparseable.
export const ymd = (d) => {
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10)
}

// A workout's committed filename + public URL. The engine has no `workout` type, so
// it routed the post to notes/ — force the `training` folder instead, and build a
// dated kebab slug (`2026-06-29-run-5-2-km`) so same-day repeats don't collide. Pure
// (no I/O); `data` is the already-rewritten frontmatter (carries `title` + `date`).
export const workoutFile = (filename, data = {}) => {
  const unchanged = { finalName: filename, location: null }
  const m = filename.match(/^(.*)\/([^/]+)\/([^/]+)\.md$/)
  if (!m) return unchanged
  const dir = m[1]
  const folder = 'training'
  const slug = [ymd(data.date), slugify(data.title || data.activityType)].filter(Boolean).join('-')
  if (!slug) return unchanged
  const location = ME ? `${ME.replace(/\/$/, '')}/${folder}/${slug}` : null
  return { finalName: `${dir}/${folder}/${slug}.md`, location }
}

// --- title derivation ------------------------------------------------------
// Every post should carry a `title`: a title-less post degrades in the page
// <title> (falls back to the bare site name), og:title + the OG-image path,
// the Atom/JSON feed entry <title>, the notes archive card headline, and the
// hidden h-entry p-name. The media/article types already get a title (the cite
// name / required `name`); these helpers derive one for the title-less types
// (note, reply, like, bookmark, repost, rsvp) — content-first, then the target.

// A readable title from the body: the first non-empty line, then its first
// sentence, capped at TITLE_MAX_WORDS words on a word boundary. No ellipsis — the
// title also becomes the filename/slug for title-less posts, so a clean cut beats
// signalling truncation — and any stopword left dangling by the cut is trimmed.
const TITLE_MAX_WORDS = 6
const TRAILING_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'of', 'to', 'in', 'into', 'on',
  'onto', 'with', 'for', 'at', 'by', 'from', 'as', 'so', 'if', 'is', 'are', 'was',
  'were', 'be', 'that', 'this', 'these', 'those', 'my', 'your', 'our', 'their',
  'its', 'it', 'we', 'i', 'than', 'then', 'via', 'about', 'over', 'per'
])
export const titleFromContent = (body = '') => {
  const text = stripHtml(body).replace(/\r/g, '')
  let line = text.split('\n').map((s) => s.trim()).find(Boolean) || ''
  line = line.replace(/^\s*(?:[>#*-]+|\d+\.)\s*/, '').replace(/\s+/g, ' ').trim() // drop leading md markers
  if (!line) return ''
  const sentence = line.match(/^(.*?[.!?])(?:\s|$)/) // prefer the first sentence when a line packs several
  let title = sentence ? sentence[1] : line

  let words = title.split(' ')
  const truncated = words.length > TITLE_MAX_WORDS
  if (truncated) words = words.slice(0, TITLE_MAX_WORDS)
  title = words.join(' ').replace(/[.,;:]+$/, '') // tidy trailing punctuation (keep ? !)

  // when we cut mid-thought, drop any stopword(s) left dangling at the end
  if (truncated) {
    let parts = title.split(' ')
    while (parts.length > 1 && TRAILING_STOPWORDS.has(parts[parts.length - 1].toLowerCase().replace(/[^\w']+/g, ''))) {
      parts.pop()
    }
    title = parts.join(' ')
  }
  if (!title) return ''
  return title.charAt(0).toUpperCase() + title.slice(1)
}

// A target URL minus the scheme/www/trailing slash — for response-type titles.
export const humanizeUrl = (url = '') => {
  const raw = flatten(url)
  if (!raw || typeof raw !== 'string') return ''
  try {
    const u = new URL(raw)
    return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '')
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./, '').replace(/\/+$/, '')
  }
}

// The verb-phrase title for a URL-only response (mirrors card-response.njk):
// "Liked x.com/y", "In reply to …", "Bookmarked …", "Reposted …", "RSVP yes to …".
const RESPONSE_VERB = {
  inReplyTo: 'In reply to',
  likeOf: 'Liked',
  bookmarkOf: 'Bookmarked',
  repostOf: 'Reposted'
}
export const titleFromTarget = (data = {}) => {
  if (data.rsvp && data.inReplyTo) return `RSVP ${data.rsvp} to ${humanizeUrl(data.inReplyTo)}`.trim()
  for (const key of ['inReplyTo', 'likeOf', 'bookmarkOf', 'repostOf']) {
    if (data[key]) return `${RESPONSE_VERB[key]} ${humanizeUrl(data[key])}`.trim()
  }
  return ''
}

// Guarantee a title: keep an existing one (media/article/client `name`), else
// derive content-first, else from the response target. Returns the data with
// `title` first; leaves a truly empty post (no content, no target) title-less.
export const ensureTitle = (data = {}, content = '') => {
  if (data.title) return data
  const derived = titleFromContent(content) || titleFromTarget(data)
  return derived ? { title: derived, ...data } : data
}

// --- store ----------------------------------------------------------------

// A GitHubStore that rewrites frontmatter to JEDEE conventions and upgrades a
// title-less post's timestamp slug to a content/target-derived one, just before
// the commit. `onLocation` reports the final public URL so the handler can keep
// the Location header (the client's "view post" link) in sync with any re-slug.
class JedeeStore {
  constructor(opts, onLocation) {
    this.inner = new GitHubStore(opts)
    this.onLocation = onLocation
  }
  getFile(f) { return this.inner.getFile(f) }
  getDirectory(d) { return this.inner.getDirectory(d) }
  updateFile(f, c, o) { return this.inner.updateFile(f, c, o) }
  deleteFile(f, o) { return this.inner.deleteFile(f, o) }
  uploadImage(f, file) { return this.inner.uploadImage(f, file) }

  async createFile(filename, content) {
    const parsed = matter(content)
    const data = rewriteFrontmatter(parsed.data)

    // A workout routes to src/posts/training/ with a dated kebab filename; its title
    // is already derived (activity + distance) by rewriteFrontmatter, so it skips the
    // generic title/slug path entirely.
    if ('activityType' in data) {
      const { finalName, location } = workoutFile(filename, data)
      if (location && this.onLocation) this.onLocation(location)
      return this.inner.createFile(finalName, matter.stringify(parsed.content, data))
    }

    // Guarantee a `title` (additive) so the post isn't blank in <title>/OG/feeds/
    // cards/p-name. The SAME derived title also drives the clean slug for a
    // title-less post (note/reply/rsvp…), so its filename, URL, and <h1> all match;
    // a titled media/article post keeps its Obsidian Title-Case filename instead
    // (resolveFilename branches on the original `data.title`, set only for those).
    const titled = ensureTitle(data, parsed.content)

    // filename arrives as `${CONTENT_DIR}/<folder>/<slug>.md`. resolveFilename gives
    // a titled post an Obsidian Title-Case filename and upgrades a title-less post's
    // bare-timestamp slug to a title/content/target slug, reporting the public URL
    // it implies so the Location header stays in sync. (A custom `mp-slug` on a
    // titled post was turned into `data.slug` by rewriteFrontmatter — it routes to
    // the URL, not the filename.)
    const { finalName, location } = resolveFilename(filename, data, parsed.content, titled.title)
    if (location && this.onLocation) this.onLocation(location)

    const fm = matter.stringify(parsed.content, titled)
    return this.inner.createFile(finalName, fm)
  }
}

// --- handler --------------------------------------------------------------

const buildEndpoint = (onLocation) =>
  new MicropubEndpoint({
    me: ME,
    tokenEndpoint: TOKEN_ENDPOINT,
    contentDir: CONTENT_DIR,
    store: new JedeeStore(
      {
        token: GITHUB_TOKEN,
        user: GITHUB_USER,
        repo: GITHUB_REPO,
        ...(GITHUB_BRANCH && { branch: GITHUB_BRANCH })
      },
      onLocation
    ),
    // name->title, category->tags, published->date; KEY_MAP handles the rest.
    translateProps: true,
    formatSlug,
    // advertised on `q=config` so clients (Sparkles) show the right editors.
    config: {
      'media-endpoint': '',
      'syndicate-to': [],
      'post-types': [
        { type: 'note', name: 'Note' },
        { type: 'reply', name: 'Reply' },
        { type: 'like', name: 'Like' },
        { type: 'bookmark', name: 'Bookmark' },
        { type: 'repost', name: 'Repost' },
        { type: 'rsvp', name: 'RSVP' },
        { type: 'article', name: 'Article' },
        { type: 'watch', name: 'Watch' },
        { type: 'read', name: 'Read' },
        { type: 'listen', name: 'Listen' }
      ]
    }
  })

export default async (req) => {
  // Per request so the Location-capture closure is request-local.
  let finalLocation = null
  const endpoint = buildEndpoint((loc) => { finalLocation = loc })

  const res = await endpoint.micropubHandler(req)

  // Keep the Location header in sync when we re-slugged a title-less post.
  if (res.status === 201 && finalLocation) {
    const headers = new Headers(res.headers)
    headers.set('Location', finalLocation)
    return new Response(res.body, { status: res.status, headers })
  }
  return res
}

// Netlify Functions v2 native route — no redirect needed.
export const config = { path: '/api/micropub' }
