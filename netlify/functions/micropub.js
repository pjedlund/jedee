// jedee's Micropub server: turns an incoming h-entry into a .md in src/posts/<type>/, committed through the GitHub API. How and why: the wiki page "Micropub" and the `micropub` skill.
// ⚠ Steer the engine (@benjifs/micropub 2.0.1) only through its constructor options, never by editing its source. The three patch points:
//   • formatSlug -> this site's folder, minus the engine's unix-timestamp prefix (patch points 1+2)
//   • store      -> rewrites the front matter to this site's shape before the commit (patch point 3)
// v1 is create-only, text post types.

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

export const CONTENT_DIR = 'src/posts'
const FIREHOSE_TAG = 'posts' // every post carries tags:"posts" via its folder JSON

// Engine post-type -> folder under CONTENT_DIR. ⚠ Never write `category`: it comes from the folder's data file.
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

// Micropub kebab property -> this site's front-matter key, for the target-URL keys the engine leaves hyphenated.
export const KEY_MAP = {
  'in-reply-to': 'inReplyTo',
  'like-of': 'likeOf',
  'bookmark-of': 'bookmarkOf',
  'repost-of': 'repostOf'
}

// watch/read/listen nest the media in an h-cite; its url becomes the identity key and the rest is unpacked below. A jam also fills `album`, and calls its author `artist`.
export const MEDIA_KEY = {
  'watch-of': 'url',
  'read-of': 'link',
  'listen-of': 'source'
}

// A workout arrives as a plain h-entry the engine routes as a note; the store reroutes it to activities/. ⚠ Store only recorded numbers: pace/speed is derived at render.
export const WORKOUT_KEY = {
  activity: 'activityType',
  distance: 'distanceKm',
  duration: 'duration',
  'heart-rate': 'hrAvg',
  hr: 'hrAvg',
  'max-heart-rate': 'hrMax',
  'hr-max': 'hrMax',
  energy: 'energyKcal',
  'elevation-gain': 'elevationGain',
  'elevation-loss': 'elevationLoss',
  'health-export-id': 'healthExportId',
  strava: 'stravaUrl',
  livelox: 'liveloxUrl',
  eventor: 'eventorUrl'
}
const WORKOUT_NUMERIC = new Set(['distanceKm', 'duration', 'hrAvg', 'hrMax', 'energyKcal', 'elevationGain', 'elevationLoss'])

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

// Strip HTML tags + entities so markup in the body (e.g. an <a href>, which some clients send) never leaks into the slug.
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

// Flatten a jf2 value that may arrive as an array or a nested h-cite object down to the plain string the layouts expect (e.g. href="{{ likeOf }}").
export const flatten = (v) => {
  if (Array.isArray(v)) v = v[0]
  if (v && typeof v === 'object') return v.url || v.value || v.name || ''
  return v
}

// Upgrade a known provider's thumbnail cover URL to full resolution, since the cover never upscales. Unknown hosts pass through.
export const upgradeCoverUrl = (url = '') => {
  if (!url || typeof url !== 'string') return url
  // Apple Music / iTunes artwork (mzstatic): the trailing `{w}x{h}bb.<ext>` segment is the requested render size — ask for 1000x1000.
  if (url.includes('mzstatic.com')) {
    return url.replace(/\/\d+x\d+bb\.(jpe?g|png|webp)$/i, '/1000x1000bb.$1')
  }
  // OpenLibrary covers come in -S / -M / -L; -L (the largest) is the only upgrade.
  if (url.includes('covers.openlibrary.org')) {
    return url.replace(/-[SM](\.(?:jpe?g|png))$/i, '-L$1')
  }
  return url
}

// Strip the engine's unix-timestamp prefix from a titled post's slug. A bare timestamp (title-less post) passes through and is upgraded in the store.
export const formatSlug = (type = 'note', slug = '') =>
  `${TYPE_DIR[type] || type}/${slug.replace(/^\d+-/, '')}`

// A workout's title: the activity, plus the distance when there is one ("Run · 5.2 km"). Exported so the health-export adapter can predict the slug and check for a collision.
export const deriveWorkoutTitle = (activityType, distanceKm) =>
  distanceKm ? `${activityType} · ${distanceKm} km` : activityType

