// <place-map> — upgrades a slotted static map into a live, maximizable Leaflet map.
// esbuild (build-js.js) bundles Leaflet into this component file, exactly like
// PhotoSwipe in photo-lightbox.js — nothing loads until the is-land hydrates on idle.
// The inline map is live (drag + zoom buttons) but never wheel/pinch-zooms, so the page
// keeps scrolling. The maximize button grows THE SAME map instance into a modal overlay
// where wheel + pinch turn on; pan/zoom state is preserved because it's one map, not a
// rebuilt second one. Esc / backdrop / close button exit, focus returns to the trigger.
import L from 'leaflet';

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Marker keeps the site's orange; read the token so it tracks the palette.
const MARKER_FILL =
  getComputedStyle(document.documentElement).getPropertyValue('--color-accent-orange').trim() || '#d0621e';

// Follow the page theme (the site sets data-theme; fall back to the OS setting) so the
// inline map and the overlay always show matching light/dark tiles.
function pageTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark' || t === 'light') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
// Stroke = the theme's background, so the dot always reads a clean halo.
const markerStroke = (theme) => (theme === 'dark' ? '#141619' : '#ffffff');

// --- optional tile tint (data-tint on <place-map>) ---
// A duotone SVG filter on the tile pane: dark pixels ramp toward the tint color, white
// stays white. mix-blend-mode can't do this here — Leaflet's map pane has a transform,
// which isolates its contents from blending with the canvas surface beneath. The filter
// is built from the RESOLVED tint (the canvas background, painted by place-map.css from
// --place-map-tint), so any token works and a theme flip just means re-reading it.
let tintSeq = 0;
function parseColor(str) {
  let m = str.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (m) return [m[1] / 255, m[2] / 255, m[3] / 255];
  m = str.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}
function applyTint(el) {
  const rgb = parseColor(getComputedStyle(el).backgroundColor);
  if (!rgb) return;
  if (!el.tintFuncs) {
    const id = `place-map-tint-${tintSeq++}`;
    const holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;inline-size:0;block-size:0;overflow:hidden';
    holder.innerHTML =
      `<svg><filter id="${id}" color-interpolation-filters="sRGB">` +
      '<feColorMatrix type="saturate" values="0"/>' +
      '<feComponentTransfer><feFuncR type="table"/><feFuncG type="table"/><feFuncB type="table"/></feComponentTransfer>' +
      '</filter></svg>';
    el.append(holder); // inside the canvas, so the filter travels with it into the overlay
    el.tintFuncs = holder.querySelectorAll('feFuncR, feFuncG, feFuncB');
    el.style.setProperty('--place-map-tile-filter', `url(#${id})`);
  }
  el.tintFuncs.forEach((f, i) => f.setAttribute('tableValues', `${rgb[i]} 1`));
}

