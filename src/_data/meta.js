import 'dotenv/config'; // ⚠ config-time importers (the webmentions filter) load this before eleventy.config.js reads .env
import fs from 'node:fs';
import {load as yamlLoad} from 'js-yaml';
import {loadLogo, loadThemeConfig, themeDir, themeName} from '../_config/utils/theme.js';
import {loadWords, siteSettings} from '../_config/utils/site.js';
import {resolveSwitches} from '../_config/utils/switches.js';

// The values live in settings.yaml; this file gives them Lene's names so her templates still fit. ⚠ Named exports only — a default export here is silently ignored.
// ⚠ settings.yaml has no comments on purpose: Sveltia (/admin/ → Site settings) drops them on save. Its notes are the hints in admin/config.yml.
export const settings = yamlLoad(fs.readFileSync(new URL('./settings.yaml', import.meta.url), 'utf8'));
const {identity, profiles} = settings;
const flags = settings.switches ?? {};
// The parts of the site that are on unless settings say false (utils/switches.js); `flags` holds the rest of settings.switches under their own names below.
export const switches = resolveSwitches(settings);
const site = siteSettings();
const words = loadWords();
const relMe = Object.values(profiles).filter(profile => profile.relMe).map(profile => profile.url);

export const url = process.env.URL || 'http://localhost:8080';
export const siteName = identity.name;
export const siteDescription = identity.description;
// Extract domain from `url`
export const domain = new URL(url).hostname;
// The canonical host name from settings — unlike `domain`, never `localhost`.
export const siteDomain = new URL(identity.website).hostname;
export const noindexSite = flags.noindexSite;
export const siteType = site.type; // schema: Person or Organization
export const locale = site.locale;
export const lang = site.lang;
export const skipContent = words.skipContent;
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
export const pathToSvgLogo = `${themeDir()}/logo.svg`; // used for favicon generation and the share cards
export const logoMark = loadLogo().match(/\sd="([^"]+)"/)[1]; // the logo's outline, for the generated share cards
// The active theme's folder name; templates reach its files by "themes/" + meta.theme + "/home.njk".
export const theme = themeName();
const themeConfig = loadThemeConfig();
export const themeColor = themeConfig.themeColor; // the brand tone; manifest theme_color, so it paints the splash and the app-switcher card
export const themeLight = themeConfig.themeLight; // <meta theme-color> in light mode, the manifest's background_color, and the knockout mark on the app icons
export const themeDark = themeConfig.themeDark; // <meta theme-color> in dark mode
export const themePreloads = themeConfig.preloads; // font files head/preloads.njk asks for early
export const themeOg = themeConfig.og; // share cards: colours, font names and files
export const opengraph_default = '/assets/images/template/opengraph-default.jpg'; // fallback/default meta image
export const opengraph_default_alt = identity.ogAlt || identity.description; // alt text for default meta image
export const blog = {
  // RSS feed
  name: identity.name,
  description: identity.feedDescription,
  // feed links are looped over in the head. You may add more to the array.
  feedLinks: [
    {
      title: words.feedAtom,
      url: '/feed.xml',
      type: 'application/atom+xml'
    },
    {
      title: words.feedJson,
      url: '/feed.json',
      type: 'application/json'
    }
  ],
  // Tags
  tagSingle: words.tagSingle,
  tagPlural: words.tagPlural,
  tagMore: words.tagMore,
  // Genres — the jam-only index at /jams/genres/, deliberately separate from tags
  genreSingle: words.genreSingle,
  genrePlural: words.genrePlural,
  genreMore: words.genreMore,
  // pagination
  paginationLabel: words.paginationLabel,
  paginationPage: words.paginationPage,
  paginationPrevious: words.previous,
  paginationNext: words.next,
  paginationNumbers: true
};
export const dialog = {
  close: words.close,
  next: words.next,
  previous: words.previous
};
// ⚠ SHOW_HIDDEN=1 turns hideNav and hideFeatured off so a test build can see the menu and Featured; leave it unset in production.
const showHidden = Boolean(process.env.SHOW_HIDDEN);
export const navigation = {
  navLabel: words.menu,
  homeTooltip: words.home,
  ariaTop: words.navMain,
  ariaBottom: words.navComplementary,
  ariaPlatforms: words.navPlatforms,
  // Header chrome — three independent switches (header.njk), set in settings.yaml.
  breadcrumb: switches.breadcrumb,
  nameReveal: flags.nameReveal,
  hideNav: flags.hideNav && !showHidden
};
export const hideFeatured = flags.hideFeatured && !showHidden;
// Static ACCESSIBLE NAME for the header light/dark toggle; aria-pressed carries the state. ⚠ Don't make this change with the theme — a toggle button's name must stay put, or screen readers announce the state twice and disagree with themselves.
export const themeToggleLabel = words.themeToggle;
// Visible tooltip only, so it may say what a click WILL do. Swapped by theme-toggle.js on every theme change.
export const themeToggleTooltip = {
  toDark: words.showDark,
  toLight: words.showLight
};
// Site search copy. The magnifier is icon-only, so `toggleLabel` is its accessible name.
export const search = {
  toggleLabel: words.searchThisSite,
  // Visible tooltip only. Shorter than the accessible name, which stays specific.
  toggleTooltip: words.search,
  inputLabel: words.search,
  placeholder: words.searchPlaceholder,
  clearLabel: words.searchClear,
  resultsLabel: words.searchResults,
  more: words.searchMore,
  empty: words.searchEmpty
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
    customPaths: ['/', '/accessibility/', '/articles/', '/design-system/', '/audio/nybrostrand-beach/', '/activities/', '/jams/50ft-queenie/', '/reading/a-confession/', '/watching/the-killing/', '/now/'],
    globalIgnore: [],
    // Point pa11y at an already-installed Chrome. Do not empty this: puppeteer then hunts for its own pinned build and fails with "Could not find Chrome (ver. …)" — see the wiki, "The accessibility test". Override with PA11Y_CHROME= where Chrome lives elsewhere.
    chromePath: process.env.PA11Y_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
};
export const viewRepo = {
  // this is for the view/edit on github link. The value in the package.json will be pulled in.
  allow: flags.viewRepo,
  infoText: words.viewOnGithub,
  issuesPage: words.reportAccessibility
};
export const easteregg = switches.easteregg;
export const eastereggKeyword = flags.eastereggKeyword; // empty = the starter's "eleventy" and "excellent"
export const eastereggShape = flags.eastereggShape; // empty = the starter's ⭐️
