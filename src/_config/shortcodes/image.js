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
    widths = [650, 960, 1400],
    sizes,
    formats = ['avif', 'webp', 'jpeg']
  } = options;

  // Set sizes based on loading (if not provided)
  if (sizes == null) {
    sizes = loading === 'lazy' ? 'auto' : '100vw';
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
    ...(imageClass && { class: imageClass }),
    'eleventy:ignore': ''
  });

  const pictureElement = `<picture> ${imageSources}<img ${imageAttributes}></picture>`;

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
