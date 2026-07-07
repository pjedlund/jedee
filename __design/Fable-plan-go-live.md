# Fable plan — 1.0.0 go-live (drop noindex, restore nav, start sending webmentions)

**Goal:** take johanedlund.se from soft-launch (nav hidden, site-wide `noindex`) to the full 1.0.0 launch. The code side is two boolean flips plus a version bump; most of the launch is a verified checklist, split explicitly between **agent steps** and **Johan-only steps**.

**Context:** the site has been live on the apex domain since 2026-05-31 in soft-launch mode. The 1.0.0 definition was locked then: drop `noindex` + restore the nav (see memory `project_jedee_go_live`, `TODO.md` §6b/§7). Micropub, inbound webmentions, feeds, and the content pipeline are all already live and verified.

**Precondition (Johan decides):** this plan executes the launch; it does not decide launch readiness. Suggested but not required first: the CLS-free masonry plan (`Fable-plan-masonry-cls.md`), so the front page is at its best when crawlers arrive — and because a Lighthouse 400 only becomes possible once `noindex` is gone.

---

## House rules

- Commit on a branch (suggested: `release/1.0.0`); merge into `main` locally with `--no-ff`. **Never `git push` / never create PRs — Johan pushes.** No `Co-Authored-By` trailer.
- Node 22: `source ~/.nvm/nvm.sh && nvm use` before builds.
- `npm run build` clobbers the dev server's `dist/` — restart `npm start` afterwards if one was running.
- US English. Update `TODO.md` (§6b, §7, the go-live open question) and `LOG.md`; both are gitignored — edit, don't commit.
- Invoke the `eleventy-excellent` skill before template edits, `indieweb` before touching anything webmention/rel=me-related, `netlify` if any deploy config question comes up. (This plan should need no CSS.)

## Files to touch (agent)

1. `src/_data/meta.js` — two flips:
   - line ~10: `export const noindexSite = true;` → `false` (keep the explanatory comment, updated to past tense).
   - line ~96 (inside `navigation`): `hideNav: true` → `false` (update its trailing comment).
   - **Do NOT touch** `breadcrumb: true` — it is an independent toggle and stays.
2. `package.json` — `"version": "0.9.0"` → `"1.0.0"` via `npm pkg set version=1.0.0`, then `npm install --package-lock-only` so `package-lock.json` matches. Do **not** use `npm version` (it creates a git tag as a side effect; tagging is Johan's call).
3. No other code files. In particular **do not touch** `src/_config/plugins/drafts.js` (it computes the per-post `noindex` for `visibility: unlisted` posts — that mechanism must survive the site-wide flip) and **do not touch** `src/_includes/head/meta-info.njk` (its `{% if meta.noindexSite or noindex %}` guard is already correct for both states).

## Agent steps, in order

1. Branch `release/1.0.0`. Make the three edits above.
2. `npm run build` (production). Verify in `dist/`:
   - `grep -L 'name="robots"' dist/index.html` — the robots/googlebot noindex meta pair must be **gone** from the front page (and from a couple of post pages).
   - `grep -rl 'noindex' dist/**/index.html` — if any page still carries it, it must be a `visibility: unlisted` post and nothing else. (As of writing there are **no** published unlisted posts, so the expected result is zero pages; if that's what you find, note it and move on.)
   - `dist/index.html` contains the main nav markup (grep for `main-nav` or the nav landmark) — the header previously omitted it in production builds.
   - `dist/robots.txt` still exists and is unchanged (it never carried the noindex; the block was a meta tag).
   - `dist/sitemap.xml` still lists pages (unchanged by this work).
3. `npm run test:unit` — all tests must pass (105 as of writing).
4. `npm run test:a11y` — **this matters more than usual**: the production-mode pa11y pages now include the visible main nav for the first time. If pa11y surfaces nav-related errors, fix them **with the `nav-accessible` skill invoked first** (the nav is built on Manuel Matuzović's pattern; don't freelance). The known pre-existing styleguide icon-link error is acceptable.
5. Optional but cheap: run Lighthouse mobile on the built front page — SEO should now reach 100 (the indexing audit passes). Record the score in `LOG.md`.
6. Commit(s), merge `--no-ff` to `main`, update `TODO.md`/`LOG.md`. **Stop here — do not push.** Print Johan's checklist (below) as the final output.

## Johan-only steps (the agent prints these, does not do them)

1. **Push `main`.** Netlify auto-deploys. Note: `meta.url` = `process.env.URL` is baked at build time — the deploy itself refreshes it; no env change is needed since the site already builds on the apex.
2. **Spot-check production:** view-source on `https://johanedlund.se/` — no `noindex` meta, nav visible; click through the mega-menu.
3. **Register outbound webmentions** at [webmention.app](https://webmention.app): sign in with `johanedlund.se` (RelMeAuth via the GitHub `rel=me` — already wired and proven to work), register `https://johanedlund.se/feed.xml` (the firehose Atom feed; it embeds full content and carries every outbound-linking post type — verified 2026-06-06). ⚠️ Only posts added **after** registration auto-send; back-send any earlier post via `https://webmention.app/check?url=<post-url>`.
4. **Verify sending** against [webmention.rocks](https://webmention.rocks) before trusting real targets; then send a real like/reply to an IndieWeb site and confirm it lands.
5. Optional immediacy: Netlify → *Deploy succeeded* outgoing webhook → the webmention.app check endpoint + token, so posts send on deploy instead of within the hour. (Netlify UI only.)
6. Optional: `git tag 1.0.0` and push the tag; announce the site wherever feels right.

## Edge cases a weaker model would miss

- **`hideNav` only hides the nav in production builds** — `header.njk` reveals it in `eleventy --serve` regardless. So "the nav looks fine in dev" proves nothing; every nav check must be against `dist/` from a production build.
- **Per-post noindex must survive.** `meta-info.njk` line ~18 is `{% if meta.noindexSite or noindex %}` — the second operand is the per-post flag from `visibility: unlisted` (drafts.js). Flipping the site flag must not remove that logic.
- **`npm version` auto-tags git** — use `npm pkg set` instead (step above).
- **The pa11y run builds with `ELEVENTY_ENV=test`**, which behaves like production for `hideNav` — meaning the a11y suite has never exercised the visible nav + mega-menu in CI-like conditions before this change. Budget time for surprises there.
- **Nothing about DNS or Netlify domains changes** — the site is already served on the apex. The only deploy-side effect of pushing is a rebuild.
- **The two feed URLs used by webmention.app and podcast apps must not be reshuffled in the same release.** If the per-section-feeds plan (`Fable-plan-section-feeds.md`) runs, run it **before** go-live (it renames `/audio/feed.xml` → `/audio/podcast.xml` while nobody is subscribed) or well after — not simultaneously.

## Acceptance criteria

1. Production build of `main`: no `noindex`/`nofollow` robots meta on regular pages; main nav present in the HTML of every page; `breadcrumb` unchanged.
2. `package.json` + `package-lock.json` both say `1.0.0`.
3. `npm run test:unit` green; `npm run test:a11y` green (modulo the known styleguide icon-link).
4. Lighthouse SEO on `/` = 100 against the local production build.
5. Merged to `main` `--no-ff`, **unpushed**; Johan's checklist printed verbatim at the end of the run; `TODO.md` §6b/§7 and `LOG.md` updated.