// Rewrite the engine's frontmatter to jedee conventions. Pure: returns the new frontmatter object; the body is left untouched.
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
      // Micropub `visibility` -> jedee's vocabulary, interpreted at build time in src/_config/plugins/drafts.js:
      //   unlisted -> kept: out of every collection, feed and the sitemap, noindex, but its URL still works
      //   private  -> draft (a static build has no real private)
      //   public / absent / anything else -> dropped
      if (value === 'unlisted') out.visibility = 'unlisted'
      else if (value === 'private') out.draft = true
      continue
    }
    // A workout's flat property -> the training post's frontmatter key. Numeric props (distance/duration/hr/energy) are coerced; empty/non-numeric ones are skipped so they never write a null or NaN line.
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
    // A watch/read/listen h-cite: take its url as the identity key, then recover the title/cover/year/(artist|author)/plot the layouts (and Obsidian filenames) need. A jam diverges from film/book in two cite fields (see below), so the listen case is split out.
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
        // A jam's cite name is also its release: the Listen editor only knows the album, so mirror it into `album` (film/book have no album concept).
        if (isListen && cite.name && !('album' in out)) out.album = flatten(cite.name)
        if (cite.photo && !out.cover) out.cover = flatten(cite.photo)
        if (cite.published && !('year' in out)) out.year = flatten(cite.published)
        // The cite's creator is the performer on a jam -> `artist` (matching the clippers + the jam layout), but the director/author on a film/book -> `author`.
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

  // The media editors also send the poster top-level as `featured`; use it as a `cover` fallback only inside a media post (never let it pollute other types).
  if (mediaSeen && data.featured && !out.cover) out.cover = flatten(data.featured)

  // Upgrade a thumbnail cover URL (Apple Music / OpenLibrary) to full-res so the build self-hosts a sharp image rather than a tiny upscale.
  if (out.cover) out.cover = upgradeCoverUrl(out.cover)

  // A titled post's `mp-slug` becomes a `slug` URL field, so the file keeps its Title-Case name. A title-less post already used it as the filename.
  if (out.title && data['mp-slug']) out.slug = flatten(data['mp-slug'])

  // ⚠ Front matter carries only the user's tags: the folder's `posts` tag is added by the data cascade, so re-adding it would double it.
  if ('tags' in out) {
    const user = (Array.isArray(out.tags) ? out.tags : [out.tags]).filter(Boolean)
    const userTags = [...new Set(user)].filter((tag) => tag !== FIREHOSE_TAG)
    if (userTags.length) out.tags = userTags
    else delete out.tags // inherit tags:"posts" from the folder JSON
  }

  if (out.activityType && !out.title) {
    out.title = deriveWorkoutTitle(out.activityType, out.distanceKm)
  }

  return out
}

// Title -> an Obsidian-friendly filename: keep Title Case and punctuation so [[wikilinks]] read naturally, strip only what filesystems forbid.
export const titleToFilename = (title = '') =>
  String(title)
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// The committed filename, two cases (pure; returns the path and its public URL, null when unchanged):
//   1. a titled post -> `<Title>.md` (patch point 2); a custom slug only drives the URL
//   2. a title-less post named with a bare timestamp -> a slug from its derived title, so filename, URL and <h1> match
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

// A workout's committed filename + public URL. The engine has no `workout` type and routed it to notes/ — force `activities` instead, with a dated kebab slug (`2026-06-29-run-5-2-km`) so same-day repeats don't collide. Pure.
export const workoutFile = (filename, data = {}) => {
  const unchanged = { finalName: filename, location: null }
  const m = filename.match(/^(.*)\/([^/]+)\/([^/]+)\.md$/)
  if (!m) return unchanged
  const dir = m[1]
  const folder = 'activities'
  const slug = [ymd(data.date), slugify(data.title || data.activityType)].filter(Boolean).join('-')
  if (!slug) return unchanged
  const location = ME ? `${ME.replace(/\/$/, '')}/${folder}/${slug}` : null
  return { finalName: `${dir}/${folder}/${slug}.md`, location }
}

// --- title derivation: every post gets a `title`, content-first, then the target; see the wiki "Micropub" ---

// A title from the body's first sentence, capped at TITLE_MAX_WORDS on a word boundary, with no ellipsis because it also becomes the slug.
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

// The verb-phrase title for a URL-only response (mirrors card-response.njk): "Liked x.com/y", "In reply to …", "Bookmarked …", "Reposted …", "RSVP yes to …".
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

// Guarantee a title: keep an existing one (media/article/client `name`), else derive content-first, else from the response target. Returns the data with `title` first; leaves a truly empty post (no content, no target) title-less.
export const ensureTitle = (data = {}, content = '') => {
  if (data.title) return data
  const derived = titleFromContent(content) || titleFromTarget(data)
  return derived ? { title: derived, ...data } : data
}

// --- store ----------------------------------------------------------------

// A GitHubStore that rewrites front matter and re-slugs a title-less post just before the commit; `onLocation` keeps the Location header in sync.
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

    // A workout routes to src/posts/activities/ with a dated filename and its own title, so it skips the generic title/slug path.
    if ('activityType' in data) {
      const { finalName, location } = workoutFile(filename, data)
      if (location && this.onLocation) this.onLocation(location)
      return this.inner.createFile(finalName, matter.stringify(parsed.content, data))
    }

    // Guarantee a `title` so the post isn't blank in <title>/OG/feeds/cards/p-name. The SAME title drives the slug for a title-less post, so filename, URL and <h1> all match; a titled post keeps its Obsidian filename instead.
    const titled = ensureTitle(data, parsed.content)

    // resolveFilename gives a titled post an Obsidian Title-Case filename and upgrades a title-less post's bare-timestamp slug, reporting the public URL so the Location header stays in sync.
    const { finalName, location } = resolveFilename(filename, data, parsed.content, titled.title)
    if (location && this.onLocation) this.onLocation(location)

    const fm = matter.stringify(parsed.content, titled)
    return this.inner.createFile(finalName, fm)
  }
}

// --- handler --------------------------------------------------------------

export const buildEndpoint = (onLocation) =>
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
