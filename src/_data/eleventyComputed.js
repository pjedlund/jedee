// GLOBAL COMPUTED DATA
//
// `breadcrumbs` — a URL-derived breadcrumb trail, computed once per page and consumed by BOTH the visible partial (partials/breadcrumb.njk) and the structured data (schemas/BreadcrumbList.njk), so the two can never drift.
//
// Each entry: { isHome, url, label, current }. First is always home (the logomark), intermediate crumbs are section archives, last is the current page — whose visible leaf may be enriched per type in partials/breadcrumb-leaf.njk. Every post URL is single-segment and every section has an archive, so the trail never invents a dead crumb. Pagination segments are dropped.

import {looksSwedish} from '../_config/utils/looks-swedish.js';

const PAGINATION = /^page-\d+$/;

// Section labels titleCase gets wrong, or that aren't in the main nav.
const EXTRA_LABELS = {
  rsvps: 'RSVPs',
  tags: 'Tags',
};

const titleCase = segment =>
  segment.replace(/-/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

const sectionLabel = segment => EXTRA_LABELS[segment] || titleCase(segment);

export default {
  // A front-matter titleLang wins; otherwise activity titles (a Swedish/English mix from Strava) get flagged when Swedish, so the shared entry-header h1 can carry lang="sv". See utils/looks-swedish.js for the detection rationale.
  titleLang: data =>
    data.titleLang ?? (data.category === 'activity' && looksSwedish(data.title) ? 'sv' : undefined),

  breadcrumbs: data => {
    const url = data && data.page && data.page.url;
    if (typeof url !== 'string' || !url.startsWith('/')) return [];

    const segments = url.split('/').filter(segment => segment && !PAGINATION.test(segment));

    const siteName = (data.meta && data.meta.siteName) || 'Home';
    const crumbs = [{ isHome: true, url: '/', label: siteName, current: url === '/' }];

    let path = '';
    segments.forEach((segment, index) => {
      path += `/${segment}`;
      const isLast = index === segments.length - 1;
      crumbs.push({
        isHome: false,
        url: `${path}/`,
        label: isLast ? data.title || titleCase(segment) : sectionLabel(segment),
        current: isLast,
      });
    });

    return crumbs;
  },
};
