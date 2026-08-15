// <place-map> — upgrades a slotted static map into a live, maximizable Leaflet map.
// esbuild (build-js.js) bundles Leaflet into this component file, exactly like
// PhotoSwipe in photo-lightbox.js — nothing loads until the is-land hydrates on idle.
// The inline map is live (drag + zoom buttons) but never wheel/pinch-zooms, so the page
// keeps scrolling. The maximize button grows THE SAME map instance into a modal overlay
// where wheel + pinch turn on; pan/zoom state is preserved because it's one map, not a
// rebuilt second one. Esc / backdrop / close button exit, focus returns to the trigger.
//
// Three modes, decided by the slotted markup:
//  - single pin (photo pages): data-lat/data-lon on the element, static <a><img> slot.
//  - places (the activity index): a slotted [data-place-list] of <li data-lat data-lon>
//    items. The LIST is the data source and the no-JS/screen-reader path (Leaflet
//    markers' keyboard/SR handling is broken upstream, so nobody is forced through the
//    map). JS drops one dot per item into the box above it.
//  - route (an activity post): a slotted GeoJSON LineString.
import L from 'leaflet';

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
// Alternate base layers offered by the tile switch (the themed "Map" default is built
// per-map in makeMap). All free to use WITH attribution — Leaflet shows the active
// layer's automatically. Esri's World Imagery URL is {z}/{y}/{x} (row before column).
const BASE_LAYERS = [
  [
    'Satellite',
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, attribution: 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics' },
  ],
  [
    'Topographic',
    'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 17,
      attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    },
  ],
  ['Streets', 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 20, attribution: ATTRIB }],
];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Marker keeps the site's orange; read the token so it tracks the palette.
const MARKER_FILL =
  getComputedStyle(document.documentElement).getPropertyValue('--color-accent-orange').trim() || '#d0621e';

// Orienteering route symbols — start = triangle, finish = double concentric circles —
// drawn Lucide-style (24 viewBox, round joins, no fill). Their color and a light/dark
// halo live in place-map.css and track data-theme on their own, so a divIcon (which,
// unlike addDot's circleMarker, gets neither the theme re-stroke nor the zoom-swell)
// needs no JS theming here.
const START_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" aria-hidden="true"><path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3L13.73 4z"/></svg>';
const FINISH_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>';
const routeSymbol = (className, html) =>
  L.divIcon({ className, html, iconSize: [24, 24], iconAnchor: [12, 12] });

// Follow the page theme (the site sets data-theme; fall back to the OS setting) so the
// inline map and the overlay always show matching light/dark tiles.
function pageTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark' || t === 'light') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
// Stroke = the theme's background, so the dot always reads a clean halo.
const markerStroke = (theme) => (theme === 'dark' ? '#141619' : '#ffffff');

// Marker popup: the date in italics, then the place's name on its own line, linked to
// the post. Styling is in place-map.css.
const popupHtml = (p) => {
  const name = p.url ? `<a href="${p.url}">${p.name}</a>` : p.name;
  return p.date ? `<i class="place-popup-date">${p.date}</i>${name}` : name;
};

// A compact base-layer switch (bottom-right). A native <select> — correct single-choice
// semantics, keyboard + screen-reader support for free — instead of Leaflet's own layers
// control, whose toggle icon is a PNG the build doesn't ship. As a Leaflet control it lives
// inside the map container, so it rides into the maximize overlay with the canvas for free.
function addTileSwitch(map, bases) {
  const names = Object.keys(bases);
  const control = L.control({ position: 'bottomright' });
  control.onAdd = () => {
    // `leaflet-control` restores pointer-events (the corner containers set none) — without
    // it the select can't be clicked.
    const wrap = L.DomUtil.create('div', 'place-map-tiles leaflet-control');
    const select = L.DomUtil.create('select', '', wrap);
    select.setAttribute('aria-label', 'Map style');
    for (const n of names) select.append(new Option(n, n));
    let shown = bases[names[0]]; // "Map" is on the map at start
    select.addEventListener('change', () => {
      map.removeLayer(shown);
      shown = bases[select.value];
      map.addLayer(shown);
    });
    L.DomEvent.disableClickPropagation(wrap); // a click on the select must not pan the map
    L.DomEvent.disableScrollPropagation(wrap);
    return wrap;
  };
  control.addTo(map);
}

