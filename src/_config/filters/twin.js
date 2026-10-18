/** The page's other-language version: the page its `translation:` URL names, or the page whose `translation:` names this one. */
export const twinOf = (all, url, translation) =>
  all.find(item => (translation ? item.url === translation : item.data.translation === url));
