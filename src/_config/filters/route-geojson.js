import fs from 'node:fs';

// Route line for an activity: read the .geojson committed next to the post (written by _local/generated/extract-route.py from the Strava FIT export), so activity.njk can inline it into <place-map>. Takes the post's `page.inputPath` and swaps the extension — page.fileSlug won't do, since Eleventy strips the leading date from it. Returns "" when the activity has no recorded track.
export function routeGeoJSON(inputPath) {
  const p = inputPath.replace(/\.md$/, '.geojson');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}
