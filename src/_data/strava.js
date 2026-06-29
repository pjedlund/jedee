// Global data: the Strava training log. Thin default-export-only wrapper — all
// logic lives in ../_config/strava-export.js. It MUST stay default-only: a
// _data module with named exports isn't invoked by Eleventy 3.x (it's stored as
// the function itself), which silently empties the table.
import {getActivities} from '../_config/strava-export.js';

export default function () {
  return getActivities();
}
