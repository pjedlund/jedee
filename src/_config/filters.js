import { categoryFilter } from './filters/category-filter.js';
import { toISOString, formatDate } from './filters/dates.js';
import { dtcgItems } from './filters/dtcg-items.js';
import { markdownFormat } from './filters/markdown-format.js';
import { shuffleArray } from './filters/sort-random.js';
import { sortAlphabetically } from './filters/sort-alphabetic.js';
import { splitlines } from './filters/splitlines.js';
import { striptags } from './filters/striptags.js';
import { slugifyString } from './filters/slugify.js';
import { toISODuration, formatDuration, itunesDuration } from './filters/duration.js';
import { filterUpcoming, filterPast, sortByStartAsc, sortByStartDesc } from './filters/events.js';
import { enclosureBytes, enclosureType } from './filters/enclosure.js';

export default {
  categoryFilter,
  toISOString,
  formatDate,
  dtcgItems,
  markdownFormat,
  splitlines,
  striptags,
  shuffleArray,
  sortAlphabetically,
  slugifyString,
  toISODuration,
  formatDuration,
  itunesDuration,
  filterUpcoming,
  filterPast,
  sortByStartAsc,
  sortByStartDesc,
  enclosureBytes,
  enclosureType
};