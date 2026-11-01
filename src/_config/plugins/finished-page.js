// Last look at each finished page: what the page turned out not to use comes out here. ⚠ Register after the WebC plugin, or an embed is still <custom-youtube> and not yet an <is-land>, and islands silently never start.

const IS_LAND_SCRIPT = /<script\b[^>]*\bis-land\.min\.js[^>]*><\/script>\s*/;

export const finishPage = html => (html.includes('<is-land') ? html : html.replace(IS_LAND_SCRIPT, ''));

export const finishedPage = eleventyConfig => {
  eleventyConfig.addTransform('finished-page', (content, path) => (path && path.endsWith('.html') ? finishPage(content) : content));
};