// Build one live map. Wheel + pinch start disabled (toggled on when maximized); drag,
// keyboard and the +/- zoom control stay on inline so the map is usable in place.
// Returns { map, addDot } — dots added through addDot get theme re-stroking and the
// grow-a-little-on-zoom behavior, whichever layer they sit in.
function makeMap(el, { center, zoom, bounds, place }) {
  let theme = pageTheme();
  const map = L.map(el, {
    zoomControl: false,
    attributionControl: false, // we add our own (prefix-less) one below
    scrollWheelZoom: false, // enabled only when maximized (else it traps page scroll)
    touchZoom: false, // ditto — no pinch-trap inline
    zoomAnimation: !REDUCED,
    fadeAnimation: !REDUCED,
    markerZoomAnimation: !REDUCED,
  });
  const fit = () => map.fitBounds(bounds, { padding: [28, 28] });
  if (bounds) {
    fit();
    // A map fitted while its container has no size (hidden tab, collapsed viewport)
    // computes a garbage zoom — refit once it gets its first real size.
    if (!el.clientWidth)
      map.once('resize', () => {
        fit();
        refZoom = map.getZoom();
      });
  } else map.setView(center, zoom);
  el.dataset.placeMapCanvas = ''; // styling hook that outranks leaflet.css
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', place ? `Map of ${place}` : 'Map of this location');
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  // "Map" = the themed CARTO basemap (its light/dark tracks the page theme; see onTheme).
  // Satellite / Topographic / Streets are fixed styles. Each layer carries its own
  // attribution option, so the single attribution control shows whichever base is active.
  const mapTiles = L.tileLayer(TILES[theme], { maxZoom: 19, attribution: ATTRIB });
  const bases = { Map: mapTiles };
  for (const [name, url, opts] of BASE_LAYERS) bases[name] = L.tileLayer(url, opts);

  // Attribution first, switch second: in a Leaflet corner the LAST-added control stacks on
  // top, so this pins the attribution to the bottom edge with the switch just above it.
  L.control.attribution({ prefix: false }).addTo(map);
  addTileSwitch(map, bases); // bottom-right, above the attribution
  // Add "Map" only now — AFTER the attribution control exists — so it registers through the
  // control's `layeradd` handler, which is what also wires attribution REMOVAL on layer
  // remove. Add it earlier and its credit would stick when you switch away (Leaflet only
  // attaches the removal hook to layers added via layeradd, not its onAdd catch-up loop).
  mapTiles.addTo(map);

  // Ctrl/⌘ + wheel zooms the inline map around the pointer; a PLAIN wheel keeps
  // scrolling the page (no scroll trap — the reason scrollWheelZoom stays off inline).
  // Trackpad pinch arrives as ctrlKey wheel events, so pinch-to-zoom works too.
  // When maximized, Leaflet's own (enabled) handler owns the wheel — skip.
  el.addEventListener(
    'wheel',
    (e) => {
      if (!(e.ctrlKey || e.metaKey) || map.scrollWheelZoom.enabled()) return;
      e.preventDefault();
      map.setZoomAround(map.mouseEventToLatLng(e), map.getZoom() + (e.deltaY < 0 ? 1 : -1));
    },
    { passive: false }
  );

  const dots = [];
  const addDot = (lat, lon, { fill = MARKER_FILL, layer, popup } = {}) => {
    const dot = L.circleMarker([lat, lon], {
      radius: 7,
      weight: 2,
      color: markerStroke(theme),
      fillColor: fill,
      fillOpacity: 0.9,
    }).addTo(layer || map);
    if (popup) dot.bindPopup(popup);
    dots.push(dot);
    return dot;
  };

  // Dots swell a little as you zoom in, shrink out — clamped (circleMarker radius is
  // screen px, constant per zoom level).
  let refZoom = map.getZoom();
  map.on('zoomend', () => {
    const r = Math.max(4, Math.min(13, 7 + (map.getZoom() - refZoom) * 0.8));
    dots.forEach((d) => d.setRadius(r));
  });

  // Re-tile + re-stroke when the site theme flips, so the map never keeps stale
  // light/dark tiles after a toggle (old inline-map bug).
  const onTheme = () => {
    const next = pageTheme();
    if (next === theme) return;
    theme = next;
    // Redraws in place when "Map" is the shown layer; a no-op on the theme-agnostic
    // alternates (setUrl on a detached layer just stores the URL for next time it's shown),
    // so a theme flip never overrides a manual Satellite/Topo/Streets choice.
    mapTiles.setUrl(TILES[theme]);
    dots.forEach((d) => d.setStyle({ color: markerStroke(theme) }));
  };
  new MutationObserver(onTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);

  return { map, addDot };
}

