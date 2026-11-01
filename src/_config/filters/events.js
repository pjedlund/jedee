/** Event date helpers (spec §9). "Now" is frozen at build time — an event only moves Upcoming → Past on rebuild.
 * Boundary rule: an in-progress event (started, not ended) counts as upcoming until its `end`; with no `end`, its `start`.
 * Status never enters here — a cancelled event still partitions by date (spec §7); the badge is presentation, not a filter. */

/** True while event.end (or event.start, if no end) is at/after build time. */
export const isUpcoming = event => {
  const boundary = event && (event.end || event.start);
  if (!boundary) return false;
  return new Date(boundary) >= new Date();
};

export const isPast = event => !isUpcoming(event);

/** Collection filters for events.njk (§7) — partition collections.event. */
export const filterUpcoming = posts => posts.filter(p => isUpcoming(p.data.event));
export const filterPast = posts => posts.filter(p => isPast(p.data.event));

/** Upcoming wants soonest event first; byCategory() returns newest-PUBLISHED
 * first, so the page re-sorts by event.start (a page concern, not a collection change). Past wants most-recent event first — the descending counterpart. Both copy the array before sorting (Array.sort mutates in place). */
export const sortByStartAsc = posts =>
  [...posts].sort((a, b) => new Date(a.data.event.start) - new Date(b.data.event.start));
export const sortByStartDesc = posts =>
  [...posts].sort((a, b) => new Date(b.data.event.start) - new Date(a.data.event.start));
