// HOSTNAME
// Bare host of a URL for display: no protocol, no leading `www.`, no path.
// Used by the bookmark breadcrumb leaf to show "Title on miriamsuzanne.com"
// when a bookmark has only a `sourceUrl`/`bookmarkOf` and no human `sourceName`.
//
//   "https://www.miriamsuzanne.com/2022/06/04/indiweb/" -> "miriamsuzanne.com"
//   "https://example.com"                               -> "example.com"
//   undefined / "" / not-a-URL                          -> ""
//
// ponytail: stdlib URL parser, correct on edge cases Nunjucks string-replace
// can't reach (no `split` filter to cut the path). Returns "" on bad input so
// callers can `or` a fallback.

export const hostname = value => {
  if (!value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
