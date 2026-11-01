// Bare host of a URL for display (no protocol, `www.` or path); "" on bad input so callers can `or` a fallback.
//   "https://www.miriamsuzanne.com/2022/06/04/indiweb/" -> "miriamsuzanne.com"
//   undefined / "" / not-a-URL                          -> ""

export const hostname = value => {
  if (!value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
