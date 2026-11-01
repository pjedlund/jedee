---
description: "The MapLibre map component, drawn from stomme's Protomaps tiles, that upgrades server-rendered location data into a live map, and its three modes — single pin, a list of places, and a recorded route line."
date: 2026-08-11
updated: 2026-10-31
---

An interactive web map is a JavaScript widget: a library like [Leaflet](https://leafletjs.com) or [MapLibre](https://maplibre.org) draws tiled imagery and vector shapes onto a scrollable canvas. That means it does nothing without JavaScript, and its keyboard and screen-reader story is often poor. The durable way to ship one is progressive enhancement — server-render the underlying data as ordinary HTML that stands by itself (a list of places with a link each, or a static map image), then let JavaScript find that markup and grow the live map above it. The HTML is the answer for no-JS visitors and assistive tech; the map is a convenience layered on top.

A recurring trap is coordinate order. [GeoJSON](https://geojson.org) — the standard shape for map data — writes each position as `[longitude, latitude]`, x before y. MapLibre follows GeoJSON; Leaflet, and the way people say "lat/long" out loud, put latitude first. A track handed to the wrong one without a swap lands in the wrong hemisphere.

Map tiles come in two kinds. **Raster** tiles are finished pictures (PNGs) someone else rendered and styled. **Vector** tiles carry the geometry and names only, and the browser paints them with a style you write — every color, line width and label is yours. [Protomaps](https://protomaps.com) packages OpenStreetMap as vector tiles in a single file (PMTiles) that any static host can serve, because the browser fetches just the byte ranges it needs. A recorded path is a GeoJSON `LineString`: one `geometry.coordinates` array of `[lon, lat]` points.

## In stomme

`<place-map>` is a custom element, entirely stomme's (not Eleventy Excellent stock). It uses MapLibre so it can draw vector tiles in the site's colors (see *Our tiles* below). MapLibre is bundled straight into the component file by esbuild (about 289 KB over the wire with brotli and 1.1 MB unpacked, against 41 KB for Leaflet) and the whole thing is deferred behind `is-land on:visible`, so nothing loads until the map scrolls into view — the lazier cousin of [[The PhotoSwipe lightbox]]'s `on:idle`. `on:idle` alone would download the script and spend a mid-range phone's main thread on photo and audio pages whose map sits far down, for visitors who might never scroll there. It is `on:visible on:idle` — both must hold — because `on:visible` alone breaks the activity index: is-land checks visibility as soon as the parser reaches the opening tag, the map's `<template>` sits after a very long slotted table, and on a slow load the island goes ready before the template exists, so the script is never inserted and the preloader sweeps forever. `on:idle` waits for the page's `load` event, so the template is always there. The inline map drags and zooms with its buttons but never wheel- or pinch-zooms (that would trap the page scroll); a maximize button grows the *same* map instance into a modal overlay where wheel and pinch turn on, so pan/zoom state is preserved rather than rebuilt.

One element, three modes, chosen in `connectedCallback` purely by what markup is slotted inside it:

```js
const routeScript = this.querySelector('script[type="application/json"][data-route]');
const placeList = this.querySelector('[data-place-list]');
if (routeScript) this.initRoute(routeScript);
else if (placeList) this.initPlaces(placeList);
else this.initSinglePin();
```

- **Single pin** (photo and audio pages) — `data-lat`/`data-lon` on the element, with an empty `.place-map-live` box slotted in, as on the other two modes. The slot holds no static picture of the map: it would look nothing like the live map (grey roads, no parks), and the preloader covers the wait anyway. No-JS visitors get the place name in the meta line, which links to OpenStreetMap. Both layouts put the map at feature width in a 2:1 frame by wrapping it in a `<div class="feature">` that sets `--place-map-ratio: 2 / 1`, not through `@breakout`.
- **Places** (the activity index) — a slotted `[data-place-list]`: the activities table, one `<tr data-lat data-lon>` per located activity, each dot named and linked from the row's first link ([[Tables]]). The table *is* the data source and the no-JS / screen-reader path: map markers have poor keyboard and SR handling (Leaflet's were broken upstream; MapLibre's dots are painted on a canvas and not focusable at all), so nobody is forced through the map to reach a post. JavaScript reads the rows that carry coordinates and drops one dot each into the box above; rows without coordinates stay in the table, unmapped. Each row's `data-activity` sets a `--place-color` in `place-map-places.css`, from the type's `--color-activity-*` token (see below), resolved once per distinct value and shared by every row with that color. Resolving it once per row forces hundreds of page layouts and can freeze the page for over a second ([[Forced layout]]).

  An earlier version grouped the list by activity type, with the group headings upgraded into filter toggles and mirrored as chips on the map surface. That came out when the page became a single chronological index: the grouping was the only thing standing between the reader and a plain newest-first list of everything. Two lessons stayed behind. First, **reserve the map's space server-side** — the box was built and prepended on idle, so the whole page dropped by 16:9-of-the-column a second after paint; rendering an empty `.place-map-live` in the markup and having `buildBox()` adopt it takes the shift to zero. Second, **beware the double reverse**: the collection was already newest-first from `byCategory`, and the `located` filter reversed it again, so the visible list ran oldest-first without anyone noticing.
- **Route** (activity pages) — a slotted `<script type="application/json" data-route>` holding a GeoJSON `LineString`. This is the newest mode and the rest of this page is about it.

### A recorded route as the third mode

The track for an activity is committed as a sibling file next to the post: `<Post Title>.geojson` beside `<Post Title>.md`. It's extracted from a fitness-service export by a one-off local script, which handles both source formats the export ships:

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

It takes `page.inputPath`, **not** `page.fileSlug`. Eleventy strips a leading date from `fileSlug`, so a date-prefixed filename (`2026-08-02 Morning run.md`) would look for `2026-08-02 Morning run.geojson` under the slug `morning-run` and miss. `inputPath` is the real path on disk. `activity.njk` slots the result only when it exists, so an activity with no recorded track renders no map at all:

```njk
{% set routeJson = page.inputPath | routeGeoJSON %}
{% if routeJson %}
  <place-map @breakout="feature" @place="this route" @activity="{{ activityType | slugify }}">
    <div class="place-map-live" data-place-map-box style="--place-map-ratio: 2 / 1">
      <p class="place-map-pending">Map of this route</p>
    </div>
    <script type="application/json" data-route>{{ routeJson | safe }}</script>
  </place-map>
{% endif %}
```

Drawing it, the GeoJSON goes straight into a MapLibre `geojson` source — no coordinate swap, since MapLibre reads `[lon, lat]` natively. The line's color is read from `--color-route-line`, so it follows the theme.

The start and finish are drawn as the symbols of a printed course — a triangle at the start pointing down the first leg, two concentric circles at the finish. They're built in screen pixels at the fit zoom and then unprojected to lat/lon, so they become **geographic shapes** in their line layers: they grow and shrink with the map like the track does, with no per-zoom JavaScript. (The Leaflet version got the same result from an `L.polygon` and two `L.circle`s; an even earlier one used fixed-size HTML markers that needed a `scale()` on every zoom.) The circles are 48-point rings, since a MapLibre line layer has no circle shape.

The start triangle's apex is pinned exactly on the first point and the body trails back along the reverse of the travel direction. Centring it on the start, as a printed course does, was tried and reverted: the opening GPS fixes wander around the start, so the line was cut at odd angles near the triangle and the shape looked misplaced. At the other end the line stops where the outer finish circle begins, cut in screen pixels at the fit zoom like the symbols themselves (`trimToFinish` in `place-map.js`). The route's fit padding is derived from the symbol sizes, since the triangle and circles reach past the track's ends and a fixed 20 px clipped the finish at the map's edge. The symbols are drawn as thick as the line (`LINE_WEIGHT`), and the inner finish circle sits at about 70% of the outer. Keep the gap between `FINISH_OUTER` and `FINISH_INNER` wider than `LINE_WEIGHT`: thick rings drawn close together merge into one blob at the fit zoom, which is why the symbols grew when they took the line's weight. The heading is measured to the first track point **at least ~25 m out**, not the next GPS fix — the opening fixes cluster on the spot and a two-point bearing there is pure noise, so the triangle would point a random way. The shapes are hollow and share the line's color, the site's accent color. Orienteering overprint is purple, and a purple was tried — but the line has to read over several different tile sets, and it vanished on some of them; the accent color reads on all of them. There's deliberately **no halo**. None are interactive, since the map isn't the screen-reader path here.

On first paint a short intro sequences the pieces: while the tiles load a preloader counts to 100 (see *Waiting for the first tiles* below), the canvas fades up as it fades out (`[data-map-loading]` in `place-map.css`), then the start triangle fades in, the line draws itself start-to-finish, and the finish is revealed only once the line reaches it — all gated behind `prefers-reduced-motion`, so reduced-motion visitors just get the finished map. A canvas map has no SVG path to animate with `stroke-dashoffset`, so the draw is a **`line-gradient`** (which needs `lineMetrics: true` on the source): a `step` at the drawn fraction of the line, solid before it and transparent after, moved forward every animation frame. A theme flip mid-draw rebuilds the style, and `setPaintProperty` throws "Style is not done loading" until it's back — the loop skips those frames, and keeps the progress in component state so the rebuilt style carries it.

The no-JS answer for a route is the honest one: no map, but the stats and the link to the original recording below carry the route. A blank or broken map is never shown — malformed JSON or too few points also just leaves the page mapless with that link standing. Route lines live on the activity pages; that page's overview map is the *groups* mode of this same component.

### Widening the map: the breakout must go on the `<is-land>`

The route map sits at `.feature` width — two steps wider than the prose column, see [[Layout breakouts]] — in the same 2:1 panoramic frame as the photo and audio location maps, set by `--place-map-ratio: 2 / 1` on the box . Getting the breakout class onto the right element is the trap. `<place-map>` is a WebC component whose template is `<is-land on:visible on:idle><place-map webc:root webc:keep>…`. Because `webc:root` is on the **inner** `<place-map>`, any attribute on the invocation (`class="popout"`) merges onto that inner element — which is a grid *grand*child (the `<is-land>` wraps it), and breakout classes only work on a direct grid child. So a class on the invocation silently does nothing; the map stays at content width.

The fix routes the class onto the `<is-land>` itself via a prop: the component takes `:class="breakout || ''"` on its `<is-land>`, and `activity.njk` passes `@breakout="feature"`. Two details that bite: the `|| ''` guard is load-bearing — a bare `:class="breakout"` throws `Cannot read properties of undefined (reading 'toString')` at build time for every caller that omits the prop (the places index, the single-pin photo maps), and `|| false` renders a literal `class="false"` because WebC stringifies a falsy `:class` rather than dropping it; only `|| ''` cleanly omits the attribute. The breakout also collapses back to content width on narrow screens automatically — that is the `.wrapper` grid working as designed, not a bug.

### A `<script>` is only hidden by a default, and a default is easy to beat

The route JSON is slotted into the component as an ordinary `<script type="application/json" data-route>`. Nothing hides it but the browser's UA stylesheet, which carries `script { display: none }` — a real rule in the lowest-priority sheet there is, not a property of the element. Any author rule that reaches the element and sets `display` to something else puts the script's text on the page.

That is what happened here. The component's stylesheet gives whatever follows the map some air:

```css
place-map > .place-map-live + * {
  display: block;
  margin-block-start: var(--space-l);
}
```

The `display: block` is deliberate: on `/activities/` the element after the map is `<sortable-table>`, an unregistered custom element, so it is `display: inline` by default and would ignore `margin-block-start` entirely. On an activity page the element after the map is the route script instead — same selector, same rule — and about 4 kB of coordinates printed under the map in the body text. Narrowed to `+ :not(script, link)`, because the stylesheet `<link>` that the island injects becomes the next sibling of a single-pin map, and its margin would leave a gap under the map.

Two things worth keeping. The first is that `display: block` on a `+ *` selector is a wider hazard than it looks: the sibling combinator picks the next *element*, and `<script>`, `<template>`, `<style>` and `<link>` are all elements that happen to be hidden only by a default. The second is a small relief — `:not(script)` takes the specificity of its argument, a type selector, so the fix raised the selector from (0,1,1) to (0,1,2) rather than lowering it, and nothing that had been winning against it started losing.

The same thing happens from the other direction: a route map sits inside `.prose`, so the prose rules reach into MapLibre's markup. Its attribution is a `<details>`, and [[Vertical rhythm|prose-rhythm]]'s `.prose details > summary + *` gave the text inside a half-line top margin, doubling the white box behind it. `place-map.css` sets that margin back to 0. Any third-party widget placed inside `.prose` inherits the prose spacing, so check its built markup for elements the prose rules target.

### Our tiles

Every map opens on one basemap: a Protomaps extract of one country (a `.pmtiles` file at full detail to zoom 15), cut from the free daily world build with `pmtiles extract … --bbox=<west>,<south>,<east>,<north> --maxzoom=15` and hosted on a static host. Two constants at the top of `place-map.js` name it: `TILES_URL` and `COVERAGE`, the extract's bounding box. The shipped values are a single-country extract, so a site elsewhere changes both. Plain OpenStreetMap tiles would need a CSS `invert()` filter for dark mode, and ready-made dark basemaps may demand an API key. Everything the map needs besides the tiles is self-hosted in `src/assets/map/`: the label fonts (only the Latin, Greek and Cyrillic glyph ranges — MapLibre asks for a range per character block and draws a missing one locally, with a console warning) and the icon sprites.

The colors are **CSS custom properties**, `--map-land`, `--map-water`, `--map-park`, `--map-buildings`, `--map-road`, `--map-road-minor`, `--map-label*` and `--map-dot-stroke`, set in `place-map.css` from the site's tokens with dark-mode overrides. On every render the component reads them and passes them to Protomaps' theme code as a custom "flavor", so tweaking the map is a CSS edit, and a theme flip just re-renders. Two traps:

- **MapLibre can't parse `color-mix()` or `oklab()`**, and a custom property's computed value is the unresolved text. The component resolves each one by painting it into a 1×1 canvas and reading the pixel back as `rgba()`, and remembers the result by value, because each probe forces a layout of the whole page ([[Forced layout]]).
- **The properties sit on the map canvas, not on `<place-map>`**, because the maximize button moves the canvas into an overlay outside the element, where it would stop inheriting them.

**The tile file is empty outside its coverage.** A single pin, place list or route that reaches past the box opens on Topographic instead (`COVERAGE` in `place-map.js`).

The whole style (base layers plus the dots, route and symbols) is rebuilt by one `render()` and applied with `setStyle(style, { diff: true })`, which changes only what differs. The very first render must skip `diff`: diffing against the empty placeholder style before it has loaded logs a warning and rebuilds anyway.

**MapLibre loads a style on an animation frame**, and browsers pause those in a hidden tab. A map on a background tab (or in Claude's Browser pane while it's hidden) stays blank with `isStyleLoaded()` false until the tab is shown — not a bug.

### Waiting for the first tiles

Tiles arrive over the network, so between the page's first paint and a drawn map there is a gap of a second or more — several on a slow connection, where the 289 KB map script (brotli) alone takes a while. The preloader covers it as one movement in phases, one thing at a time, the way Flash intros baked their loading into the transition:

- **The box fades in** in `--map-park`, the map's park color (350 ms). A loading state that is already one of the map's colors reads as the map arriving rather than as a placeholder.
- After a 100 ms pause, **the site logo grows in** from 200% to its resting 6rem with the number hidden (500 ms). On the activity index the preloader is in the page HTML, so this starts on the first paint without waiting for the script; elsewhere the script creates it. The logo is a `conic-gradient` masked to its shape (the path is copied into `place-map.css`, since `logo.svg` isn't published), filling from 30° so the stem fills last, in the box's park color darkened 12% (lightened 12% in dark mode, through `--map-park-shade`, where a darker green sank into the dark track). A sweep from the centre crosses the straight-sided stem at a slant and leaves a wedge-shaped sliver at the end, so a second layer — a `linear-gradient` sized and positioned to the stem's rectangle in the logo's 100-unit grid — covers it and wipes left to right over the last 30° of the sweep: `clamp(0, (progress − 91.667) / 8.333, 1)`. At 91.667% the sweep's edge is the vertical line through the logo's centre, which is the stem's left edge, so the hand-over doesn't show.
- **If the script still hasn't arrived after 1.4 s, a comet sweeps** round inside the logo: a `::before` with a fading conic gradient, rotated by a CSS animation every 1.5 s. A plain rotation keeps turning while the main thread is busy, where a script-driven spinner would freeze. On broadband the count starts before the delay ends, so the comet never shows.
- **The count** starts once the reveal has finished and the script has arrived: 0 → 100 along one easeInOutQuad sequence of about 1.8 s. The real load never sets the number. It only steers the sequence's *speed*: while MapLibre hasn't fired its first `idle`, the speed falls off gradually from early in the count, so a slow load stretches the whole count instead of piling up at 98–99, and the speed glides back once the map is ready. The maths is a pure function in `src/assets/scripts/preloader-count.js`, kept out of the bundled script so `tests/preloader-count.test.js` can run it at a simulated 60 fps for several load times.
- At 100 **the logo grows back to 200% and fades out** over 400 ms as the canvas (`[data-map-loading]` until then) fades in. A route's intro waits for that fade (`revealed` in `place-map.js`), so the line is never drawn across an empty box.

The script adopts the server-rendered box and empties it, but must leave the preloader node where it is: taking it out and putting it back, as `replaceChildren()` does, counts as a new element and replays its reveal. The canvas is then prepended so the preloader stays on top. The count waits on `getAnimations()` of the preloader itself, never `{ subtree: true }`, which would include the endless comet and never finish.

The knobs: `COUNT`, `BRAKE` and `GLIDE` in `preloader-count.js`, `COUNT_PAUSE` and `MAP_FADE` in `place-map.js`, and the durations and delays on `.place-map-preloader` in `place-map.css`.

**A caption meant for no-JS visitors will flash.** The activity index renders its map box server-side to reserve the space, and the caption inside it — *Map of the activities* — showed for as long as the island took to hydrate. It is now hidden under [`@media (scripting: enabled)`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/scripting), the mirror of the `scripting: none` rule in [[The main menu]]: the text is only for the visitor who will never get a map, and `visibility: hidden` keeps the box's height either way. Pre-hydration text is worth a second look in general — it is written for a case that most visitors pass through rather than land in.

Reduced motion removes the fades, the scaling and the comet (the logo shows dimmed until the count starts); the count itself still runs, since a changing number isn't motion. Without JavaScript the preloader is hidden under `@media (scripting: none)`, since nothing would ever finish it.

**Coming back skips it.** A page reached by Back or Forward that the browser had to reload (no back/forward cache) shows no preloader: the canvas stays hidden until the first tiles are drawn, which is usually well under a second, because the tiles are already in the HTTP cache. `place-map.js` checks the navigation type (`CAME_BACK`). The cache itself is lost to any `unload` handler in the page, and an extension's content script counts. A browser extension can count too. The dev server never gets the back/forward cache, because its live-reload connection blocks it.

### One declaration, two themes

The map's colors are CSS custom properties — `--map-land`, `--map-water`, `--map-park` and seven more — set on `.place-map-live` and on the canvas, and read back by `place-map.js` on every render, so a theme flip or a devtools tweak redraws the map without touching JavaScript. They are declared in **three** blocks: a light one, a `[data-theme='dark']` one, and a `prefers-color-scheme: dark` copy of the second. The dark blocks override only the properties that actually differ.

**Every property the dark blocks leave out is served by the light block's single declaration, in both themes.** Raising the light park tint also raises the dark one if dark never declared `--map-park`; holding dark where it was takes a new declaration in each dark block. Before changing a themed custom property, check whether the other theme overrides it — one that appears once is shared, and the diff reads the same either way. The mirror of [[Undefined custom properties]], where the reference is the thing that is missing rather than the override.

**The dots' colors are read on every render too.** Each activity type has one color, `--color-activity-*` in `src/assets/css/local/activity-colors.css`, loaded with any page that shows an activity, used for its map dots, its icon in the table and its icon on the post's meta line. A type's color can differ per theme, and the places mode used to read each dot's color once, when it built the dots, so a theme flip left the map in the old theme's color. ⚠ Any color that differs between themes has to be read inside `overlays()`, not once when the map is built.

A route page's line takes the same color: the layout passes `@activity` to `<place-map>`, which renders it as `data-activity`, and `place-map-places.css` sets `--color-route-line` from the type's color. So each activity type draws its route in a color of its type. ⚠ A plain attribute on `<place-map>` in the layout is dropped by WebC; only the props the component declares (`:data-*`) reach the element. On the map, a type's shade can follow the map under it rather than the page theme. Topographic tiles are always light and satellite imagery always dark, so a page-theme color put the light orange on light topo in dark mode and the dark orange over forest in light mode. `place-map.js` sets `data-map-surface` (light or dark) on `<place-map>` on every render, and `place-map-places.css` swaps `--place-color` and `--color-route-line` to `--color-activity-<type>-on-light` or `-on-dark`. The table and meta-line icons sit on the page, so they keep following the theme.

### A base-layer style switch

A control in the bottom-right corner switches between **Map** (stomme's tiles) and two fixed raster styles: **Satellite** (Esri World Imagery) and **Topographic** (OpenTopoMap, contours and trails). Every mode opens on Map, routes included; before the move, routes opened on Topographic. One tile-source gotcha: Esri's URL template is `{z}/{y}/{x}` — row before column, the reverse of the usual order.

The control is a native `<select>`: a base-layer choice is single-select, and `<select>` is the accessible native control for that (keyboard and screen reader for free, its option list drawn by the OS). It's a MapLibre control, so it's a child of the map canvas and rides into the maximize overlay with no extra code. Switching just sets the base and re-renders. MapLibre's attribution control credits only the sources that currently have visible layers, so the credit follows the switch by itself (the Leaflet version needed a careful add order to get attribution *removal* right). In a bottom corner the last-added control sits nearest the top, so the attribution is added first and the switch second.

The inline map keeps the old gesture rules: no wheel or pinch zoom (that would trap the page scroll) except with <kbd>Ctrl</kbd> or <kbd>⌘</kbd> held, which is also how a trackpad pinch arrives; rotation and tilt are off everywhere.

Verified against `place-map.js`, `place-map.css` and `route-geojson.js`.
