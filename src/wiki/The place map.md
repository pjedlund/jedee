---
description: "The Leaflet map component that upgrades server-rendered location data into a live map, and its three modes — single pin, a list of places, and a recorded route line."
date: 2026-08-11
---

An interactive web map is a JavaScript widget: a library like [Leaflet](https://leafletjs.com) draws tiled imagery and vector shapes onto a scrollable canvas. That means it does nothing without JavaScript, and its keyboard and screen-reader story is often poor. The durable way to ship one is progressive enhancement — server-render the underlying data as ordinary HTML that stands on its own (a list of places with a link each, or a static map image), then let JavaScript find that markup and grow the live map above it. The HTML is the answer for no-JS visitors and assistive tech; the map is a convenience layered on top.

A recurring trap is coordinate order. [GeoJSON](https://geojson.org) — the standard shape for map data — writes each position as `[longitude, latitude]`, x before y. Leaflet, and the way people say "lat/long" out loud, put latitude first. A track drawn straight from GeoJSON coordinates without the swap lands in the wrong hemisphere. A recorded path is a GeoJSON `LineString`: one `geometry.coordinates` array of `[lon, lat]` points.

## In jedee

`<place-map>` is a custom element, entirely jedee's own (not Eleventy Excellent stock). Leaflet is bundled straight into the component file by esbuild and the whole thing is deferred behind `is-land`, so nothing loads until the browser is idle — the same pattern as [[The PhotoSwipe lightbox]]. The inline map drags and zooms with its buttons but never wheel- or pinch-zooms (that would trap the page scroll); a maximize button grows the *same* map instance into a modal overlay where wheel and pinch turn on, so pan/zoom state is preserved rather than rebuilt.

One element, three modes, chosen in `connectedCallback` purely by what markup is slotted inside it:

```js
const routeScript = this.querySelector('script[type="application/json"][data-route]');
const placeList = this.querySelector('[data-place-list]');
if (routeScript) this.initRoute(routeScript);
else if (placeList) this.initPlaces(placeList);
else this.initSinglePin();
```

- **Single pin** (photo pages) — `data-lat`/`data-lon` on the element, with a static `<a><img>` Geoapify map image as the slotted fallback.
- **Places** (the activity index) — a slotted `[data-place-list]`, one `<li data-lat data-lon>` per located post. The list *is* the data source and the no-JS / screen-reader path: Leaflet's own markers have broken keyboard and SR handling upstream, so nobody is forced through the map to reach a post. JavaScript reads the items that carry coordinates and drops one dot each into the box above; items without coordinates stay in the list, unmapped.

  This mode used to group the list by activity type, with the group headings upgraded into filter toggles and mirrored as chips on the map surface. All of that came out on 2026-08-15, when the page became a single chronological index: the grouping was the only thing standing between the reader and a plain newest-first list of everything. Two lessons stayed behind. First, **reserve the map's space server-side** — the box was built and prepended on idle, so the whole page dropped by 16:9-of-the-column a second after paint; rendering an empty `.place-map-live` in the markup and having `buildBox()` adopt it takes the shift to zero. Second, **beware the double reverse**: the collection was already newest-first from `byCategory`, and the `located` filter reversed it again, so the visible list ran oldest-first for months without anyone noticing.
- **Route** (activity pages) — a slotted `<script type="application/json" data-route>` holding a GeoJSON `LineString`. This is the newest mode and the rest of this page is about it.

<figure class="feature" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/place-map-modes.png" alt="Three maps side by side. The first has a single orange dot on a coastal town. The second is zoomed out over southern Scandinavia with a scatter of orange dots. The third is a forest map carrying an orange route line with its start triangle and finish circles." width="2196" height="588">
  <figcaption>The same element three times, told apart only by what is slotted inside it. The third also shows the per-mode base layer: route mode opens on Topographic, the other two on the themed Map default.</figcaption>
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

Drawing it, the component does the coordinate swap by hand rather than handing the GeoJSON to `L.geoJSON`:

```js
const coords = gj.geometry.coordinates;
const latlngs = coords.map(([lon, lat]) => [lat, lon]); // GeoJSON [lon,lat] → Leaflet [lat,lon]
L.polyline(latlngs, { weight: 4, opacity: 0.9, className: 'route-line' }).addTo(map);
```

`L.geoJSON` *would* read `[lon, lat]` natively with no swap, but the manual `latlngs` array is reused straight away for the start and finish symbols — `latlngs[0]` for the start, `latlngs.at(-1)` for the finish — so building it once is simpler than adding a GeoJSON layer and then re-deriving the endpoints. The line carries no `color` option; its stroke is set in CSS (`.route-line { stroke: var(--color-route-line) }`), because a CSS `stroke` property outranks Leaflet's own `stroke` attribute and so tracks `data-theme` for free.

The start and finish are the standard **orienteering course symbols** — a triangle at the start pointing down the first leg, two concentric circles at the finish. Both are drawn as **native Leaflet vector shapes** (an `L.polygon` and two `L.circle`) in the same overlay pane as the line, *not* as HTML markers. That choice matters: because they're geographic geometry, Leaflet re-projects them on every zoom, so they grow and shrink with the map exactly like the line does, with no per-zoom JavaScript. An earlier version drew each symbol as an inline `<svg>` inside a Leaflet `divIcon` (a fixed screen-size HTML marker), which needed a hand-written `scale()` transform on every zoom to keep proportion; native geometry deleted all of that.

They're built in screen pixels at the fit zoom and then unprojected to lat/lon, which is how the pixel sizes get frozen into geographic shapes:

```js
// finish: L.circle radius is in METRES, so it scales with zoom. Convert a fit-zoom pixel radius via the local metres-per-pixel.
const mpp = map.distance(c, map.unproject(map.project(c, z).add(L.point(64, 0)), z)) / 64;
L.circle(endLL, { radius: 9 * mpp, className: 'route-finish-symbol', fill: false, interactive: false });
```

The start triangle's apex is pinned exactly on `latlngs[0]` and the body trails back along the reverse of the travel direction. ⚠ The heading is measured to the first track point **at least ~25 m out**, not the next GPS fix — the opening fixes cluster on the spot and a two-point bearing there is pure noise, so the triangle would point a random way. The shapes are hollow (Leaflet's `fill: false` → `fill: none`) and share the line's `--color-route-line`, which is the site's accent orange. Orienteering overprint is purple, and a purple was tried — but the line has to read over three different tile sets, and it vanished on some of them; the accent orange reads on all three. There's deliberately **no halo** — just the outline. None are `interactive` or a keyboard stop, since the map isn't the screen-reader path here.

<figure class="popout" data-wiki-mockup>
  <img eleventy:formats="webp,png" src="/assets/images/wiki/place-map-route-symbols.png" alt="A topographic map of forest with an orange route line running through it. Where the line begins, a hollow orange triangle with its apex on the track and its body trailing back; a few metres away, two hollow concentric orange circles marking the finish." width="1500" height="946">
  <figcaption>The two orienteering symbols, zoomed in — the start and finish are about 25 metres apart on this course. Both are geographic shapes, so zooming grew them along with the line rather than leaving them at a fixed screen size.</figcaption>
</figure>

On first paint a short intro sequences the pieces: the canvas fades up, the start triangle fades in, the line draws itself start-to-finish (a `stroke-dashoffset` sweep), and the finish is revealed only once the line reaches it — all gated behind `prefers-reduced-motion`, so reduced-motion visitors just get the finished map.

The no-JS answer for a route is the honest one: no map, but the stats and the **"View on Strava"** link below carry the route. A blank or broken map is never shown — malformed JSON or too few points also just leaves the page mapless with the Strava link standing. Route lines live on the [[The activities archive|activities archive]] pages; that page's overview map is the *groups* mode of this same component.

### Widening the map: the breakout must go on the `<is-land>`

The route map sits one step wider than the prose column — the `.popout` [[Layout breakouts|breakout]] — so the track has room to read. ⚠ Getting the breakout class onto the right element is the trap. `<place-map>` is a WebC component whose template is `<is-land on:idle><place-map webc:root webc:keep>…`. Because `webc:root` is on the **inner** `<place-map>`, any attribute on the invocation (`class="popout"`) merges onto that inner element — which is a grid *grand*child (the `<is-land>` wraps it), and breakout classes only work on a direct grid child. So a class on the invocation silently does nothing; the map stays at content width.

The fix routes the class onto the `<is-land>` itself via a prop: the component takes `:class="breakout || ''"` on its `<is-land>`, and `activity.njk` passes `@breakout="popout"`. Two details that bite: the `|| ''` guard is load-bearing — a bare `:class="breakout"` throws `Cannot read properties of undefined (reading 'toString')` at build time for every caller that omits the prop (the places index, the single-pin photo maps), and `|| false` renders a literal `class="false"` because WebC stringifies a falsy `:class` rather than dropping it; only `|| ''` cleanly omits the attribute. The breakout also collapses back to content width on narrow screens automatically — that is the `.wrapper` grid working as designed, not a bug.

### A base-layer style switch

All three modes share one map builder, so all three got the same addition: a control in the bottom-right corner that switches the map's look between the themed **Map** default and two fixed styles — **Satellite** (Esri World Imagery) and **Topographic** (OpenTopoMap, contours and trails). Each is a free public tile source used *with* attribution.

The starting choice is per mode, not global: single-pin and places maps open on **Map**, and route mode opens on **Topographic** (`defaultBase` in `place-map.js`) because terrain suits a course.

⚠ **CARTO's basemaps now require an API key** (they started serving "API KEY REQUIRED" watermark tiles in August 2026). Both CARTO layers are gone: the third fixed style, **Streets** (CARTO Voyager), was dropped, and the themed **Map** default is now plain OpenStreetMap. Its dark variant is no longer a second tile URL but a CSS filter — `invert(1) hue-rotate(180deg)` plus a small brightness/contrast trim — applied to that one layer via Leaflet's `className` option (`.tiles-themed`), so Satellite and Topographic stay untouched. That also removed the `setUrl` theme dance described below; only the marker stroke is re-themed in JS now.

The control is a native `<select>`, not Leaflet's built-in `L.control.layers`. Two reasons: a base-layer choice is single-select, and `<select>` is the accessible native control for that (keyboard and screen reader for free, its option list drawn by the OS); and `L.control.layers`' collapsed toggle is a PNG (`images/layers.png`) the build doesn't ship — only `leaflet.css` is copied to `assets/components/`, not Leaflet's `images/` folder — so its icon would be broken. The `<select>` is added as a custom Leaflet control, which earns one thing for free: Leaflet controls are children of the map canvas, and the maximize button moves that same canvas into the overlay, so the switch rides into the enlarged map with no extra code — unlike the group chips, which are DOM siblings and have to be moved by hand.

Switching is a plain `map.removeLayer` / `map.addLayer`; Leaflet does the tile swap. But wiring the **attribution** to follow the active layer turned up two behaviors of Leaflet's that aren't in its docs.

⚠ **Leaflet wires attribution *removal* only for layers added via the `layeradd` event.** Give each layer an `attribution` option and the one attribution control auto-manages it — except the removal hook (`layer.once('remove', …)`) is attached only inside the `layeradd` handler. A layer added to the map *before* the attribution control is instead picked up by the control's `onAdd` catch-up loop, which calls `addAttribution` with **no** remove hook — so its credit sticks forever, and switching away leaves a growing pile ("© CARTO, Imagery © Esri, …"). The fix is ordering: create the themed base layer but `addTo(map)` it only *after* the attribution control exists, so it registers through `layeradd` and gets the removal hook.

⚠ **Within one Leaflet corner, the last-added control stacks nearest the edge.** To pin the attribution to the very bottom and sit the switch above it, the attribution control is added first and the switch second. (This composes with the fix above: attribution first, switch second, themed layer added last.)

The theme interaction is the other subtlety. **Map** still follows `data-theme`, but a manual Satellite/Topographic choice must survive a theme flip. The theme handler is a single `mapTiles.setUrl(TILES[theme])` on the themed layer, which redraws in place when that layer is shown and is a silent no-op when it's detached (Leaflet's `redraw()` bails without a map) — so flipping the theme while Satellite is up only updates a URL the "Map" layer will use next time it's picked; the visible map doesn't change. The route line and its start/finish symbols are vector shapes in the overlay pane, above the tiles, so they survive every base-layer swap. One tile-source gotcha: Esri's URL template is `{z}/{y}/{x}` — row before column, the reverse of the usual order.

Source: `_local/design/Plan - GPX route line on the activity map.md` (2026-08-11), verified against `place-map.js` and `route-geojson.js`. The base-layer switch: `_raw/dev-notes/How the place map switches tile styles.md` (2026-08-11), verified against `place-map.js` and `place-map.css`. The start/finish symbols were reworked from `divIcon` HTML markers into native vector shapes on 2026-08-16 (commit 30aade8), re-verified against `place-map.js` and `place-map.css`.
