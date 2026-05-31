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
//                    folder JSON), merged `tags`, and a content-derived slug for
//                    title-less posts so notes/replies get clean URLs, not a
//                    bare timestamp.
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
// these are the target-URL keys it leaves hyphenated. watch/read/listen map to
// url/link/source — confirmed against src/_layouts/{watching,reading,jam}.njk.
export const KEY_MAP = {
  'in-reply-to': 'inReplyTo',
  'like-of': 'likeOf',
  'bookmark-of': 'bookmarkOf',
  'repost-of': 'repostOf',
  'watch-of': 'url',
  'read-of': 'link',
  'listen-of': 'source'
}

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

// First ~10 words of the body, slugified and capped — for title-less notes.
export const contentSlug = (body = '') => {
  const s = slugify(body).split('-').filter(Boolean).slice(0, 10).join('-')
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
  for (const [key, value] of Object.entries(data)) {
    if (key === 'content' || key === 'access_token') continue // body, secret
    if (key === 'type' || key === 'client_id') continue // mf2/engine noise
    if (key.startsWith('mp-')) continue // client directives (mp-slug, mp-syndicate-to…)

    if (key === 'post-status') {
      if (value === 'draft') out.draft = true // else published -> omit (publish on commit)
      continue
    }
    if (KEY_MAP[key]) {
      out[KEY_MAP[key]] = flatten(value)
      continue
    }
    out[key] = value
  }

  // tags: keep the firehose tag so the post stays in collections.posts and the
  // feeds, and keep any user tags (engine mapped Micropub `category` -> `tags`).
  if ('tags' in out) {
    const user = (Array.isArray(out.tags) ? out.tags : [out.tags]).filter(Boolean)
    if (user.length) out.tags = [...new Set([FIREHOSE_TAG, ...user])]
    else delete out.tags // inherit tags:"posts" from the folder JSON
  }

  return out
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

    // filename arrives as `${CONTENT_DIR}/<folder>/<slug>.md`. A bare unix-
    // timestamp slug means a title-less post (note/reply/…) the engine had
    // nothing to name from — derive a nicer slug from the body, then the target
    // URL, else keep the timestamp.
    let finalName = filename
    const m = filename.match(/^(.*)\/([^/]+)\/([^/]+)\.md$/)
    if (m) {
      const [, dir, folder, slug] = m
      if (/^\d+$/.test(slug)) {
        const better = contentSlug(parsed.content) || targetSlug(data)
        if (better) {
          finalName = `${dir}/${folder}/${better}.md`
          if (ME && this.onLocation) {
            this.onLocation(`${ME.replace(/\/$/, '')}/${folder}/${better}`)
          }
        }
      }
    }

    const fm = matter.stringify(parsed.content, data)
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