// --- shared maximize overlay (one per page, built on first open). It's just a themed
// scrim + frame; the live map canvas is MOVED into it on open and back out on close. ---
let overlay;
let overlayFrame;
let closeBtn;
let active = null; // the PlaceMap currently maximized

function buildOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'place-map-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'place-map-overlay-close';
  closeBtn.setAttribute('aria-label', 'Close map');
  closeBtn.innerHTML = '<span aria-hidden="true">&#10005;</span>';

  overlayFrame = document.createElement('div');
  overlayFrame.className = 'place-map-overlay-frame';

  overlay.append(closeBtn, overlayFrame);
  document.body.append(overlay);

  closeBtn.addEventListener('click', () => active?.close());
  // Click the backdrop (not the frame) to close.
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) active?.close();
  });
  addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Escape') active.close();
    else if (e.key === 'Tab') trapTab(e);
  });
}

// Keep Tab focus inside the open dialog (Leaflet's zoom/attribution links + the map
// container + the close button are the focus stops).
function trapTab(e) {
  const f = overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    last.focus();
    e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus();
    e.preventDefault();
  }
}

class PlaceMap extends HTMLElement {
  connectedCallback() {
    this.place = this.dataset.place || '';
    const routeScript = this.querySelector('script[type="application/json"][data-route]');
    const placeList = this.querySelector('[data-place-list]');
    if (routeScript) this.initRoute(routeScript);
    else if (placeList) this.initPlaces(placeList);
    else this.initSinglePin();
  }

  // The live inline slot. Its aspect-ratio holds the box, so moving the canvas out to
  // the overlay (and back) never shifts the page.
  //
  // A page whose slot has nothing else holding the space (the activity index — a list,
  // no static map image) renders the box server-side and we adopt it here. Building it
  // on idle instead pushed the whole page down a second after paint.
  buildBox() {
    this.box = this.querySelector('[data-place-map-box]');
    const adopted = Boolean(this.box);
    if (adopted) this.box.replaceChildren(); // drop the no-JS caption
    else {
      this.box = document.createElement('div');
      this.box.className = 'place-map-live';
    }
    this.canvas = document.createElement('div');
    this.canvas.className = 'place-map-canvas';
    this.box.append(this.canvas);

    this.maxBtn = document.createElement('button');
    this.maxBtn.type = 'button';
    this.maxBtn.className = 'place-map-maximize';
    this.maxBtn.setAttribute('aria-label', this.place ? `Enlarge map of ${this.place}` : 'Enlarge map');
    this.maxBtn.innerHTML = '<span aria-hidden="true">⛶</span>';
    this.box.append(this.maxBtn);

    if (!adopted) this.prepend(this.box);

    // Keep the canvas a WHOLE number of pixels. The box's fluid 16:9 sizing lands on
    // fractions (e.g. 514.375px tall); Leaflet then puts tiles on fractional offsets
    // and rounding opens hairline gaps between them — seen as grid lines / plus-sign
    // dots of the surface color. An integer canvas puts every tile on whole pixels.
    // (Sized from whichever parent currently holds the canvas, so the maximize
    // overlay gets the same treatment. The ≤1px remainder hides under the box border.)
    this.fitCanvas = () => {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      this.canvas.style.inlineSize = parent.clientWidth + 'px';
      this.canvas.style.blockSize = parent.clientHeight + 'px';
      this.mapObj?.map.invalidateSize();
    };
    this.fitCanvas(); // before the map initializes, so its very first layout is integer
    new ResizeObserver(this.fitCanvas).observe(this.box);
  }

  finishInit() {
    requestAnimationFrame(this.fitCanvas);
    this.maxBtn.addEventListener('click', () => this.open());
    this.dataset.mapReady = '';
  }

