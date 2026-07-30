---
session_date: 2026-05-17
topic: jedee-base-reboot — brainstorm-only session; design spec drafted, no code touched
predecessor: _generated/handoff-2026-05-17-phase-d-and-drift-fix.md
design_spec: _generated/spec-2026-05-17-jedee-base-reboot.md
next_session: user reviews spec §4–§13 → approve → invoke superpowers:writing-plans for Phase 1 execution
---

> **Copied into JEDEE 2026-07-30 as reference, not as a live JEDEE handoff.** This is the **indiee** project's session handoff from 2026-05-17 (`/Users/johanedlund/Projects/__backup/indiee-phase-1`), kept because it records *why* the wiki layer was designed the way it was — the 8 questions closed and the one left open. The frontmatter above (`next_session`, the branch state, the "8 commits ahead") describes indiee in May, not JEDEE now; none of it is a JEDEE next step. The `design_spec:` it points at is in this folder as `Reference - indiee base reboot spec (LLM wiki layer).md`. Companion concept doc: `Reference - Karpathy LLM wiki concept.md`. The JEDEE-side idea this feeds is parked in `IDEAS.md`.

# Handoff — JEDEE-base reboot brainstorm landed (design spec drafted)

## TL;DR

Pure planning session, no commits, no code changes. We worked through `superpowers:brainstorming` for a major architectural pivot: indiee becomes **Obsidian-first, IndieKit-removed, with a Karpathy-style LLM-wiki layer**. All 8 foundational questions (Q1–Q7c/d) closed with explicit lock-ins. Execution approach **B** locked: a single structural-reboot PR (Phase 1) followed by 7 small feature PRs (Phase 2). The full design now lives at **[spec-2026-05-17-jedee-base-reboot.md][spec]** (13 sections, ~700 lines). `_generated/indiee-template-plan.md` got a supersession notice at the top pointing at the spec. ROADMAP.md M11 wording change is drafted in spec §11 but **not yet applied** — that lands as part of Phase 1 reboot PR, not this session. **Next session:** user reviews spec §4–§13 (only §1–§3 were interactively user-approved during the brainstorm), then we invoke `superpowers:writing-plans` to plan Phase 1 commits in detail. Branch is `main`, 8 commits ahead of `origin/main`, clean working tree.

## What landed this session

| Artifact | What |
|---|---|
| `_generated/spec-2026-05-17-jedee-base-reboot.md` | Full design spec — 13 sections. Supersedes plan §§1–5/8 and parts of §9–10. **§1–§3 user-approved interactively; §4–§13 drafted from locked decisions, pending review.** |
| `_generated/indiee-template-plan.md` (header only) | Top-of-file supersession notice pointing at the spec + listing which sections supersede vs. carry forward. |

No commits. No package.json / ROADMAP / source touches. `_generated/` is gitignored.

Branch state: `main`, 8 commits ahead of `origin/main` (Phase A/B/D + Obsidian-prep + drift-fix carried from prior session), clean working tree. User pushes manually — don't `git push`.

## Decisions locked during brainstorm

Settled state, captured in spec §1–§9 + §10:

- **Framing:** Obsidian-first (not Obsidian-friendly). Logseq/Foam/plain-editor are docs-only escape hatches.
- **Vault structure:** `src/` IS the vault (JEDEE/Tolstoy pattern). `src/__ideas/` dismissed.
- **AI substrate depth:** AI-aware *structure*, tooling-agnostic. Ship `AGENTS.md` + `_raw/` convention + `.gitignore` for `.claude/`/`.cursor/`/etc., not a specific agent runtime.
- **Wiki layer:** Published, feature-flagged off, backlinks yes, **graph view no** (Tolstoy-exclusive). Wikilinks already work cross-vault (JEDEE Phase B port).
- **Obsidian config:** 6 plugins (Git, Templater, frontmatter-modified-date, filename-heading-sync, local-images-plus, Periodic Notes). 7 Templater templates + 9 Web Clipper templates (split: blank-page origin → Templater; URL-sourced → Web Clipper).
- **Auth:** IndieAuth via indielogin.com — **always on, zero code, pure markup.**
- **Micropub:** Host-agnostic via `@benjifs/micropub` library + `@benjifs/github-store` + per-host adapters (Netlify Functions / Cloudflare Pages / Vercel). **`features.micropub: false` by default.**
- **Post types:** 16 total. Default-on (9): note, article, photo, reply, like, bookmark, watch, read, jam. Default-off (7): audio, repost, event, rsvp, **recipe**, **checkin**, **quotation** (last three are new).
- **Now page:** Dynamic via reusable `recent-activity.njk` partial. LLM-wiki integration deferred to v1.1+.
- **Execution:** Approach B — Phase 1 reboot PR + 7 incremental Phase 2 PRs (2a–2g).

## Open follow-ups

