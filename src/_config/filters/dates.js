import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import {siteSettings} from '../utils/site.js';

// Enables `Do` (31st) in formatDate.
dayjs.extend(advancedFormat);

// Month and day names follow settings.site.lang. ⚠ Needs a dayjs locale of that name; without one the dates stay English.
const {lang} = siteSettings();
if (lang !== 'en') {
  try {
    await import(`dayjs/locale/${lang}.js`);
    dayjs.locale(lang);
  } catch {
    console.warn(`[dates] dayjs has no locale "${lang}": dates stay English`);
  }
}

/** Converts the given date string to ISO8610 format. */
export const toISOString = dateString => dayjs(dateString).toISOString();

/** Formats a date using dayjs's conventions: https://day.js.org/docs/en/display/format */
export const formatDate = (date, format) => dayjs(date).format(format);
