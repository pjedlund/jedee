---
name: jedee-design
description: Use this skill to design and build interfaces in the JEDEE brand (johanedlund.se) — the personal indieweb site of Johan Edlund. Carries the site's real compiled stylesheet, its self-hosted fonts, and preview pages for the tokens and components.
user-invocable: true
---

Read `README.md` first — it holds the voice, the visual principles, and the rules. Then open the preview pages for any value you need: they read their swatches out of the live stylesheet, so they are always current, and no token value is written down anywhere else.

`jedee.css` is the site's own compiled stylesheet, copied verbatim. Link it and use its class names and custom properties directly rather than re-deriving them — `.button`, `.prose`, `.flow`, `.wrapper`, `.cluster`, `<custom-card>` and the rest already exist there.

For a throwaway prototype or a visual artifact, copy `jedee.css` and the `fonts/` folder out and build static HTML against them. For production work on the site itself, treat this as reference only — the source of truth is the repo, where the tokens live in `src/_data/designTokens/*.json` and the CSS is CUBE-structured under `src/assets/css/`.

If the user invokes this skill without further guidance, ask what they want to build, ask a couple of real questions about it, and then design it in this brand.
