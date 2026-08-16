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

// Orienteering route symbols — start = triangle (apex on the track's first point, pointing
// down the first leg), finish = two concentric circles on the track's end. Drawn as NATIVE
// Leaflet vector geometry (an L.polygon + two L.circle) in the same overlay pane as the route
// line, so Leaflet re-projects them on zoom for free — they scale with the map like the line,
// no manual zoom-scaling. Hollow (stroke only), orienteering-style; color tracks the theme via
// CSS (.route-start-symbol / .route-finish-symbol set `stroke`), the same trick the line uses.
// Sizes below are PIXELS AT THE FIT ZOOM — the shapes are built in screen pixels then frozen to
// lat/lon, so they look about this size when the map first fits and grow/shrink from there. This
// is the calibration knob: eyeball the numbers against the tiles.
const TRI_HEIGHT = 18; // triangle apex-to-base, px at fit zoom
const TRI_HALF_WIDTH = 9; // triangle base half-width, px
const FINISH_OUTER = 9; // finish outer circle radius, px at fit zoom
const FINISH_INNER = 4; // finish inner circle radius, px
const SYMBOL_WEIGHT = 2.5; // stroke width, px (constant across zoom, like the line's)

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
function addTileSwitch(map, bases, defaultBase = Object.keys(bases)[0]) {
  const names = Object.keys(bases);
  const control = L.control({ position: 'bottomright' });
  control.onAdd = () => {
    // `leaflet-control` restores pointer-events (the corner containers set none) — without
    // it the select can't be clicked.
    const wrap = L.DomUtil.create('div', 'place-map-tiles leaflet-control');
    const select = L.DomUtil.create('select', '', wrap);
    select.setAttribute('aria-label', 'Map style');
    for (const n of names) select.append(new Option(n, n));
    select.value = defaultBase; // match the layer makeMap put on the map at start
    let shown = bases[defaultBase];
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
function makeMap(el, { center, zoom, bounds, place, defaultBase = 'Map', fitPadding = [28, 28] }) {
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
  const fit = () => map.fitBounds(bounds, { padding: fitPadding });
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
  addTileSwitch(map, bases, defaultBase); // bottom-right, above the attribution
  // Add the default base only now — AFTER the attribution control exists — so it registers
  // through the control's `layeradd` handler, which is what also wires attribution REMOVAL on
  // layer remove. Add it earlier and its credit would stick when you switch away (Leaflet only
  // attaches the removal hook to layers added via layeradd, not its onAdd catch-up loop).
  bases[defaultBase].addTo(map);

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
      defaultBase: 'Topographic', // terrain suits an orienteering route
      fitPadding: [20, 20], // sit a little closer to the track than the default, with room for the symbols
    });
    // The course line — a lighter blue, styled via CSS (.route-line) so it tracks the theme
    // like the symbols.
    const line = L.polyline(latlngs, { weight: 4, opacity: 0.9, className: 'route-line' }).addTo(this.mapObj.map);

    // Start + finish: the standard orienteering symbols, drawn as native vector shapes so they
    // scale with the map on zoom like the line does (no fixed-screen-size marker, no manual
    // zoom-scaling). The start triangle's apex sits on the track's first point and it points down
    // the first leg — aimed at the first point at least ~25 m out, because the opening GPS fixes
    // cluster on the spot and a 2-point bearing there is pure noise. None are interactive — the
    // map isn't the screen-reader path here.
    const map = this.mapObj.map;
    const startLL = latlngs[0];
    const endLL = latlngs.at(-1);
    let aheadLL = endLL;
    for (let i = 1; i < latlngs.length; i++) {
      if (map.distance(startLL, latlngs[i]) >= 25) {
        aheadLL = latlngs[i];
        break;
      }
    }

    // Build the triangle in screen pixels at the current (fit) zoom, then unproject to lat/lon so
    // it becomes fixed geographic geometry. Apex pinned exactly on the start point; the body trails
    // back along the reverse of the travel direction, base vertices offset by the perpendicular.
    const z = map.getZoom();
    const p0 = map.project(startLL, z);
    const p1 = map.project(aheadLL, z);
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const ux = (p1.x - p0.x) / len;
    const uy = (p1.y - p0.y) / len; // unit travel direction, screen px
    const bx = p0.x - ux * TRI_HEIGHT;
    const by = p0.y - uy * TRI_HEIGHT; // base midpoint, behind the apex
    const startShape = L.polygon(
      [
        startLL,
        map.unproject(L.point(bx - uy * TRI_HALF_WIDTH, by + ux * TRI_HALF_WIDTH), z),
        map.unproject(L.point(bx + uy * TRI_HALF_WIDTH, by - ux * TRI_HALF_WIDTH), z),
      ],
      { className: 'route-start-symbol', weight: SYMBOL_WEIGHT, fill: false, interactive: false }
    ).addTo(map);

    // Finish = two concentric circles on the end point. L.circle's radius is in METRES, so it
    // scales with zoom too; convert the fit-zoom pixel radii via the local metres-per-pixel.
    const c = map.getCenter();
    const mpp = map.distance(c, map.unproject(map.project(c, z).add(L.point(64, 0)), z)) / 64;
    const finishCircle = (px) =>
      L.circle(endLL, { radius: px * mpp, className: 'route-finish-symbol', weight: SYMBOL_WEIGHT, fill: false, interactive: false }).addTo(map);
    const finishShapes = [finishCircle(FINISH_OUTER), finishCircle(FINISH_INNER)];

    // Intro on first paint: fade the map up, fade the start in, draw the line, reveal the finish.
    if (!REDUCED) this.routeIntro(line, startShape, finishShapes);

    this.finishInit();
  }

  // Sequenced route intro: (0) fade the whole canvas up, (1) fade the START symbol in, (2) draw
  // the line start → finish, (3) reveal the FINISH once the line reaches it. Only called when
  // motion is allowed, so under reduced motion everything is left in its resting, visible state.
  routeIntro(line, startShape, finishShapes) {
    const MAP_FADE = 500; // canvas fade-up
    const MARK_FADE = 320; // symbol fade
    const LINE_DRAW = 3400; // slow line sweep

    const path = line._path;
    const startEl = startShape._path; // the polygon's SVG <path>
    const finishEls = finishShapes.map((s) => s._path).filter(Boolean);
    const fadeIn = (el) => {
      if (!el) return;
      el.style.transition = `opacity ${MARK_FADE}ms ease-out`;
      el.style.opacity = '1';
    };

    // Hide the line (a full-length dash), the start, and — until the line arrives — the finish.
    if (path && path.getTotalLength) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
    }
    if (startEl) startEl.style.opacity = '0';
    finishEls.forEach((el) => (el.style.opacity = '0'));

    // (0) fade the canvas up.
    this.canvas.style.opacity = '0';
    this.canvas.getBoundingClientRect(); // flush so the fades below start from 0
    this.canvas.style.transition = `opacity ${MAP_FADE}ms ease-out`;
    this.canvas.style.opacity = '1';

    // (1) once the map is up, fade the START symbol in.
    setTimeout(() => fadeIn(startEl), MAP_FADE);

    // (3) reveal the FINISH when the line reaches it. Clearing the dash here doubles as the
    // zoom-bug fix: a leftover dasharray sized to the OLD length stops matching after a zoom
    // re-projects the path, which clipped the line to nothing.
    const finishRoute = () => {
      if (path) {
        path.style.strokeDasharray = 'none';
        path.style.strokeDashoffset = '';
        path.style.transition = '';
      }
      finishEls.forEach(fadeIn);
    };

    if (!path) {
      setTimeout(finishRoute, MAP_FADE + MARK_FADE); // no line to draw — just reveal the finish
      return;
    }

    // (2) after the start, sweep the line in.
    setTimeout(() => {
      path.style.transition = `stroke-dashoffset ${LINE_DRAW}ms ease-in-out`;
      path.style.strokeDashoffset = '0';
      path.addEventListener('transitionend', finishRoute, { once: true });
    }, MAP_FADE + MARK_FADE);
    // A zoom before/during the draw snaps the line solid and reveals the finish, so nothing stays hidden.
    this.mapObj.map.once('zoomstart', finishRoute);
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
