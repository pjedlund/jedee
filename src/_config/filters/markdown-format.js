// by Chris Burnell: https://chrisburnell.com/article/some-eleventy-filters/#markdown-format

import markdownParser from 'markdown-it';

const markdown = markdownParser();

export const markdownFormat = input => {
  // Clipped / Micropub content — and Obsidian's vault-wide property-type registry — can hand us arrays or non-strings where a string is expected (e.g. a `description` typed as "List" gets split on commas into an array). markdown-it's render() throws "Input data should be a String" on anything that isn't a string, so coerce first.
  if (input == null) return '';
  const string = Array.isArray(input) ? input.join(', ') : String(input);
  return markdown.render(string);
};
