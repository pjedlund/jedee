// <photo-map> — upgrades the static map in photo-meta into a fullscreen live map.
// esbuild (build-js.js) bundles Leaflet into this component file, exactly like
// PhotoSwipe in photo-lightbox.js — so nothing loads until the is-land hydrates
// on idle, and the CARTO tiles only fetch once the overlay actually opens.
import L from 'leaflet';

const TILES_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Marker keeps the site's orange in the dark overlay; read the token so it tracks
// the palette, literal as the fallback if the var can't be resolved.
const MARKER_FILL =
  getComputedStyle(document.documentElement).getPropertyValue('--color-accent-orange').trim() || '#d0621e';

// --- shared overlay singleton (one per page, built on first open) ---
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

  // Fresh map per open — a Leaflet map sized inside a hidden container
  // mis-measures — torn down again on close.
  const map = L.map(overlayMapEl, {
    center: [lat, lon],
    zoom,
    zoomControl: false,
    attributionControl: false,
    zoomAnimation: !REDUCED,
    fadeAnimation: !REDUCED,
    markerZoomAnimation: !REDUCED,
  });
  L.control.attribution({ prefix: false }).addAttribution(ATTRIB).addTo(map);
  // topright is the close button, bottomright the attribution — zoom takes bottomleft.
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  L.tileLayer(TILES_DARK, { maxZoom: 19 }).addTo(map);

  const marker = L.circleMarker([lat, lon], {
    radius: 7,
    weight: 2,
    color: '#141619', // dark stroke = the overlay backdrop, so the dot reads on any tile
    fillColor: MARKER_FILL,
    fillOpacity: 0.9,
  }).addTo(map);

  // Marker swells a little as you zoom in, shrinks out — clamped so it never
  // vanishes or dominates (circleMarker radius is screen px, constant per level).
  const refZoom = map.getZoom();
  map.on('zoomend', () =>
    marker.setRadius(Math.max(4, Math.min(13, 7 + (map.getZoom() - refZoom) * 0.8)))
  );

  overlayMap = map;
  // The overlay is display:none until [data-open]; nudge Leaflet to re-read the
  // container size next frame so tiles fill even if the browser settles layout
  // late (mobile Safari, etc.). Guard the open-then-instantly-close race.
  requestAnimationFrame(() => {
    if (overlayMap === map) map.invalidateSize();
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

    // The slotted static <a> keeps its href to openstreetmap.org as the no-JS
    // destination; hydrated, intercept the click to open the live overlay instead.
    const link = this.querySelector('a');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openOverlay(lat, lon, zoom, place, link);
      });
    }

    // Visible fullscreen affordance (keyboard-focusable). Sibling of the <a>,
    // never nested inside it — interactive content can't live in a link.
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-fullscreen';
    btn.setAttribute('aria-label', place ? `View map of ${place} fullscreen` : 'View map fullscreen');
    btn.innerHTML = '<span aria-hidden="true">⛶</span>';
    btn.addEventListener('click', () => openOverlay(lat, lon, zoom, place, btn));
    this.append(btn);

    this.dataset.mapReady = '';
  }
}

customElements.define('photo-map', PhotoMap);
