// Custom "default" resolving function for @photogabble/eleventy-plugin-interlinker.
// Copied from the plugin's defaultResolvingFn (src/resolvers.js) with ONE change:
// a dead link (href === false) renders as escaped plain text instead of the raw
// [[wikilink]] source. This is the safety net for the one-way wikilink rule —
// published posts must never show brackets or link into the private wiki.
// The plugin's console dead-link report still fires, so sneaked-in links get flagged.

const escapeHTML = value =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Dead links only arrive here with href === false because the plugin is registered with
// stubUrl: false (eleventy.config.js) — its default would hand us "/stubs/" instead.
export const resolveOrPlainText = async link => {
  const text = escapeHTML(link.title ?? link.name);

  if (!link.href) return text;

  const href = link.anchor ? `${link.href}#${link.anchor}` : link.href;
  return `<a href="${href}">${text}</a>`;
};
