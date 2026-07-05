import Image from '@11ty/eleventy-img';
import path from 'node:path';

// HTML-escape a value for safe interpolation into the markup we build by hand.
// This shortcode returns raw HTML, so it bypasses Nunjucks' auto-escaping: a
// straight `"` in a frontmatter `alt`/`caption` would otherwise close the
// attribute and make the html-minify transform throw a Parse Error, failing the
// production build. The set covers both attribute and text-node contexts.
const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export const escapeHtml = value =>
  value == null ? '' : String(value).replace(/[&<>"']/g, char => HTML_ESCAPES[char]);

const stringifyAttributes = attributeMap => {
  return Object.entries(attributeMap)
    .map(([attribute, value]) => {
      if (typeof value === 'undefined') return '';
      return `${attribute}="${escapeHtml(value)}"`;
    })
    .join(' ');
};

const errorSrcRequired = shortcodeName => {
  throw new Error(`src parameter is required for {% ${shortcodeName} %} shortcode`);
};

// Handles image processing
const processImage = async options => {
  let {
    src,
    alt = '',
    caption = '',
    loading = 'lazy',
    containerClass,
    imageClass,
    widths,
    sizes,
    formats = ['avif', 'webp', 'jpeg'],
    lightbox = false
  } = options;

  // Set sizes based on loading (if not provided)
  if (sizes == null) {
    sizes = loading === 'lazy' ? 'auto' : '100vw';
  }

  // Lightbox images get a larger top candidate: it doubles as the zoom target.
  if (widths == null) {
    widths = lightbox ? [650, 960, 1400, 2000] : [650, 960, 1400];
  }

  // Prepend "./src" if not present
  if (!src.startsWith('./src')) {
    src = `./src${src}`;
  }

  const metadata = await Image(src, {
    widths: [...widths],
    formats: [...formats],
    urlPath: '/assets/images/',
    outputDir: './dist/assets/images/',
    filenameFormat: (id, src, width, format, options) => {
      const extension = path.extname(src);
      const name = path.basename(src, extension);
      return `${name}-${width}w.${format}`;
    }
  });

  const lowsrc = metadata.jpeg[metadata.jpeg.length - 1];

  const imageSources = Object.values(metadata)
    .map(imageFormat => {
      return `  <source type="${imageFormat[0].sourceType}" srcset="${imageFormat
        .map(entry => entry.srcset)
        .join(', ')}" sizes="${escapeHtml(sizes)}">`;
    })
    .join('\n');

  const imageAttributes = stringifyAttributes({
    'src': lowsrc.url,
    'width': lowsrc.width,
    'height': lowsrc.height,
    alt,
    loading,
    'decoding': loading === 'eager' ? 'sync' : 'async',
    // Eager = above-the-fold hero = the likely LCP element. fetchpriority is
    // the modern replacement for image preload when the img is in the initial
    // HTML (web.dev/articles/fetch-priority; cross-browser since Firefox 132).
    ...(loading === 'eager' && {'fetchpriority': 'high'}),
    ...(imageClass && { class: imageClass }),
    'eleventy:ignore': ''
  });

  const pictureElement = `<picture> ${imageSources}<img ${imageAttributes}></picture>`;

  // Lightbox mode: wrap the picture in the <photo-lightbox> WebC component
  // (src/_includes/webc/photo-lightbox.webc — processed by the WebC transform
  // on the rendered page, so this works from any template or markdown post).
  // The largest generated JPEG is the pre-JS link target and sets the slide
  // dimensions; the full JPEG srcset goes to data-pswp-srcset so PhotoSwipe
  // loads the right size for the screen and upgrades on zoom. The caption is
  // passed to the component, which renders the <figcaption> OUTSIDE the link.
  if (lightbox) {
    const largest = metadata.jpeg[metadata.jpeg.length - 1];
    const lightboxAttributes = stringifyAttributes({
      '@href': largest.url,
      '@width': largest.width,
      '@height': largest.height,
      '@srcset': metadata.jpeg.map(entry => entry.srcset).join(', '),
      ...(caption && {'@caption': caption})
    });
    // The <div> wrapper is load-bearing in markdown: markdown-it rejects the
    // @-prefixed WebC props as invalid HTML attributes, so a bare
    // <photo-lightbox @…> line gets escaped + smart-quoted as text. A chunk
    // that STARTS with a known block tag is taken as one raw html_block.
    return `<div><photo-lightbox ${lightboxAttributes}><picture slot="image"${containerClass ? ` class="${escapeHtml(containerClass)}"` : ''}> ${imageSources}<img ${imageAttributes}></picture></photo-lightbox></div>`;
  }

  return caption ?
    `<figure slot="image"${containerClass ? ` class="${escapeHtml(containerClass)}"` : ''}>${pictureElement}<figcaption>${escapeHtml(caption)}</figcaption></figure>` :
    `<picture slot="image"${containerClass ? ` class="${escapeHtml(containerClass)}"` : ''}>${imageSources}<img ${imageAttributes}></picture>`;
};

// Positional parameters (legacy)
export const imageShortcode = async (
  src,
  alt,
  caption,
  loading,
  containerClass,
  imageClass,
  widths,
  sizes,
  formats
) => {
  if (!src) {
    errorSrcRequired('image');
  }
  return processImage({
    src,
    alt,
    caption,
    loading,
    containerClass,
    imageClass,
    widths,
    sizes,
    formats
  });
};

// Named parameters
export const imageKeysShortcode = async (options = {}) => {
  if (!options.src) {
    errorSrcRequired('imageKeys');
  }
  return processImage(options);
};

// Responsive image that opens in the PhotoSwipe lightbox. Usable in any
// template or markdown post: {% lightbox "/assets/images/foo.jpg", "alt", "caption" %}
export const lightboxShortcode = async (src, alt, caption, widths, sizes) => {
  if (!src) {
    errorSrcRequired('lightbox');
  }
  return processImage({src, alt, caption, widths, sizes, lightbox: true});
};
