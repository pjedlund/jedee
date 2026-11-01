// Last look at each finished page: what the page turned out not to use comes out here. ⚠ Register after the WebC plugin, or an embed is still <custom-youtube> and not yet an <is-land>, and islands silently never start.

const IS_LAND_SCRIPT = /<script\b[^>]*\bis-land\.min\.js[^>]*><\/script>\s*/;

const SPECULATION_RULES = /<script\b[^>]*\bspeculationrules\b[^>]*>[\s\S]*?<\/script>\s*/;
const LINK_ON_THE_SITE = /<a\b[^>]*\shref=(?!["']?(?:https?:|\/\/|#|mailto:|tel:))/i;

export const finishPage = html => {
  let page = html;
  if (!page.includes('<is-land')) page = page.replace(IS_LAND_SCRIPT, '');
  if (!LINK_ON_THE_SITE.test(page)) page = page.replace(SPECULATION_RULES, '');
  return page;
};

export const finishedPage = eleventyConfig => {
  eleventyConfig.addTransform('finished-page', (content, path) => (path && path.endsWith('.html') ? finishPage(content) : content));
};
