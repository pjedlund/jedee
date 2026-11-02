// A site's map tiles (settings.maps). With no tiles a <place-map> shows no map: see the wiki "The place map".
const SIDES = ['west', 'south', 'east', 'north'];

export function resolveMaps(settings) {
  const { tiles, coverage } = settings?.maps ?? {};
  const given = SIDES.map(side => coverage?.[side]);
  if (given.every(value => value === undefined || value === null || value === '')) return { tiles: tiles || null, coverage: null };
  if (!given.every(Number.isFinite)) throw new Error(`settings.maps.coverage needs a number for each of ${SIDES.join(', ')}.`);
  return { tiles: tiles || null, coverage: given };
}