// Build one live map. Wheel + pinch start disabled (toggled on when maximized); drag,
// keyboard and the +/- zoom control stay on inline so the map is usable in place.
function makeMap(el, { lat, lon, zoom, place }) {
  let theme = pageTheme();
  const map = L.map(el, {
    center: [lat, lon],
    zoom,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false, // enabled only when maximized (else it traps page scroll)
    touchZoom: false, // ditto — no pinch-trap inline
    zoomAnimation: !REDUCED,
    fadeAnimation: !REDUCED,
    markerZoomAnimation: !REDUCED,
  });
  el.dataset.placeMapCanvas = ''; // styling hook that outranks leaflet.css
  const tinted = 'placeMapTint' in el.dataset;
  if (tinted) applyTint(el); // needs the canvas hook above, so the tint background resolves
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', place ? `Map of ${place}` : 'Map of this location');
  L.control.attribution({ prefix: false }).addAttribution(ATTRIB).addTo(map);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  let tiles = L.tileLayer(TILES[theme], { maxZoom: 19 }).addTo(map);
  const marker = L.circleMarker([lat, lon], {
    radius: 7,
    weight: 2,
    color: markerStroke(theme),
    fillColor: MARKER_FILL,
    fillOpacity: 0.9,
  }).addTo(map);

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

  // Marker swells a little as you zoom in, shrinks out — clamped (circleMarker radius is
  // screen px, constant per zoom level).
  const refZoom = map.getZoom();
  map.on('zoomend', () =>
    marker.setRadius(Math.max(4, Math.min(13, 7 + (map.getZoom() - refZoom) * 0.8)))
  );

  // Re-tile + re-stroke when the site theme flips, so the map never keeps stale
  // light/dark tiles after a toggle (old inline-map bug).
  const onTheme = () => {
    const next = pageTheme();
    if (next === theme) return;
    theme = next;
    map.removeLayer(tiles);
    tiles = L.tileLayer(TILES[theme], { maxZoom: 19 }).addTo(map);
    marker.setStyle({ color: markerStroke(theme) });
    if (tinted) applyTint(el); // the token resolves to a new color per theme
  };
  new MutationObserver(onTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);

  return map;
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
    const lat = Number(this.dataset.lat);
    const lon = Number(this.dataset.lon);
    const zoom = Number(this.dataset.zoom) || 13;
    this.place = this.dataset.place || '';
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return; // no coords → leave the static map

    // Live inline slot. Its aspect-ratio holds the box, so moving the canvas out to the
    // overlay (and back) never shifts the page.
    this.box = document.createElement('div');
    this.box.className = 'place-map-live';
    this.canvas = document.createElement('div');
    this.canvas.className = 'place-map-canvas';
    this.box.append(this.canvas);

    this.maxBtn = document.createElement('button');
    this.maxBtn.type = 'button';
    this.maxBtn.className = 'place-map-maximize';
    this.maxBtn.setAttribute('aria-label', this.place ? `Enlarge map of ${this.place}` : 'Enlarge map');
    this.maxBtn.innerHTML = '<span aria-hidden="true">⛶</span>';
    this.box.append(this.maxBtn);

    // Optional tint (any CSS color / token). Set INLINE on the canvas — an inherited
    // custom property would be lost when the canvas moves into the maximize overlay.
    if (this.dataset.tint) {
      this.canvas.style.setProperty('--place-map-tint', this.dataset.tint);
      this.canvas.dataset.placeMapTint = '';
    }

    this.prepend(this.box);
    this.map = makeMap(this.canvas, { lat, lon, zoom, place: this.place });
    requestAnimationFrame(() => this.map.invalidateSize());

    this.maxBtn.addEventListener('click', () => this.open());
    this.dataset.mapReady = '';
  }

  open() {
    if (!overlay) buildOverlay();
    active = this;
    overlayFrame.append(this.canvas); // move the SAME map into the overlay
    overlay.setAttribute('data-open', '');
    overlay.setAttribute('aria-label', this.place ? `Map showing ${this.place}` : 'Interactive map');
    this.canvas.setAttribute('aria-label', this.place ? `Interactive map of ${this.place}` : 'Interactive map of this location');
    document.body.style.overflow = 'hidden';
    this.map.scrollWheelZoom.enable();
    this.map.touchZoom.enable();
    closeBtn.focus(); // move focus into the dialog now that it's visible
    requestAnimationFrame(() => this.map.invalidateSize());
  }

  close() {
    this.map.scrollWheelZoom.disable();
    this.map.touchZoom.disable();
    overlay.removeAttribute('data-open');
    document.body.style.overflow = '';
    this.box.prepend(this.canvas); // move the map back inline
    this.canvas.setAttribute('aria-label', this.place ? `Map of ${this.place}` : 'Map of this location');
    requestAnimationFrame(() => this.map.invalidateSize());
    active = null;
    this.maxBtn.focus();
  }
}

customElements.define('place-map', PlaceMap);
