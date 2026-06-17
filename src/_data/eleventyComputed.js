// GLOBAL COMPUTED DATA
//
// `breadcrumbs` — a URL-derived breadcrumb trail, computed once per page and
// consumed by BOTH the visible partial (partials/breadcrumb.njk) and the
// structured data (schemas/BreadcrumbList.njk), so the two can never drift.
//
// Each entry: { isHome, url, label, current }. The first is always the home
// crumb (rendered as the logomark). Intermediate crumbs are section archives
// (their label comes from the main nav where possible); the last is the current
// page (label = the page title; the *visible* leaf may enrich this per type —
// see partials/breadcrumb-leaf.njk).
//
// Every post URL is single-segment (/<type>/<slug>/) and every section has an
// archive page, so the trail never invents a dead intermediate crumb. Pagination
// segments (page-2, …) are dropped.

const PAGINATION = /^page-\d+$/;

// Section labels that aren't in the main nav.
const EXTRA_LABELS = {
  tags: 'Tags',
};

const titleCase = segment =>
  segment.replace(/-/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

// Flatten navigation.top (and any submenus) into a { '/url/': 'Label' } lookup,
// so '/jams/' resolves to the same label the nav uses ('Jams').
const navLabelMap = navigation => {
  const map = {};
  const add = items =>
    (items || []).forEach(item => {
      if (item.url && item.text) map[item.url] = item.text;
      if (item.submenu) add(item.submenu);
    });
  if (navigation) add(navigation.top);
  return map;
};

const sectionLabel = (segment, url, navMap) =>
  navMap[url] || EXTRA_LABELS[segment] || titleCase(segment);

export default {
  breadcrumbs: data => {
    const url = data && data.page && data.page.url;
    if (typeof url !== 'string' || !url.startsWith('/')) return [];

    const navMap = navLabelMap(data.navigation);
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
        label: isLast ? data.title || titleCase(segment) : sectionLabel(segment, `${path}/`, navMap),
        current: isLast,
      });
    });

    return crumbs;
  },
};
