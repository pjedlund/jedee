/**
 * Returns back some attributes based on whether the
 * link is active or a parent of an active item.
 *
 * @param {String} itemUrl - The link in question.
 * @param {String} pageUrl - The page context.
 * @returns {String} - The attributes or empty.
 */
export function getLinkActiveState(itemUrl, pageUrl) {
  let response = '';

  // Ensure pageUrl is a string before proceeding
  if (typeof pageUrl === 'string') {
    if (itemUrl === pageUrl) {
      response = ' aria-current="page"';
    }

    if (itemUrl.length > 1 && pageUrl.startsWith(itemUrl.replace('/page-0/', ''))) {
      response += ' aria-current="page" data-state="active"';
    }
  }

  return response;
}

/**
 * Generates a random UUID (Universally Unique Identifier).
 *
 * @returns {string} A random UUID.
 */
export function random() {
  return crypto.randomUUID();
}
