import 'dotenv/config'; // ⚠ config-time importers (the webmentions filter) load this before eleventy.config.js reads .env
import fs from 'node:fs';
import {load as yamlLoad} from 'js-yaml';

// The values live in settings.yaml; this file gives them Lene's names so her templates still fit. ⚠ Named exports only — a default export here is silently ignored.
// ⚠ settings.yaml has no comments on purpose: Sveltia (/admin/ → Site settings) drops them on save. Its notes are the hints in admin/config.yml.
export const settings = yamlLoad(fs.readFileSync(new URL('./settings.yaml', import.meta.url), 'utf8'));
const {identity, profiles, switches} = settings;
const relMe = Object.values(profiles).filter(profile => profile.relMe).map(profile => profile.url);

export const url = process.env.URL || 'http://localhost:8080';
export const siteName = identity.name;
export const siteDescription = identity.description;
// Extract domain from `url`
export const domain = new URL(url).hostname;
// The canonical host name from settings — unlike `domain`, never `localhost`.
export const siteDomain = new URL(identity.website).hostname;
export const noindexSite = switches.noindexSite;
export const siteType = 'Person'; // schema
export const locale = 'en_EN';
export const lang = 'en';
export const skipContent = 'Skip to content';
// for the site content author, used in <head> meta and post h-card microformat
export const author = {
  name: identity.name, // page / blog author's name. Must be set.
  avatar: identity.avatar, // path to the author's avatar.
  email: identity.email, // email of the author
  website: identity.website, // the personal site of the author (apex is canonical)
  me: relMe, // rel=me identities — the forward half of the bidirectional rel=me that powers IndieAuth
  fediverse: profiles.mastodon?.handle // used for highlighting journalism on the fediverse. Can be Mastodon, Flipboard, Threads, WordPress (with the ActivityPub plugin installed), PeerTube, Pixelfed, etc. https://blog.joinmastodon.org/2024/07/highlighting-journalism-on-mastodon/
};
// for the site developer, used for footer credits and humans.txt info
export const creator = {
  name: identity.name, // creator's (developer) name.
  email: identity.email,
  website: identity.website,
  bluesky: profiles.bluesky?.url,
  mastodon: profiles.mastodon?.url,
  x: profiles.x?.url
};
export const pathToSvgLogo = 'src/assets/svg/misc/logo.svg'; // used for favicon generation
//Color Hunt Palette f4f4f2e8e8e8bbbfca495464.png
export const themeColor = '#495464'; // base-darkest — the brand tone; manifest theme_color, so it paints the splash and the app-switcher card
export const themeLight = '#F4F4F2'; // base-lightest — <meta theme-color> in light mode, the manifest's background_color, and the knockout mark on the app icons
export const themeDark = themeColor; // <meta theme-color> in dark mode; the same brand tone, since a pale band over a near-black page read as a leftover
export const opengraph_default = '/assets/images/template/opengraph-default.jpg'; // fallback/default meta image
export const opengraph_default_alt = 'Johan Edlund — personal website'; // alt text for default meta image
export const blog = {
  // RSS feed
  name: identity.name,
  description: identity.feedDescription,
  // feed links are looped over in the head. You may add more to the array.
  feedLinks: [
    {
      title: 'Atom Feed',
      url: '/feed.xml',
      type: 'application/atom+xml'
    },
    {
      title: 'JSON Feed',
      url: '/feed.json',
      type: 'application/json'
    }
  ],
  // Tags
  tagSingle: 'Tag',
  tagPlural: 'Tags',
  tagMore: 'More tags:',
  // Genres — the jam-only index at /jams/genres/, deliberately separate from tags
  genreSingle: 'Genre',
  genrePlural: 'Genres',
  genreMore: 'More genres:',
  // pagination
  paginationLabel: 'Articles',
  paginationPage: 'Page',
  paginationPrevious: 'Previous',
  paginationNext: 'Next',
  paginationNumbers: true
};
export const details = {
  aria: 'section controls',
  expand: 'expand all',
  collapse: 'collapse all'
};
export const dialog = {
  close: 'Close',
  next: 'Next',
  previous: 'Previous'
};
export const navigation = {
  navLabel: 'Menu',
  homeTooltip: 'Home',
  ariaTop: 'Main',
  ariaBottom: 'Complementary',
  ariaPlatforms: 'Platforms',
  // Header chrome — three independent switches (header.njk), set in settings.yaml.
  breadcrumb: switches.breadcrumb,
  nameReveal: switches.nameReveal,
  hideNav: switches.hideNav
};
// Static ACCESSIBLE NAME for the header light/dark toggle; aria-pressed carries the state. ⚠ Don't make this change with the theme — a toggle button's name must stay put, or screen readers announce the state twice and disagree with themselves.
export const themeToggleLabel = 'Toggle dark mode';
// Visible tooltip only, so it may say what a click WILL do. Swapped by theme-toggle.js on every theme change.
export const themeToggleTooltip = {
  toDark: 'Show dark mode',
  toLight: 'Show light mode'
};
// Site search copy. The magnifier is icon-only, so `toggleLabel` is its accessible name.
export const search = {
  toggleLabel: 'Search this site',
  // Visible tooltip only. Shorter than the accessible name, which stays specific.
  toggleTooltip: 'Search',
  inputLabel: 'Search',
  placeholder: 'Search…',
  clearLabel: 'Clear search',
  resultsLabel: 'Search results',
  more: 'more matches',
  empty: 'Nothing found.'
};
// IndieWeb endpoints, discovered via <link rel> in the <head>. Auth is delegated to hosted IndieAuth — this site runs no auth server, it only verifies the bearer token.
export const indieweb = {
  micropub: `${url}/api/micropub`,
  authorizationEndpoint: 'https://indieauth.com/auth',
  tokenEndpoint: 'https://tokens.indieauth.com/token'
};
// Received webmentions, fetched build-time by _data/webmentions.js. Set WEBMENTION_IO_TOKEN (.env-sample) to activate; until then the section renders empty.
export const webmentions = {
  fallbackAvatar: '/assets/images/template/webmention-avatar.svg'
};
// Geoapify static maps for photo posts, fetched and self-hosted at build time, so the key never reaches the page. Set MAP_API_KEY (.env + Netlify) to activate; until then the place name links to OpenStreetMap instead.
export const mapApiKey = process.env.MAP_API_KEY || '';
export const greenweb = {
  // https://carbontxt.org/
  disclosures: [
    {
      docType: 'sustainability-page',
      url: `${url}/sustainability/`,
      domain: domain
    }
  ],
  services: [{domain: 'netlify.com', serviceType: 'cdn'}]
};
export const tests = {
  pa11y: {
    // Empty = test all pages. Four layout shapes are covered: chrome-and-prose (the first four), a media post (/audio/), a very long index inside a custom element (/activities/), and a post whose image opens in the lightbox (/jams/).
    // ⚠ Keep this list in step by hand when a post is renamed or deleted — a path that no longer exists scores zero errors and passes silently.
    customPaths: ['/', '/about/', '/articles/', '/styleguide/', '/audio/nybrostrand-beach/', '/activities/', '/jams/50ft-queenie/', '/reading/what-is-art/', '/watching/paris-texas/'],
    globalIgnore: [],
    // Point pa11y at an already-installed Chrome. Do not empty this: puppeteer then hunts for its own pinned build and fails with "Could not find Chrome (ver. …)" — see the wiki, "The accessibility test". Override with PA11Y_CHROME= where Chrome lives elsewhere.
    chromePath: process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
};
export const viewRepo = {
  // this is for the view/edit on github link. The value in the package.json will be pulled in.
  allow: switches.viewRepo,
  infoText: 'View this page on GitHub',
  issuesPage: 'Report accessibility issues'
};
export const easteregg = switches.easteregg;
export const eastereggKeyword = switches.eastereggKeyword; // empty = the starter's "eleventy" and "excellent"
export const eastereggShape = switches.eastereggShape; // empty = the starter's ⭐️
