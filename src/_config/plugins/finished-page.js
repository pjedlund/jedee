import { logoDataSvg } from '../utils/theme.js';

// Last look at each finished page: what the page turned out not to use comes out here, and the theme's logo goes in where a component left room for it. ⚠ Register after the WebC plugin, or an embed is still <custom-youtube> and not yet an <is-land>, and islands silently never start.

const IS_LAND_SCRIPT = /<script\b[^>]*\bis-land\.min\.js[^>]*><\/script>\s*/;

const SPECULATION_RULES = /<script\b[^>]*\bspeculationrules\b[^>]*>[\s\S]*?<\/script>\s*/;
const LINK_ON_THE_SITE = /<a\b[^>]*\shref=(?!["']?(?:https?:|\/\/|#|mailto:|tel:))/i;

// A WebC <style> can't take a value from data, so the YouTube embed leaves a placeholder. Mid-gray at 10% reads on a light and a dark sheet.
const youtubeMark = () => `url("data:image/svg+xml,${logoDataSvg(undefined, " fill='%23808080' fill-opacity='.1'").replaceAll('<', '%3C').replaceAll('>', '%3E')}")`;

export const finishPage = html => {
  let page = html;
  if (page.includes('__THEME_LOGO_MARK__')) page = page.replaceAll('__THEME_LOGO_MARK__', youtubeMark());
  if (!page.includes('<is-land')) page = page.replace(IS_LAND_SCRIPT, '');
  if (!LINK_ON_THE_SITE.test(page)) page = page.replace(SPECULATION_RULES, '');
  return page;
};

export const finishedPage = (eleventyConfig, { maps } = {}) => {
  let mapsWithoutTiles = 0;
  eleventyConfig.addTransform('finished-page', (content, path) => {
    if (!path || !path.endsWith('.html')) return content;
    if (!maps?.tiles && content.includes('<place-map')) mapsWithoutTiles++;
    return finishPage(content);
  });
  eleventyConfig.on('eleventy.after', () => {
    if (mapsWithoutTiles) console.log(`[maps] ${mapsWithoutTiles} page(s) use <place-map>, but settings.maps.tiles is empty, so they show no map. See the wiki "The place map".`);
    mapsWithoutTiles = 0;
  });
};
