// <photo-map> — upgrades the static map in the photo page into a live map.
// esbuild (build-js.js) bundles Leaflet into this component file, exactly like
// PhotoSwipe in photo-lightbox.js — nothing loads until the is-land hydrates on
// idle. On idle the static image is swapped for a live (non-interactive) Leaflet
// map with the photo-location marker; clicking it — or the fullscreen button —
// opens the same map full-screen and interactive, the photo-lightbox pattern.
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

// Follow the page theme (the site sets data-theme; fall back to the OS setting)
// so the inline map and the overlay always show the same light/dark tiles.
function pageTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark' || t === 'light') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Build a Leaflet map. interactive:false = a static-feel preview whose click
// opens the overlay; interactive:true = the full-screen version (pan/zoom/wheel).
function makeMap(el, { lat, lon, zoom, interactive }) {
  const theme = pageTheme();
  const map = L.map(el, {
    center: [lat, lon],
    zoom,
    zoomControl: false,
    attributionControl: false,
    dragging: interactive,
    scrollWheelZoom: interactive,
    doubleClickZoom: interactive,
    boxZoom: interactive,
    keyboard: interactive,
    touchZoom: interactive,
    tap: interactive,
    zoomAnimation: !REDUCED,
    fadeAnimation: !REDUCED,
    markerZoomAnimation: !REDUCED,
  });
  el.dataset.photoMapCanvas = ''; // styling hook that outranks leaflet.css
  L.control.attribution({ prefix: false }).addAttribution(ATTRIB).addTo(map);
  if (interactive) {
    // topright = close button, bottomright = attribution → zoom goes bottomleft.
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
  }
  L.tileLayer(TILES[theme], { maxZoom: 19 }).addTo(map);

  // Stroke = the theme's background, so the dot always reads a clean halo.
  const stroke = theme === 'dark' ? '#141619' : '#ffffff';
  const marker = L.circleMarker([lat, lon], {
    radius: 7,
    weight: 2,
    color: stroke,
    fillColor: MARKER_FILL,
    fillOpacity: 0.9,
    interactive, // inline: let clicks fall through to the map (→ overlay)
  }).addTo(map);

  // Marker swells a little as you zoom in, shrinks out — clamped (circleMarker
  // radius is screen px, constant per zoom level).
  const refZoom = map.getZoom();
  map.on('zoomend', () =>
    marker.setRadius(Math.max(4, Math.min(13, 7 + (map.getZoom() - refZoom) * 0.8)))
  );
  return map;
}

// --- shared full-screen overlay singleton (one per page, built on first open) ---
let overlay;
let overlayMapEl;
let closeBtn;
let overlayMap = null;
let lastTrigger = null;

function buildOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'map-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'map-overlay-close';
  closeBtn.setAttribute('aria-label', 'Close map');
  closeBtn.innerHTML = '<span aria-hidden="true">&#10005;</span>';

  const frame = document.createElement('div');
  frame.className = 'map-frame';
  overlayMapEl = document.createElement('div');
  overlayMapEl.className = 'map';
  overlayMapEl.tabIndex = 0;
  overlayMapEl.setAttribute('role', 'application');
  frame.append(overlayMapEl);

  overlay.append(closeBtn, frame);
  document.body.append(overlay);

  closeBtn.addEventListener('click', closeOverlay);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.hasAttribute('data-open')) closeOverlay();
  });
}

function openOverlay(lat, lon, zoom, place, trigger) {
  if (!overlay) buildOverlay();
  lastTrigger = trigger;
  overlay.setAttribute('data-open', '');
  overlay.setAttribute('aria-label', place ? `Map showing ${place}` : 'Interactive map');
  overlayMapEl.setAttribute('aria-label', place ? `Interactive map showing ${place}` : 'Interactive map of this location');
  document.body.style.overflow = 'hidden';

  // Fresh map per open — a Leaflet map sized inside a hidden container mis-measures
  // — torn down again on close.
  overlayMap = makeMap(overlayMapEl, { lat, lon, zoom, interactive: true });
  requestAnimationFrame(() => {
    if (overlayMap) overlayMap.invalidateSize();
  });
  closeBtn.focus();
}

function closeOverlay() {
  overlay.removeAttribute('data-open');
  document.body.style.overflow = '';
  overlayMap?.remove();
  overlayMap = null;
  lastTrigger?.focus();
}

class PhotoMap extends HTMLElement {
  connectedCallback() {
    const lat = Number(this.dataset.lat);
    const lon = Number(this.dataset.lon);
    const zoom = Number(this.dataset.zoom) || 13;
    const place = this.dataset.place || '';
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return; // no coords → leave the static map untouched

    // Live inline preview map, in front of the (now hidden) static fallback.
    const mapEl = document.createElement('div');
    mapEl.className = 'photo-map-live';
    this.prepend(mapEl);
    const inlineMap = makeMap(mapEl, { lat, lon, zoom, interactive: false });
    requestAnimationFrame(() => inlineMap.invalidateSize());

    // Visible fullscreen affordance (keyboard-focusable). Sibling of the map, so
    // it's the semantic trigger; clicking the map itself is the mouse shortcut.
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-fullscreen';
    btn.setAttribute('aria-label', place ? `View map of ${place} fullscreen` : 'View map fullscreen');
    btn.innerHTML = '<span aria-hidden="true">⛶</span>';
    this.append(btn);

    const open = (trigger) => openOverlay(lat, lon, zoom, place, trigger);
    mapEl.addEventListener('click', () => open(btn));
    btn.addEventListener('click', () => open(btn));

    this.dataset.mapReady = '';
  }
}

customElements.define('photo-map', PhotoMap);
