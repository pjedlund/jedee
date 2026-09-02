export const url = process.env.URL || 'http://localhost:8080';
export const siteName = 'Johan Edlund';
export const siteDescription = 'Personal site of Johan Edlund';
// Extract domain from `url`
export const domain = new URL(url).hostname;
// @until 1.0.0 — soft-launch: site-wide noindex,nofollow. Flip to false at go-live, alongside navigation.hideNav. (`visibility: unlisted` posts keep their own per-post noindex either way.)
export const noindexSite = true;
export const siteType = 'Person'; // schema
export const locale = 'en_EN';
export const lang = 'en';
export const skipContent = 'Skip to content';
// for the site content author, used in <head> meta and post h-card microformat
export const author = {
  name: 'Johan Edlund', // page / blog author's name. Must be set.
  avatar: '/avatar.webp', // path to the author's avatar.
  email: 'me@johanedlund.se', // email of the author
  website: 'https://johanedlund.se', // the personal site of the author (apex is canonical)
  // rel=me identities — the forward half of the bidirectional rel=me that powers IndieAuth. Each profile has to link back here.
  me: [
    'https://github.com/pjedlund',
    'https://mastodon.social/@pjedlund',
    'https://bsky.app/profile/johanedlund.se'
  ],
  fediverse: '@pjedlund@mastodon.social' // used for highlighting journalism on the fediverse. Can be Mastodon, Flipboard, Threads, WordPress (with the ActivityPub plugin installed), PeerTube, Pixelfed, etc. https://blog.joinmastodon.org/2024/07/highlighting-journalism-on-mastodon/
};
// for the site developer, used for footer credits and humans.txt info
export const creator = {
  name: 'Johan Edlund', // creator's (developer) name.
  email: 'me@johanedlund.se',
  website: 'https://johanedlund.se',
  bluesky: 'https://bsky.app/profile/johanedlund.se',
  mastodon: 'https://mastodon.social/@pjedlund',
  x: 'https://x.com/pjedlund'
};
export const pathToSvgLogo = 'src/assets/svg/misc/logo.svg'; // used for favicon generation
//Color Hunt Palette f4f4f2e8e8e8bbbfca495464.png
export const themeColor = '#495464'; // used in manifest, for example primary color value
export const themeLight = '#F4F4F2'; // used for meta tag theme-color, if light colors are prefered. best use value set for light bg
export const themeDark = '#bbbfca'; // used for meta tag theme-color, if dark colors are prefered. best use value set for dark bg
export const opengraph_default = '/assets/images/template/opengraph-default.jpg'; // fallback/default meta image
export const opengraph_default_alt = 'Johan Edlund — personal website'; // alt text for default meta image
export const blog = {
  // RSS feed
  name: 'Johan Edlund',
  description: 'Jesus Christ is the truth and the way.',
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
  navTooltip: 'Browse everything',
  ariaTop: 'Main',
  ariaBottom: 'Complementary',
  ariaPlatforms: 'Platforms',
  // Header chrome — three independent toggles (header.njk). breadcrumb: true = trail, false = logomark + wordmark. hideNav: see below.
  breadcrumb: true,
  nameReveal: true, // start page only: the wordmark types in beside the logomark, blinks twice, backspaces away (breadcrumb-reveal.css)
  hideNav: true // @until 1.0.0 — soft-launch: hides the main nav in PRODUCTION only — header.njk still shows it in `eleventy --serve`.
};
// Static label for the header light/dark toggle; aria-pressed carries the state.
export const themeToggleLabel = 'Toggle dark mode';
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
  allow: true,
  infoText: 'View this page on GitHub',
  issuesPage: 'Report accessibility issues'
};
export const easteregg = false;
