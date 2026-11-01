# stomme

Stomme is a frame to build a small website on: the shared files for a site, with no posts in them. It is made from the working parts of a personal website and stands on [Eleventy](https://www.11ty.dev) and on [Eleventy Excellent](https://github.com/madrilene/eleventy-excellent) by Lene Saile, which supplies most of its structure. The chain runs from Eleventy Excellent to stomme, and from stomme to each site.

## Run it

Use the Node version in `.nvmrc`, then `npm ci` and `npm start` for the dev server at http://localhost:8080. `npm run build` makes the published site in `dist/`, and `npm run test:unit` runs the tests.

## How a site takes updates

A site adds stomme as a remote named `upstream`. Its first merge is always `git merge --allow-unrelated-histories -s ours upstream/main`, never a plain merge, so the histories join while every file in the site stays as it was. After that an ordinary `git merge upstream/main` brings updates in. `npm run compare:upstream` lists any shared file that has come to differ from stomme.

When stomme changes `src/_data/settings.yaml`, a site keeps its file and adds any new line by hand.

## Site files

These belong to one site, and each site replaces them; everything else is shared. The list is `tests/site-files.json`.

- Content: `src/posts/**/*.md`, `src/_raw/**`
- Pages: about, accessibility, ai, colophon, legal, now, privacy and sustainability in `src/pages/`
- Data: `settings.yaml`, `featured.yaml`, `jamSocial.json`, `genreDescriptions.json` and `navigation.js` in `src/_data/`
- Pictures: the share picture `src/assets/images/template/opengraph-default.jpg`, and `src/assets/images/favicon/`, `demo/` and `src/assets/og-images/`
- Project: `admin/config.yml`, `package.json`, `package-lock.json`, `readme.md`, `LICENSE`, `tests/site-files.json`, `tests/compare-sample.json`

A site also adds its theme folder and its image folders to its copy of the list.

## Licence

A public domain dedication, with the notices for Eleventy Excellent and Cube Boilerplate in `LICENSE`.