**Ship-blockers (0):** None. Spec is draft; next step is user review, not implementation.

**For next session's user review (7 — spec §13):**

- **§13.1 — `@benjifs/micropub` post-type coverage.** Library lists 7 native types; indiee needs 16. Verify reply/repost/rsvp/event/audio/watch/read/recipe/checkin/quotation routing during PR 2f planning before committing to library long-term.
- **§13.2 — Token endpoint choice.** `tokens.indieauth.com/token` still IndieWeb-canonical?
- **§13.3 — `AGENTS.md` content draft review.** Spec §6 outlines structure; full file authored in Phase 1.
- **§13.4 — `.obsidian/` scrub specifics.** Which JEDEE settings persist as indiee defaults? Per-line decision at PR time.
- **§13.5 — Sample wiki content.** Empty `_index.md` with explainer prose vs. pre-seeded sample entry?
- **§13.6 — Web Clipper template authoring order.** Greenfield in PR 2e; `raw.json` first, then post-type-specific?
- **§13.7 — CHANGELOG strategy.** v1.1.0-alpha during reboot, or stay on `1.1.0-dev`?

**Deferred design questions (in spec, but worth a re-look at PR time):**

- ROADMAP M11 acceptance criteria wording (spec §11 draft text vs. final).
- README reframe scope (full rewrite vs. surgical replacement of IndieKit sections).
- `_generated/archive/` — should the superseded plan sections move into archive after Phase 1 lands?

## Recommended sequencing for next session

**Don't dive into code.** The brainstorming skill's flow requires user review of the written spec *before* invoking writing-plans. Walk through spec §4–§13 with the user, capture any redirects, then call `superpowers:writing-plans` to break Phase 1 into commit-level steps.

If §4–§13 land clean, Phase 1 is one session's work (~6 commits, sequential). Phase 2's seven PRs are independent enough to schedule across subsequent sessions in any order, with the dependency hints in spec §10 honored.

If §4–§13 surface significant changes (e.g. wiki layer scope shrinks, AGENTS.md gets pared, Templater/Clipper template set changes), update the spec before writing-plans. The spec is the contract everything else checks against.

## Don't do

- Don't push without explicit instruction (8 commits ahead of `origin/main`).
- Don't `/ultrareview` (user-triggered, billed).
- Don't commit to `_generated/` (gitignored).
- Don't invoke `superpowers:writing-plans` before user has reviewed spec §4–§13.
- Don't touch ROADMAP.md M11 wording, package.json, or any source — those changes are Phase 1 reboot PR scope, not this session's or even next session's first step.
- Don't `git rm -rf src/` ahead of the user. The reset is Phase 1 commit #1, planned in detail by writing-plans.

## Skills the next session should reach for

- `superpowers:brainstorming` — already invoked; if §4–§13 surface big redirects, the spec gets updated and we loop back to brainstorming review.
- `superpowers:writing-plans` — the terminal-state skill the brainstorming flow points at. Invoke once §4–§13 are user-approved.
- `eleventy-excellent` — for any layout/config touch during Phase 1 execution.
- `cube-css` — when re-layering `assets/css/global/blocks/*` (webmentions.css, install-prompt.css) during commit #4 of Phase 1.
- `nice-permalinks` — wikilink resolver in the wiki layer (PR 2b).
- `nav-accessible` — for the `features.wiki` nav-entry wiring (PR 2b) and `Posts` dropdown changes (none planned, but if any of the new types get nav surface).

## Pointers

- Design spec (this session's primary artifact): [_generated/spec-2026-05-17-jedee-base-reboot.md][spec]
- Predecessor handoff (Phase D landed): [_generated/handoff-2026-05-17-phase-d-and-drift-fix.md][prev]
- Working plan (partially superseded — see top-of-file notice): [_generated/indiee-template-plan.md][plan]
- Public roadmap (M11 revision pending Phase 1): [ROADMAP.md][roadmap]
- Changelog: [CHANGELOG.md][changelog]
- Karpathy LLM Wiki concept doc: `/Users/johanedlund/My Agency/llm-wiki.md`
- `@benjifs/micropub` upstream: https://github.com/benjifs/micropub
- `@benjifs/github-store` upstream: https://github.com/benjifs/github-store
- JEDEE reference: `~/Projects/JEDEE/`

[spec]: ./spec-2026-05-17-jedee-base-reboot.md
[prev]: ./handoff-2026-05-17-phase-d-and-drift-fix.md
[plan]: ./indiee-template-plan.md
[roadmap]: ../ROADMAP.md
[changelog]: ../CHANGELOG.md

---

*Session length: long brainstorm (multi-turn, mostly question-and-answer). 0 commits landed. 1 design spec drafted (~700 lines). 1 supersession notice added to plan. 0 source files touched. Brainstorming flow at the "user reviews written spec" gate — next session's first action is review §4–§13, then writing-plans.*
