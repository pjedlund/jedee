import { toISOString, formatDate } from './filters/dates.js';
import { dtcgItems } from './filters/dtcg-items.js';
import { markdownFormat } from './filters/markdown-format.js';
import { shuffleArray } from './filters/sort-random.js';
import { sortAlphabetically } from './filters/sort-alphabetic.js';
import { splitlines } from './filters/splitlines.js';
import { striptags } from './filters/striptags.js';
import { slugifyString } from './filters/slugify.js';
import { unwikilink } from './filters/unwikilink.js';
import { hostname } from './filters/hostname.js';
import { toISODuration, formatDuration, itunesDuration } from './filters/duration.js';
import { paceOrSpeed } from './filters/pace.js';
import { withMiles } from './filters/distance.js';
import { filterUpcoming, filterPast, sortByStartAsc, sortByStartDesc } from './filters/events.js';
import { enclosureBytes, enclosureType } from './filters/enclosure.js';
import {
  webmentionGetForUrl,
  webmentionisOwn,
  webmentionSort
} from './filters/webmentions.js';

export default {
  toISOString,
  formatDate,
  dtcgItems,
  markdownFormat,
  splitlines,
  striptags,
  shuffleArray,
  sortAlphabetically,
  slugifyString,
  unwikilink,
  hostname,
  toISODuration,
  formatDuration,
  itunesDuration,
  paceOrSpeed,
  withMiles,
  filterUpcoming,
  filterPast,
  sortByStartAsc,
  sortByStartDesc,
  enclosureBytes,
  enclosureType,
  webmentionGetForUrl,
  webmentionisOwn,
  webmentionSort
};