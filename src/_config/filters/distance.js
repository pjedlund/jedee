/** withMiles — a stored km distance with its imperial equivalent alongside it.
 * Usage (Nunjucks): {{ distanceKm | withMiles }} -> "4.84 km (3.01 mi)" */

const KM_PER_MI = 1.609344;

export const withMiles = km => {
  const n = Number(km);
  if (!n) return '';
  return `${km} km (${(n / KM_PER_MI).toFixed(2)} mi)`;
};
