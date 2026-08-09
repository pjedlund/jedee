// <place-map> — upgrades a slotted static map into a live, maximizable Leaflet map.
// esbuild (build-js.js) bundles Leaflet into this component file, exactly like
// PhotoSwipe in photo-lightbox.js — nothing loads until the is-land hydrates on idle.
// The inline map is live (drag + zoom buttons) but never wheel/pinch-zooms, so the page
// keeps scrolling. The maximize button grows THE SAME map instance into a modal overlay
// where wheel + pinch turn on; pan/zoom state is preserved because it's one map, not a
// rebuilt second one. Esc / backdrop / close button exit, focus returns to the trigger.
//
// Two modes, decided by the slotted markup:
//  - single pin (photo pages): data-lat/data-lon on the element, static <a><img> slot.
//  - groups: a slotted [data-place-groups] place list — each .place-group holds
//    <li data-lat data-lon> items. The LIST is the data source and the no-JS/screen-
//    reader path (Leaflet markers' keyboard/SR handling is broken upstream, so nobody
//    is forced through the map). JS builds the map above it, turns the group headings
//    into aria-pressed toggles, and adds synced chips on the map surface.
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

// Marker popup: the date in italics, then the place's name on its own line, linked to
// the post. Styling is in place-map.css.
const popupHtml = (p) => {
  const name = p.url ? `<a href="${p.url}">${p.name}</a>` : p.name;
  return p.date ? `<i class="place-popup-date">${p.date}</i>${name}` : name;
};

// Build one live map. Wheel + pinch start disabled (toggled on when maximized); drag,
// keyboard and the +/- zoom control stay on inline so the map is usable in place.
// Returns { map, addDot } — dots added through addDot get theme re-stroking and the
// grow-a-little-on-zoom behavior, whichever layer they sit in.
function makeMap(el, { center, zoom, bounds, place }) {
  let theme = pageTheme();
  const map = L.map(el, {
    zoomControl: false,
    attributionControl: false,
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
  L.control.attribution({ prefix: false }).addAttribution(ATTRIB).addTo(map);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  let tiles = L.tileLayer(TILES[theme], { maxZoom: 19 }).addTo(map);

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
    map.removeLayer(tiles);
    tiles = L.tileLayer(TILES[theme], { maxZoom: 19 }).addTo(map);
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
// container + the chips + the close button are the focus stops).
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
    const groupsRoot = this.querySelector('[data-place-groups]');
    if (groupsRoot) this.initGroups(groupsRoot);
    else this.initSinglePin();
  }

  // The live inline slot. Its aspect-ratio holds the box, so moving the canvas out to
  // the overlay (and back) never shifts the page.
  buildBox() {
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

    this.prepend(this.box);

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

  // Groups mode: the slotted place list is the data source. Parse it, build the map
  // fitted to every place, one toggleable layer per group, chips + heading toggles
  // synced over the same state.
  initGroups(root) {
    const groups = [...root.querySelectorAll('.place-group')]
      .map((li) => ({
        li,
        key: li.dataset.group,
        heading: li.querySelector('.place-group-heading'),
        // --dot is authored as a token reference; computed style resolves it to a color
        color: getComputedStyle(li).getPropertyValue('--dot').trim() || MARKER_FILL,
        places: [...li.querySelectorAll('li[data-lat]')].map((p) => {
          const a = p.querySelector('a');
          return { lat: Number(p.dataset.lat), lon: Number(p.dataset.lon), date: p.dataset.date || '', name: a?.textContent.trim() || p.textContent.trim(), url: a?.getAttribute('href') };
        }),
      }))
      .filter((g) => g.places.length);
    const all = groups.flatMap((g) => g.places);
    if (!all.length) return; // nothing to map → leave the plain list

    this.buildBox();
    this.mapObj = makeMap(this.canvas, {
      bounds: L.latLngBounds(all.map((p) => [p.lat, p.lon])),
      place: this.place,
    });

    const controls = {}; // key -> [chip, heading button] — two synced controls, one state
    const setGroup = (g, on) => {
      on ? this.mapObj.map.addLayer(g.layer) : this.mapObj.map.removeLayer(g.layer);
      controls[g.key].forEach((b) => b.setAttribute('aria-pressed', String(on)));
      g.li.toggleAttribute('data-off', !on);
    };
    const register = (g, btn) => {
      (controls[g.key] ||= []).push(btn);
      btn.addEventListener('click', () => setGroup(g, btn.getAttribute('aria-pressed') !== 'true'));
    };

    // Chips on the map surface — a desktop convenience; CSS hides them on small
    // screens, where the list headings carry the same toggles (no function lost).
    this.chips = document.createElement('ul');
    this.chips.className = 'place-map-chips';

    for (const g of groups) {
      g.layer = L.layerGroup().addTo(this.mapObj.map);
      g.places.forEach((p) =>
        this.mapObj.addDot(p.lat, p.lon, {
          fill: g.color,
          layer: g.layer,
          popup: popupHtml(p),
        })
      );

      // Turn the server-rendered heading into a toggle (a no-JS heading must not be a
      // button), and mirror it as a chip.
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'place-group-toggle';
      toggle.setAttribute('aria-pressed', 'true');
      toggle.append(...g.heading.childNodes);
      g.heading.append(toggle);
      register(g, toggle);

      const chipLi = document.createElement('li');
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'place-map-chip';
      chip.setAttribute('aria-pressed', 'true');
      chip.style.setProperty('--dot', g.color);
      chip.innerHTML = toggle.innerHTML;
      register(g, chip);
      chipLi.append(chip);
      this.chips.append(chipLi);
    }
    this.box.append(this.chips);
    this.finishInit();
  }

  open() {
    if (!overlay) buildOverlay();
    active = this;
    overlayFrame.append(this.canvas); // move the SAME map into the overlay
    if (this.chips) overlayFrame.append(this.chips); // chips ride along
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
    if (this.chips) this.box.append(this.chips);
    this.canvas.setAttribute('aria-label', this.place ? `Map of ${this.place}` : 'Map of this location');
    requestAnimationFrame(this.fitCanvas);
    active = null;
    this.maxBtn.focus();
  }
}

customElements.define('place-map', PlaceMap);
