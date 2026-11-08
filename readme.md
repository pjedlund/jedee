# johanedlund.se

Personal website using [Eleventy](https://www.11ty.dev) and [Eleventy Excellent](https://github.com/madrilene/eleventy-excellent). Live at [johanedlund.se](https://johanedlund.se), soft-launched: the pages carry `noindex` until the full launch.

[![Netlify Status](https://api.netlify.com/api/v1/badges/16a0708e-b099-42ec-9e83-7944cf836e62/deploy-status)](https://app.netlify.com/projects/johanedlundse/deploys)

## Running it

Node 24 (see `.nvmrc`), then `npm install`.

- `npm start` runs the dev server on http://localhost:8080
- `npm run build` builds the site into `dist/`
- `npm run test:unit` runs the tests in `tests/`

How the site is put together (folders, post types, themes, design tokens, the wiki) is in [AGENTS.md](AGENTS.md).
