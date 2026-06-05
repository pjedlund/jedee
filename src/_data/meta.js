export const url = process.env.URL || 'http://localhost:8080';
export const siteName = 'Johan Edlund';
export const siteDescription = 'Personal site of Johan Edlund';
// Extract domain from `url`
export const domain = new URL(url).hostname;
// Soft-launch: emit a site-wide noindex,nofollow (head/meta-info.njk). Flip to
// false at 1.0.0 go-live (alongside navigation.hideNav). `visibility: unlisted`
// posts carry their own per-post `noindex` regardless, so they stay out of the
// index after launch (see _config/plugins/drafts.js).
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
  // rel=me identities — looped into <link rel="me"> in head/meta-info.njk; the
  // forward half of bidirectional rel=me that powers IndieAuth / RelMeAuth.
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
  ariaTop: 'Main',
  ariaBottom: 'Complementary',
  ariaPlatforms: 'Platforms',
  drawerNav: true,
  subMenu: true,
  hideNav: true // soft-launch: hide the main nav in PRODUCTION (header keeps logo + skip-link); header.njk still reveals it in `eleventy --serve` for local dev. Flip to false at 1.0.0 to show everywhere.
};
export const themeSwitch = {
  title: 'Theme',
  light: 'light',
  dark: 'dark'
};
// IndieWeb endpoints, discovered via <link rel> in the <head> (see
// _includes/head/meta-info.njk). The Micropub server is this site's Netlify
// Function at /api/micropub; auth is fully delegated to hosted IndieAuth
// services — this site runs no auth server, it only verifies the bearer token.
// micropub tracks `url` so the link points at whatever domain the deploy serves.
export const indieweb = {
  micropub: `${url}/api/micropub`,
  authorizationEndpoint: 'https://indieauth.com/auth',
  tokenEndpoint: 'https://tokens.indieauth.com/token'
};
// Received webmentions (Phase 2). Fetched build-time by _data/webmentions.js and
// rendered statically by partials/webmentions.njk on article/note/photo pages.
// The webmention.io account domain is `domain` (apex, derived from `url` above) —
// reused, not duplicated. `fallbackAvatar` is shown for a mention whose author
// has no photo. Activate live fetching by setting WEBMENTION_IO_TOKEN (see
// .env-sample); until then the section renders empty everywhere.
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
    // keep customPaths empty if you want to test all pages
    customPaths: ['/', '/about/', '/articles/', '/styleguide/'],
    globalIgnore: []
  }
};
export const viewRepo = {
  // this is for the view/edit on github link. The value in the package.json will be pulled in.
  allow: true,
  infoText: 'View this page on GitHub',
  issuesPage: 'Report accessibility issues'
};
export const easteregg = false;
