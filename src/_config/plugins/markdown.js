import markdownItClass from '@toycode/markdown-it-class';
import markdownIt from 'markdown-it';
import markdownitAbbr from 'markdown-it-abbr';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItAttrs from 'markdown-it-attrs';
import {full as markdownItEmoji} from 'markdown-it-emoji';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItLinkAttributes from 'markdown-it-link-attributes';
import markdownitMark from 'markdown-it-mark';
import markdownItPrism from 'markdown-it-prism';
import {slugifyString} from '../filters/slugify.js';

export const markdownLib = markdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true
})
  .disable('code')
  .use(markdownItAttrs)
  // Prism has no Nunjucks grammar, so ````njk` fences are rendered as jinja2 — close enough, and it highlights the surrounding HTML too. Must run before markdown-it-prism.
  .use(md => {
    md.core.ruler.push('njk_as_jinja2', state => {
      for (const token of state.tokens) {
        if (token.type === 'fence' && token.info.trim() === 'njk') token.info = 'jinja2';
      }
    });
  })
  .use(markdownItPrism, {
    defaultLanguage: 'plaintext'
  })
  .use(markdownItAnchor, {
    slugify: slugifyString,
    tabIndex: false,
    permalink: markdownItAnchor.permalink.headerLink({
      class: 'heading-anchor'
    })
  })
  .use(markdownItClass, {})
  .use(markdownItLinkAttributes, [
    {
      // match external links
      matcher(href) {
        return href.match(/^https?:\/\//);
      },
      attrs: {
        rel: 'noopener'
      }
    }
  ])
  .use(markdownItEmoji)
  .use(markdownItFootnote)
  .use(markdownitMark)
  .use(markdownitAbbr)
  .use(md => {
    // Bare footnote numbers: the fonts' superscript figures have no brackets (see footnotes.css).
    md.renderer.rules.footnote_caption = (tokens, idx) => {
      const {id, subId} = tokens[idx].meta;
      return `${id + 1}${subId > 0 ? `:${subId}` : ''}`;
    };

    md.renderer.rules.image = (tokens, idx) => {
      const token = tokens[idx];
      const src = token.attrGet('src');
      const alt = token.content || '';
      const caption = token.attrGet('title');

      // Collect attributes
      const attributes = token.attrs || [];
      const hasEleventyWidths = attributes.some(([key]) => key === 'eleventy:widths');
      if (!hasEleventyWidths) {
        attributes.push(['eleventy:widths', '650,960,1400']);
      }

      const attributesString = attributes.map(([key, value]) => `${key}="${value}"`).join(' ');
      const imgTag = `<img src="${src}" alt="${alt}" ${attributesString}>`;
      return caption ? `<figure>${imgTag}<figcaption>${caption}</figcaption></figure>` : imgTag;
    };
  })
  .use(md => {
    // A hard space between a number and its unit, so a line never splits "0.34 s" (Bringhurst 2.4.6). Code spans and fences are other token types, so they are left alone.
    const numberUnit = /(\d) (km\/h|km|kcal|mph|mi|mm|cm|m|kg|g|°C|°F|ms|min|s|h|kB|KB|MB|GB|TB|px|bpm)(?![\p{L}\d])/gu;
    md.core.ruler.push('number_unit_nbsp', state => {
      for (const token of state.tokens) {
        if (token.type !== 'inline') continue;
        for (const child of token.children) if (child.type === 'text') child.content = child.content.replace(numberUnit, '$1\u00a0$2');
      }
    });
  })
  .use(md => {
    // A `Table: …` paragraph directly before or after a table becomes its <caption> (pandoc's convention); see the wiki page Tables.
    const captionAt = (tokens, i) =>
      tokens[i]?.type === 'paragraph_open' && /^table:\s/i.test(tokens[i + 1].content) && tokens[i + 2].type === 'paragraph_close';

    md.core.ruler.push('table_caption', state => {
      const {tokens} = state;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type !== 'table_open') continue;
        const close = tokens.findIndex((t, j) => j > i && t.type === 'table_close');
        const headEnd = tokens.findIndex((t, j) => j > i && t.type === 'thead_close');
        const text = inline => inline.children.map(t => t.content).join('');
        const headers = tokens.slice(i, headEnd).filter(t => t.type === 'inline');
        tokens[i].meta = {label: headers.map(text).filter(Boolean).join(', ')};

        const at = captionAt(tokens, i - 3) ? i - 3 : captionAt(tokens, close + 1) ? close + 1 : -1;
        if (at < 0) continue;
        const [, inline] = tokens.splice(at, 3);
        if (at < i) i -= 3;
        inline.children[0].content = inline.children[0].content.replace(/^table:\s*/i, '');
        const id = `table-${slugifyString(text(inline))}`;
        const open = new state.Token('caption_open', 'caption', 1);
        open.attrSet('id', id);
        tokens.splice(i + 1, 0, open, inline, new state.Token('caption_close', 'caption', -1));
        tokens[i].meta.captionId = id;
      }
    });

    // ⚠ The wrapper is the popout grid item and the keyboard-scrollable region; it needs tabindex, role and a name together.
    md.renderer.rules.table_open = (tokens, idx) => {
      const {captionId, label} = tokens[idx].meta;
      const name = captionId ? `aria-labelledby="${captionId}"` : `aria-label="${md.utils.escapeHtml(label)}"`;
      return `<div class="table-wrapper | popout" role="region" tabindex="0" ${name}>\n<table>\n`;
    };
    md.renderer.rules.table_close = () => '</table>\n</div>\n';

    // Header cells get scope="col"; markdown's column alignment becomes logical start/end.
    md.renderer.rules.th_open = md.renderer.rules.td_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.type === 'th_open') token.attrSet('scope', 'col');
      const style = token.attrGet('style');
      if (style) token.attrSet('style', style.replace('left', 'start').replace('right', 'end'));
      return self.renderToken(tokens, idx, options);
    };
  });
