---
description: "The MapLibre map component, drawn from jedee's own Protomaps tiles, that upgrades server-rendered location data into a live map, and its three modes — single pin, a list of places, and a recorded route line."
date: 2026-08-11
---

An interactive web map is a JavaScript widget: a library like [Leaflet](https://leafletjs.com) or [MapLibre](https://maplibre.org) draws tiled imagery and vector shapes onto a scrollable canvas. That means it does nothing without JavaScript, and its keyboard and screen-reader story is often poor. The durable way to ship one is progressive enhancement — server-render the underlying data as ordinary HTML that stands on its own (a list of places with a link each, or a static map image), then let JavaScript find that markup and grow the live map above it. The HTML is the answer for no-JS visitors and assistive tech; the map is a convenience layered on top.

A recurring trap is coordinate order. [GeoJSON](https://geojson.org) — the standard shape for map data — writes each position as `[longitude, latitude]`, x before y. MapLibre follows GeoJSON; Leaflet, and the way people say "lat/long" out loud, put latitude first. A track handed to the wrong one without a swap lands in the wrong hemisphere.

Map tiles come in two kinds. **Raster** tiles are finished pictures (PNGs) someone else rendered and styled. **Vector** tiles carry the geometry and names only, and the browser paints them with a style you write — every color, line width and label is yours. [Protomaps](https://protomaps.com) packages OpenStreetMap as vector tiles in a single file (PMTiles) that any static host can serve, because the browser fetches just the byte ranges it needs. A recorded path is a GeoJSON `LineString`: one `geometry.coordinates` array of `[lon, lat]` points.

## In jedee

`<place-map>` is a custom element, entirely jedee's own (not Eleventy Excellent stock). It moved from Leaflet to MapLibre on 2026-09-17 so it could draw jedee's own vector tiles in the site's colors (see *Our own tiles* below). MapLibre is bundled straight into the component file by esbuild (about 270 KB compressed, against Leaflet's 41 KB) and the whole thing is deferred behind `is-land`, so nothing loads until the browser is idle — the same pattern as [[The PhotoSwipe lightbox]]. The inline map drags and zooms with its buttons but never wheel- or pinch-zooms (that would trap the page scroll); a maximize button grows the *same* map instance into a modal overlay where wheel and pinch turn on, so pan/zoom state is preserved rather than rebuilt.

One element, three modes, chosen in `connectedCallback` purely by what markup is slotted inside it:

```js
const routeScript = this.querySelector('script[type="application/json"][data-route]');
const placeList = this.querySelector('[data-place-list]');
if (routeScript) this.initRoute(routeScript);
else if (placeList) this.initPlaces(placeList);
else this.initSinglePin();
```

- **Single pin** (photo pages) — `data-lat`/`data-lon` on the element, with a static `<a><img>` Geoapify map image as the slotted fallback.
- **Places** (the activity index) — a slotted `[data-place-list]`: since 2026-09-15 the activities table, one `<tr data-lat data-lon>` per located activity, each dot named and linked from the row's first link ([[Tables]]). The table *is* the data source and the no-JS / screen-reader path: map markers have poor keyboard and SR handling (Leaflet's were broken upstream; MapLibre's dots are painted on a canvas and not focusable at all), so nobody is forced through the map to reach a post. JavaScript reads the rows that carry coordinates and drops one dot each into the box above; rows without coordinates stay in the table, unmapped. Each row's `data-activity` sets a `--place-color` in `place-map.css`, read once per row for its dot: orienteering orange, hikes `green-vivid`, runs `blue-vivid`.

  This mode used to group the list by activity type, with the group headings upgraded into filter toggles and mirrored as chips on the map surface. All of that came out on 2026-08-15, when the page became a single chronological index: the grouping was the only thing standing between the reader and a plain newest-first list of everything. Two lessons stayed behind. First, **reserve the map's space server-side** — the box was built and prepended on idle, so the whole page dropped by 16:9-of-the-column a second after paint; rendering an empty `.place-map-live` in the markup and having `buildBox()` adopt it takes the shift to zero. Second, **beware the double reverse**: the collection was already newest-first from `byCategory`, and the `located` filter reversed it again, so the visible list ran oldest-first for months without anyone noticing.
- **Route** (activity pages) — a slotted `<script type="application/json" data-route>` holding a GeoJSON `LineString`. This is the newest mode and the rest of this page is about it.

<figure class="feature" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/place-map-modes.png" alt="Three maps side by side. The first has a single orange dot on a coastal town. The second is zoomed out over the Swedish west coast and Denmark with a scatter of orange dots. The third is a pale green forest map carrying an orange route line with its start triangle and finish circles." width="2196" height="588">
  <figcaption>The same element three times, told apart only by what is slotted inside it.</figcaption>
</figure>

### A recorded route as the third mode

The track for an activity is committed as a sibling file next to the post: `<Post Title>.geojson` beside `<Post Title>.md`. It's extracted from the Strava export by a one-off local script (`_local/generated/extract-route.py`), which handles both source formats the export ships:

- **FIT** files store positions as *semicircles* — a signed integer where a full circle is 2³² — so each coordinate is multiplied by `180 / 2³¹` to get degrees.
- **GPX** files are already longitude/latitude in degrees, read with a different parser.

Either way the script downsamples the thousands of recorded points down to a light path, but keeps the exact first and last points untouched so the start and finish markers sit where the activity really began and ended. It writes a `LineString` with `[lon, lat]` coordinates, GeoJSON order.

At build time the file is inlined into the page. A filter reads the sibling by swapping the post's extension:

```js
// src/_config/filters/route-geojson.js
export function routeGeoJSON(inputPath) {
  const p = inputPath.replace(/\.md$/, '.geojson');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}
```

⚠ It takes `page.inputPath`, **not** `page.fileSlug`. Eleventy strips a leading date from `fileSlug`, so a date-prefixed filename (`2026-08-02 Gotland dag 2.md`) would look for `2026-08-02 Gotland dag 2.geojson` under the slug `gotland-dag-2` and miss. `inputPath` is the real path on disk. `activity.njk` slots the result only when it exists, so an activity with no recorded track renders no map at all:

```njk
{% set routeJson = page.inputPath | routeGeoJSON %}
{% if routeJson %}
  <place-map @place="this route">
    <script type="application/json" data-route>{{ routeJson | safe }}</script>
  </place-map>
{% endif %}
```

Drawing it, the GeoJSON goes straight into a MapLibre `geojson` source — no coordinate swap, since MapLibre reads `[lon, lat]` natively. The line's color is read from `--color-route-line`, so it follows the theme.

The start and finish are the standard **orienteering course symbols** — a triangle at the start pointing down the first leg, two concentric circles at the finish. They're built in screen pixels at the fit zoom and then unprojected to lat/lon, so they become **geographic shapes** in their own line layers: they grow and shrink with the map like the track does, with no per-zoom JavaScript. (The Leaflet version got the same result from an `L.polygon` and two `L.circle`s; an even earlier one used fixed-size HTML markers that needed a `scale()` on every zoom.) The circles are 48-point rings, since a MapLibre line layer has no circle shape.

The start triangle's apex is pinned exactly on the first point and the body trails back along the reverse of the travel direction. ⚠ The heading is measured to the first track point **at least ~25 m out**, not the next GPS fix — the opening fixes cluster on the spot and a two-point bearing there is pure noise, so the triangle would point a random way. The shapes are hollow and share the line's color, the site's accent orange. Orienteering overprint is purple, and a purple was tried — but the line has to read over several different tile sets, and it vanished on some of them; the accent orange reads on all of them. There's deliberately **no halo**. None are interactive, since the map isn't the screen-reader path here.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/place-map-route-symbols.png" alt="A pale green map of park paths with an orange route line running through it. Where the line begins, a hollow orange triangle with its apex on the track and its body trailing back; a few metres away, two hollow concentric orange circles marking the finish." width="1500" height="946">
  <figcaption>The two orienteering symbols, zoomed in — the start and finish are about 25 metres apart on this course. Both are geographic shapes, so zooming grew them along with the line rather than leaving them at a fixed screen size.</figcaption>
</figure>

On first paint a short intro sequences the pieces: while the tiles load the empty box pulses softly, and once MapLibre first reports `idle` the canvas fades up (`[data-map-loading]` in `place-map.css`), then the start triangle fades in, the line draws itself start-to-finish, and the finish is revealed only once the line reaches it — all gated behind `prefers-reduced-motion`, so reduced-motion visitors just get the finished map. A canvas map has no SVG path to animate with `stroke-dashoffset`, so the draw is a **`line-gradient`** (which needs `lineMetrics: true` on the source): a `step` at the drawn fraction of the line, solid before it and transparent after, moved forward every animation frame. ⚠ A theme flip mid-draw rebuilds the style, and `setPaintProperty` throws "Style is not done loading" until it's back — the loop skips those frames, and keeps the progress in component state so the rebuilt style carries it.

The no-JS answer for a route is the honest one: no map, but the stats and the **"View on Strava"** link below carry the route. A blank or broken map is never shown — malformed JSON or too few points also just leaves the page mapless with the Strava link standing. Route lines live on the [[The activities archive|activities archive]] pages; that page's overview map is the *groups* mode of this same component.

### Widening the map: the breakout must go on the `<is-land>`

The route map sits one step wider than the prose column — the `.popout` [[Layout breakouts|breakout]] — so the track has room to read. ⚠ Getting the breakout class onto the right element is the trap. `<place-map>` is a WebC component whose template is `<is-land on:idle><place-map webc:root webc:keep>…`. Because `webc:root` is on the **inner** `<place-map>`, any attribute on the invocation (`class="popout"`) merges onto that inner element — which is a grid *grand*child (the `<is-land>` wraps it), and breakout classes only work on a direct grid child. So a class on the invocation silently does nothing; the map stays at content width.

The fix routes the class onto the `<is-land>` itself via a prop: the component takes `:class="breakout || ''"` on its `<is-land>`, and `activity.njk` passes `@breakout="popout"`. Two details that bite: the `|| ''` guard is load-bearing — a bare `:class="breakout"` throws `Cannot read properties of undefined (reading 'toString')` at build time for every caller that omits the prop (the places index, the single-pin photo maps), and `|| false` renders a literal `class="false"` because WebC stringifies a falsy `:class` rather than dropping it; only `|| ''` cleanly omits the attribute. The breakout also collapses back to content width on narrow screens automatically — that is the `.wrapper` grid working as designed, not a bug.

### Our own tiles

Since 2026-09-17 every map opens on jedee's own basemap: a Protomaps extract of Sweden (`sweden-20260916.pmtiles`, 4.4 GB, full detail to zoom 15), cut from the free daily world build with `pmtiles extract … --bbox=10.5,55.0,24.5,69.2 --maxzoom=15` and hosted on the site's R2 bucket. It replaced plain OpenStreetMap tiles, whose dark mode was a CSS `invert()` filter — CARTO's ready-made dark basemap started demanding an API key in August 2026. Everything the map needs besides the tiles is self-hosted in `src/assets/map/`: the label fonts (only the Latin, Greek and Cyrillic glyph ranges — MapLibre asks for a range per character block and draws a missing one locally, with a console warning) and the icon sprites.

The colors are **CSS custom properties**, `--map-land`, `--map-water`, `--map-park`, `--map-buildings`, `--map-road`, `--map-road-minor`, `--map-label*` and `--map-dot-stroke`, set in `place-map.css` from the site's tokens with dark-mode overrides. On every render the component reads them and passes them to Protomaps' theme code as a custom "flavor", so tweaking the map is a CSS edit, and a theme flip just re-renders. Two traps:

- ⚠ **MapLibre can't parse `color-mix()` or `oklab()`**, and a custom property's computed value is the unresolved text. The component resolves each one by painting it into a 1×1 canvas and reading the pixel back as `rgba()`.
- ⚠ **The properties sit on the map canvas, not on `<place-map>`**, because the maximize button moves the canvas into an overlay outside the element, where it would stop inheriting them.

⚠ **The tile file is empty outside Sweden.** A single pin, place list or route that reaches past the box opens on Topographic instead (`COVERAGE` in `place-map.js`).

The whole style (base layers plus the dots, route and symbols) is rebuilt by one `render()` and applied with `setStyle(style, { diff: true })`, which changes only what differs. ⚠ The very first render must skip `diff`: diffing against the empty placeholder style before it has loaded logs a warning and rebuilds anyway.

⚠ **MapLibre loads a style on an animation frame**, and browsers pause those in a hidden tab. A map on a background tab (or in Claude's Browser pane while it's hidden) stays blank with `isStyleLoaded()` false until the tab is shown — not a bug.

### Waiting for the first tiles

Tiles arrive over the network, so between the page's first paint and a drawn map there is a gap of a second or more. Three parts cover it, and none of them is a spinner:

- The box is filled with `--map-water`, the map's own sea color, and **pulses** between that and a paler version of it while the canvas is hidden. A loading state that is already one of the map's colors reads as the map arriving rather than as a placeholder.
- The canvas carries `[data-map-loading]` (set when the map is built, removed on MapLibre's first `idle` event) and fades in over 500 ms when it goes. `idle` is the honest signal: it fires when nothing is left to fetch or draw, so the fade starts on a finished picture rather than on a half-drawn one.
- A route's intro waits for the same event, so the line is never drawn across an empty box.

⚠ **A caption meant for no-JS visitors will flash.** The activity index renders its map box server-side to reserve the space ([[Layout shift]]), and the caption inside it — *Map of my activities* — showed for as long as the island took to hydrate. It is now hidden under [`@media (scripting: enabled)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/scripting), the mirror of the `scripting: none` rule in [[The main menu]]: the text is only for the visitor who will never get a map, and `visibility: hidden` keeps the box's height either way. Pre-hydration text is worth a second look in general — it is written for a case that most visitors pass through rather than land in.

⚠ Reduced motion removes both the pulse and the fade, and the map simply appears.

### A base-layer style switch

A control in the bottom-right corner switches between **Map** (jedee's tiles) and two fixed raster styles: **Satellite** (Esri World Imagery) and **Topographic** (OpenTopoMap, contours and trails). Every mode opens on Map, routes included; before the move, routes opened on Topographic. One tile-source gotcha: Esri's URL template is `{z}/{y}/{x}` — row before column, the reverse of the usual order.

The control is a native `<select>`: a base-layer choice is single-select, and `<select>` is the accessible native control for that (keyboard and screen reader for free, its option list drawn by the OS). It's a MapLibre control, so it's a child of the map canvas and rides into the maximize overlay with no extra code. Switching just sets the base and re-renders. MapLibre's attribution control credits only the sources that currently have visible layers, so the credit follows the switch on its own (the Leaflet version needed a careful add order to get attribution *removal* right). In a bottom corner the last-added control sits nearest the top, so the attribution is added first and the switch second.

The inline map keeps the old gesture rules: no wheel or pinch zoom (that would trap the page scroll) except with Ctrl/⌘ held, which is also how a trackpad pinch arrives; rotation and tilt are off everywhere.

The move to MapLibre and jedee's own tiles: the session of 2026-09-17, verified against `place-map.js` and `place-map.css`. Source: `_local/design/Plan - GPX route line on the activity map.md` (2026-08-11), verified against `place-map.js` and `route-geojson.js`. The base-layer switch: `_raw/dev-notes/How the place map switches tile styles.md` (2026-08-11), verified against `place-map.js` and `place-map.css`. The start/finish symbols were reworked from `divIcon` HTML markers into native vector shapes on 2026-08-16 (commit 30aade8), re-verified against `place-map.js` and `place-map.css`.