  initSinglePin() {
    if (!this.dataset.lat) return; // no coords → leave the static map
    const lat = Number(this.dataset.lat);
    const lon = Number(this.dataset.lon);
    const zoom = Number(this.dataset.zoom) || 13;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    this.buildBox();
    this.mapObj = makeMap(this.canvas, { center: [lat, lon], zoom, place: this.place });
    this.mapObj.addDot(lat, lon);
    this.finishInit();
  }

  // Route mode: a slotted GeoJSON LineString (from the post's committed .geojson).
  // Draw the track fitted to its bounds, an orienteering start triangle and a finish
  // double-circle. No slotted list here — the no-JS path is the "View on Strava" link.
  initRoute(script) {
    let gj;
    try {
      gj = JSON.parse(script.textContent);
    } catch {
      return; // malformed data → leave the page mapless, Strava link still stands
    }
    const coords = gj?.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const latlngs = coords.map(([lon, lat]) => [lat, lon]); // GeoJSON [lon,lat] → Leaflet [lat,lon]

    this.buildBox();
    this.mapObj = makeMap(this.canvas, {
      bounds: L.latLngBounds(latlngs),
      place: this.place,
    });
    L.polyline(latlngs, { color: MARKER_FILL, weight: 4, opacity: 0.9 }).addTo(this.mapObj.map);

    // Start + finish: the standard orienteering symbols, centered on the track's ends.
    // Neither is a keyboard stop — the map isn't the screen-reader path here.
    L.marker(latlngs[0], { icon: routeSymbol('route-start-symbol', START_SVG), keyboard: false }).addTo(this.mapObj.map);
    L.marker(latlngs.at(-1), { icon: routeSymbol('route-finish-symbol', FINISH_SVG), keyboard: false }).addTo(this.mapObj.map);

    this.finishInit();
  }

  // Places mode: the slotted list is the data source. Parse every item that carries
  // coordinates, fit the map to them, one dot each. Items without coordinates (indoor
  // sessions) stay in the list and simply aren't on the map.
  initPlaces(root) {
    const places = [...root.querySelectorAll('[data-lat]')]
      .map((el) => {
        const a = el.querySelector('a');
        return {
          lat: Number(el.dataset.lat),
          lon: Number(el.dataset.lon),
          date: el.dataset.date || '',
          name: a?.textContent.trim() || el.textContent.trim(),
          url: a?.getAttribute('href'),
        };
      })
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (!places.length) return; // nothing to map → leave the plain list

    this.buildBox();
    this.mapObj = makeMap(this.canvas, {
      bounds: L.latLngBounds(places.map((p) => [p.lat, p.lon])),
      place: this.place,
    });
    for (const p of places) this.mapObj.addDot(p.lat, p.lon, { popup: popupHtml(p) });

    this.finishInit();
  }

  open() {
    if (!overlay) buildOverlay();
    active = this;
    overlayFrame.append(this.canvas); // move the SAME map into the overlay
    overlay.setAttribute('data-open', '');
    overlay.setAttribute('aria-label', this.place ? `Map showing ${this.place}` : 'Interactive map');
    this.canvas.setAttribute('aria-label', this.place ? `Interactive map of ${this.place}` : 'Interactive map of this location');
    document.body.style.overflow = 'hidden';
    this.mapObj.map.scrollWheelZoom.enable();
    this.mapObj.map.touchZoom.enable();
    closeBtn.focus(); // move focus into the dialog now that it's visible
    if (!this.roOverlay) {
      new ResizeObserver(this.fitCanvas).observe(overlayFrame);
      this.roOverlay = true;
    }
    requestAnimationFrame(this.fitCanvas);
  }

  close() {
    this.mapObj.map.scrollWheelZoom.disable();
    this.mapObj.map.touchZoom.disable();
    overlay.removeAttribute('data-open');
    document.body.style.overflow = '';
    this.box.prepend(this.canvas); // move the map back inline
    this.canvas.setAttribute('aria-label', this.place ? `Map of ${this.place}` : 'Map of this location');
    requestAnimationFrame(this.fitCanvas);
    active = null;
    this.maxBtn.focus();
  }
}

customElements.define('place-map', PlaceMap);
