// UNWIKILINK
// Strip Obsidian [[wikilink]] brackets for display, keeping the human-readable
// text. Jam `artist` / `genre` (and any field stored as a graph wikilink) are
// kept as [[…]] in the source for the Obsidian graph; this cleans them for the
// rendered page so the brackets never leak into HTML.
//
//   "[[Woo York]]"            -> "Woo York"
//   "[[Target|Display]]"      -> "Display"   (Obsidian alias form: show the alias)
//   ["[[Techno]]", "[[Dance]]"] -> ["Techno", "Dance"]   (genre is a list)
//   "Rock"                    -> "Rock"      (no brackets: unchanged)
//
// Maps over an array and cleans a scalar; non-string values pass through
// untouched. Compose as you like, e.g. `genre | unwikilink | join(" · ")`.

const stripOne = value => {
  if (typeof value !== 'string') return value;
  return value.replace(/\[\[([^\]]+)\]\]/g, (_match, inner) => inner.split('|').pop().trim());
};

export const unwikilink = value =>
  Array.isArray(value) ? value.map(stripOne) : stripOne(value);
