import {clampValue} from './clamp-generator.js';

/**
 * Recursively traverse a DTCG token object, joining nested key paths with
 * hyphens to produce the same flat {key: value} map that tokensToTailwind()
 * previously produced via slugify.
 *
 * @param {object} dtcgObject - DTCG-formatted token group
 * @param {string} prefix - accumulated key path (used in recursion)
 * @returns {object} flat map of {tokenKey: value}
 */
export const dtcgToTailwind = (dtcgObject, prefix = '') => {
  const result = {};

  for (const [key, node] of Object.entries(dtcgObject)) {
    if (key.startsWith('$')) continue;

    const path = prefix ? `${prefix}-${key}` : key;

    if (node === null || typeof node !== 'object') continue;

    if (node.$value !== undefined) {
      result[path] = node.$value;
    }
    // A node can be both a leaf ($value) and a group — e.g. "red" with a "subdued" child.
    // Recurse either way; non-object/non-$ children are skipped by the guard above.
    Object.assign(result, dtcgToTailwind(node, path));
  }

  return result;
};

/**
 * Like dtcgToTailwind but converts fluid {min, max} $values to CSS clamp() strings.
 * Use this for spacing and font-size tokens.
 *
 * @param {object} dtcgObject - DTCG-formatted token group with fluid {min, max} values
 * @returns {object} flat map of {tokenKey: clampString}
 */
export const dtcgFluidToTailwind = dtcgObject => {
  const flat = dtcgToTailwind(dtcgObject);

  return Object.fromEntries(
    Object.entries(flat).map(([key, val]) =>
      typeof val === 'object' && val !== null && 'min' in val
        ? [key, clampValue(val.min, val.max)]
        : [key, val]
    )
  );
};

/**
 * Like dtcgToTailwind but composes Penpot-shaped shadow layers into a CSS
 * box-shadow string. The tokens are stored as layers because that is the shape
 * Penpot's own shadow token uses; CSS is the derived form, not the source.
 *
 * @param {object} dtcgObject - DTCG token group whose $values are layer arrays
 * @returns {object} flat map of {tokenKey: boxShadowString}
 */
export const dtcgShadowToTailwind = dtcgObject =>
  Object.fromEntries(
    Object.entries(dtcgToTailwind(dtcgObject)).map(([key, layers]) => [
      key,
      layers
        .map(l => `${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.spread}px ${l.color}`)
        .join(', ')
    ])
  );
