// <place-map> — upgrades a slotted static map into a live, maximizable MapLibre map drawn from our own Protomaps tiles. esbuild bundles MapLibre into this file, so nothing loads until the is-land hydrates on idle. The inline map never wheel-zooms, so the page keeps scrolling; the maximize button grows THE SAME instance into a modal overlay where wheel + pinch turn on.
// Three modes, decided by the slotted markup: single pin (data-lat/data-lon on the element), places (a slotted [data-place-list] whose [data-lat] rows are the data AND the no-JS path), route (a slotted GeoJSON LineString).
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';

const TILES_URL = 'https://pub-820f82fa11f94b03ab1d34e77b3572f6.r2.dev/maps/sweden-20260916.pmtiles';
// ⚠ Outside this box the tile file is empty, so a map reaching past it opens on Topographic instead.
const COVERAGE = [10.5, 55.0, 24.5, 69.2]; // west, south, east, north
const ASSETS = '/assets/map';
const ATTRIB_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
// Fixed alternate styles offered by the switch. Esri's URL is {z}/{y}/{x} (row before column).
const RASTER_BASES = {
  Satellite: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    maxzoom: 19,
    attribution: 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
  },
  Topographic: {
    tiles: ['a', 'b', 'c'].map((s) => `https://${s}.tile.opentopomap.org/{z}/{x}/{y}.png`),
    maxzoom: 17,
    attribution: `Map data: ${ATTRIB_OSM}, <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)`,
  },
};
const BASE_NAMES = ['Map', ...Object.keys(RASTER_BASES)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Orienteering route symbols, sized in PIXELS AT THE FIT ZOOM then frozen to lat/lon so they scale with the map. Calibration knobs.
const TRI_HEIGHT = 18;
const TRI_HALF_WIDTH = 9;
const FINISH_OUTER = 9;
const FINISH_INNER = 4;
const SYMBOL_WEIGHT = 2.5;

maplibregl.addProtocol('pmtiles', new Protocol().tile);

function pageTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark' || t === 'light') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Any CSS color (var(), color-mix(), oklab…) → "rgba(…)" MapLibre can parse, by painting one pixel.
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
function cssColor(el, prop) {
  const value = getComputedStyle(el).getPropertyValue(prop).trim();
  if (!value) return undefined;
  const span = document.createElement('span');
  span.style.color = value;
  el.append(span);
  const computed = getComputedStyle(span).color;
  span.remove();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = computed;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}

// The map's colors live in place-map.css as --map-* properties, so a theme flip or a CSS tweak is picked up by re-reading them.
function jedeeFlavor(el, theme) {
  const c = (name) => cssColor(el, `--map-${name}`);
  const land = c('land');
  const park = c('park');
  const road = c('road');
  const minor = c('road-minor');
  const label = c('label');
  const labelMinor = c('label-minor');
  const labelFaint = c('label-faint');
  return {
    ...namedFlavor(theme === 'dark' ? 'black' : 'white'),
    background: land, earth: land,
    water: c('water'),
    park_a: park, park_b: park, wood_a: park, wood_b: park, scrub_a: park, scrub_b: park,
    buildings: c('buildings'),
    highway: road, major: road, link: road,
    minor_a: minor, minor_b: minor, minor_service: minor, other: minor,
    city_label: label, city_label_halo: land,
    subplace_label: labelMinor, subplace_label_halo: land,
    roads_label_major: labelMinor, roads_label_major_halo: land,
    roads_label_minor: labelFaint, roads_label_minor_halo: land,
    ocean_label: label,
  };
}

const outsideCoverage = ([w, s, e, n]) => w < COVERAGE[0] || s < COVERAGE[1] || e > COVERAGE[2] || n > COVERAGE[3];

// Marker popup: the date in italics, then the place's name on its own line, linked to the post. Styling is in place-map.css.
const popupHtml = (p) => {
  const name = p.url ? `<a href="${p.url}">${p.name}</a>` : p.name;
  return p.date ? `<i class="place-popup-date">${p.date}</i>${name}` : name;
};

// A native <select> as a MapLibre control — correct semantics for free, and it rides into the maximize overlay with the canvas.
function tileSwitch(initial, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'maplibregl-ctrl place-map-tiles';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Map style');
  for (const n of BASE_NAMES) select.append(new Option(n, n));
  select.value = initial;
  select.addEventListener('change', () => onChange(select.value));
  wrap.append(select);
  return { onAdd: () => wrap, onRemove: () => wrap.remove() };
}

// Build one live map. `overlays()` returns the extra { sources, layers } drawn above the base; `render()` re-applies the whole style (theme flip, base switch, animation state).
function makeMap(el, { center, zoom, bounds, place, base = 'Map', fitPadding = 28, overlays = () => ({ sources: {}, layers: [] }) }) {
  el.dataset.placeMapCanvas = '';
  const map = new maplibregl.Map({
    container: el,
    style: { version: 8, sources: {}, layers: [] },
    ...(bounds ? { bounds, fitBoundsOptions: { padding: fitPadding, maxZoom: 16 } } : { center, zoom }),
    attributionControl: false,
    scrollZoom: false, // enabled only when maximized (else it traps page scroll)
    touchZoomRotate: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxPitch: 0,
    fadeDuration: REDUCED ? 0 : 300,
  });
  map.keyboard.disableRotation();
  map.getCanvas().setAttribute('aria-label', place ? `Map of ${place}` : 'Map of this location');
  if (bounds && !el.clientWidth) map.once('resize', () => map.fitBounds(bounds, { padding: fitPadding, animate: false }));

  const state = { theme: pageTheme(), base };
  const render = () => {
    const own = overlays();
    const style = {
      version: 8,
      glyphs: `${location.origin}${ASSETS}/fonts/{fontstack}/{range}.pbf`,
      sprite: `${location.origin}${ASSETS}/sprites/${state.theme === 'dark' ? 'black' : 'white'}`,
      sources: { ...own.sources },
      layers: [],
    };
    if (state.base === 'Map') {
      style.sources.protomaps = { type: 'vector', url: `pmtiles://${TILES_URL}`, attribution: `<a href="https://protomaps.com">Protomaps</a> ${ATTRIB_OSM}` };
      style.layers = layers('protomaps', jedeeFlavor(el, state.theme), { lang: 'sv' });
    } else {
      style.sources.raster = { type: 'raster', tileSize: 256, ...RASTER_BASES[state.base] };
      style.layers = [{ id: 'raster', type: 'raster', source: 'raster' }];
    }
    style.layers.push(...own.layers);
    map.setStyle(style, { diff: map.isStyleLoaded() }); // the very first render replaces the empty placeholder style
  };

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
  // Attribution first, switch second: in a bottom corner the last-added control sits nearest the top.
  map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right');
  map.addControl(tileSwitch(base, (next) => { state.base = next; render(); }), 'bottom-right');

  // Ctrl/⌘ + wheel (and trackpad pinch, which arrives as ctrl-wheel) zooms inline; a plain wheel keeps scrolling the page.
  el.addEventListener(
    'wheel',
    (e) => {
      if (!(e.ctrlKey || e.metaKey) || map.scrollZoom.isEnabled()) return;
      e.preventDefault();
      const r = map.getCanvas().getBoundingClientRect();
      map.zoomTo(map.getZoom() - e.deltaY * 0.01, { around: map.unproject([e.clientX - r.left, e.clientY - r.top]), duration: 0 });
    },
    { passive: false }
  );

  const onTheme = () => {
    const next = pageTheme();
    if (next === state.theme) return;
    state.theme = next;
    requestAnimationFrame(render); // after the theme's CSS has applied, so the --map-* read is fresh
  };
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);

  return { map, render, fitZoom: map.getZoom(), color: (name) => cssColor(el, name) };
}

// A dot layer for one or more places. Radius grows a little with zoom around the fit zoom, clamped 4–13 px.
function dotLayers(mapObj, features) {
  const z = mapObj.fitZoom;
  return {
    sources: { places: { type: 'geojson', data: { type: 'FeatureCollection', features } } },
    layers: [
      {
        id: 'places',
        type: 'circle',
        source: 'places',
        paint: {
          'circle-color': ['coalesce', ['get', 'color'], mapObj.color('--color-accent-orange')],
          'circle-opacity': 0.9,
          'circle-stroke-color': mapObj.color('--map-dot-stroke'),
          'circle-stroke-width': 2,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], z - 3.75, 4, z, 7, z + 7.5, 13],
        },
      },
    ],
  };
}
const point = (lon, lat, properties = {}) => ({ type: 'Feature', properties, geometry: { type: 'Point', coordinates: [lon, lat] } });

// --- shared maximize overlay (one per page, built on first open). The live map canvas is MOVED into it on open and back out on close. ---
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
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) active?.close();
  });
  addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Escape') active.close();
    else if (e.key === 'Tab') trapTab(e);
  });
}

function trapTab(e) {
  const f = overlay.querySelectorAll('a[href], button:not([disabled]), select, [tabindex]:not([tabindex="-1"])');
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

  // The live inline slot; its aspect-ratio holds the box, so moving the canvas to the overlay never shifts the page. The activity index renders the box server-side and it's adopted here.
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
  }

  finishInit() {
    this.maxBtn.addEventListener('click', () => this.open());
    this.dataset.mapReady = '';
  }

  initSinglePin() {
    if (!this.dataset.lat) return; // no coords → leave the static map
    const lat = Number(this.dataset.lat);
    const lon = Number(this.dataset.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    this.buildBox();
    this.mapObj = makeMap(this.canvas, {
      center: [lon, lat],
      zoom: Number(this.dataset.zoom) || 13,
      place: this.place,
      base: outsideCoverage([lon, lat, lon, lat]) ? 'Topographic' : 'Map',
      overlays: () => dotLayers(this.mapObj, [point(lon, lat)]),
    });
    this.mapObj.render();
    this.finishInit();
  }

  // Places mode: every [data-lat] row becomes a dot, named and linked from the row's first link. Rows without coordinates stay in the table, unmapped.
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
          color: cssColor(el, '--place-color'),
        };
      })
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (!places.length) return; // nothing to map → leave the plain table

    const lons = places.map((p) => p.lon);
    const lats = places.map((p) => p.lat);
    const bounds = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
    const features = places.map((p) => point(p.lon, p.lat, { name: p.name, url: p.url, date: p.date, color: p.color }));

    this.buildBox();
    this.mapObj = makeMap(this.canvas, {
      bounds,
      place: this.place,
      base: outsideCoverage(bounds) ? 'Topographic' : 'Map',
      overlays: () => dotLayers(this.mapObj, features),
    });
    const { map } = this.mapObj;
    this.mapObj.render();
    map.on('click', 'places', (e) => {
      const f = e.features[0];
      new maplibregl.Popup({ offset: 10, maxWidth: '300px' }).setLngLat(f.geometry.coordinates).setHTML(popupHtml(f.properties)).addTo(map);
    });
    map.on('mouseenter', 'places', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'places', () => (map.getCanvas().style.cursor = ''));
    this.finishInit();
  }

  // Route mode: a slotted GeoJSON LineString, fitted to its bounds, with an orienteering start triangle and finish double-circle.
  initRoute(script) {
    let gj;
    try {
      gj = JSON.parse(script.textContent);
    } catch {
      return; // malformed data → leave the page mapless, Strava link still stands
    }
    const coords = gj?.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const bounds = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];

    // Animation state lives here so a theme flip or base switch mid-intro redraws in the same place.
    this.intro = { start: 1, finish: 1, progress: null };
    let symbols = { start: null, finish: null };

    this.buildBox();
    this.mapObj = makeMap(this.canvas, {
      bounds,
      place: this.place,
      fitPadding: 20,
      base: outsideCoverage(bounds) ? 'Topographic' : 'Map',
      overlays: () => {
        const color = this.mapObj.color('--color-route-line');
        const { start, finish, progress } = this.intro;
        const hidden = 'rgba(0,0,0,0)';
        const line = (id, data, opacity) => [id, { type: 'geojson', data }, { id, type: 'line', source: id, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': SYMBOL_WEIGHT, 'line-opacity': opacity, 'line-opacity-transition': { duration: 320 } } }];
        const parts = [line('route-start', symbols.start, start), line('route-finish', symbols.finish, finish)];
        const route = {
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': color, 'line-width': 4, 'line-opacity': 0.9, ...(progress === null ? {} : { 'line-gradient': ['step', ['line-progress'], color, Math.max(progress, 0.0001), hidden] }) },
        };
        return {
          sources: { route: { type: 'geojson', data: gj, lineMetrics: true }, ...Object.fromEntries(parts.map(([id, src]) => [id, src])) },
          layers: [route, ...parts.map(([, , layer]) => layer)],
        };
      },
    });
    symbols = this.routeSymbols(coords);
    if (!REDUCED) this.intro = { start: 0, finish: 0, progress: 0 };
    this.mapObj.render();
    if (!REDUCED) this.routeIntro();
    this.finishInit();
  }

  // Start triangle + finish circles, built in screen pixels at the fit zoom and unprojected, so they're geographic shapes. ⚠ The heading aims at the first point ≥ 25 m out: the opening GPS fixes cluster on the spot.
  routeSymbols(coords) {
    const { map } = this.mapObj;
    const start = maplibregl.LngLat.convert(coords[0]);
    const end = coords.at(-1);
    const ahead = coords.find((c) => start.distanceTo(maplibregl.LngLat.convert(c)) >= 25) || end;
    const p0 = map.project(coords[0]);
    const p1 = map.project(ahead);
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const ux = (p1.x - p0.x) / len;
    const uy = (p1.y - p0.y) / len;
    const bx = p0.x - ux * TRI_HEIGHT;
    const by = p0.y - uy * TRI_HEIGHT;
    const lngLat = (x, y) => map.unproject([x, y]).toArray();
    const tri = [coords[0], lngLat(bx - uy * TRI_HALF_WIDTH, by + ux * TRI_HALF_WIDTH), lngLat(bx + uy * TRI_HALF_WIDTH, by - ux * TRI_HALF_WIDTH), coords[0]];
    const pe = map.project(end);
    const ring = (r) => Array.from({ length: 49 }, (_, i) => lngLat(pe.x + r * Math.cos((i / 48) * 2 * Math.PI), pe.y + r * Math.sin((i / 48) * 2 * Math.PI)));
    const geo = (type, coordinates) => ({ type: 'Feature', properties: {}, geometry: { type, coordinates } });
    return { start: geo('LineString', tri), finish: geo('MultiLineString', [ring(FINISH_OUTER), ring(FINISH_INNER)]) };
  }

  // Sequenced intro: fade the canvas up, fade the start in, draw the line start → finish, then reveal the finish. Only runs when motion is allowed.
  routeIntro() {
    const MAP_FADE = 500;
    const MARK_FADE = 320;
    const LINE_DRAW = 7000; // calibration knob — bump for slower
    const { map, render } = this.mapObj;

    this.canvas.style.opacity = '0';
    this.canvas.getBoundingClientRect(); // flush so the fade starts from 0
    this.canvas.style.transition = `opacity ${MAP_FADE}ms ease-out`;
    this.canvas.style.opacity = '1';

    let raf;
    const finish = () => {
      cancelAnimationFrame(raf);
      this.intro = { start: 1, finish: 1, progress: null };
      render();
    };
    map.once('zoomstart', finish); // a zoom mid-draw snaps everything visible

    setTimeout(() => {
      this.intro.start = 1;
      render();
    }, MAP_FADE);
    setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        if (this.intro.progress === null) return; // already finished
        this.intro.progress = Math.min(1, (now - t0) / LINE_DRAW);
        if (this.intro.progress >= 1) return finish();
        // ⚠ A theme flip mid-draw rebuilds the style, and setPaintProperty throws until it's back — skip that frame, the rebuild already carries the progress.
        if (map.isStyleLoaded()) map.setPaintProperty('route', 'line-gradient', ['step', ['line-progress'], this.mapObj.color('--color-route-line'), this.intro.progress, 'rgba(0,0,0,0)']);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, MAP_FADE + MARK_FADE);
  }

  open() {
    if (!overlay) buildOverlay();
    active = this;
    overlayFrame.append(this.canvas); // move the SAME map into the overlay
    overlay.setAttribute('data-open', '');
    overlay.setAttribute('aria-label', this.place ? `Map showing ${this.place}` : 'Interactive map');
    this.mapObj.map.getCanvas().setAttribute('aria-label', this.place ? `Interactive map of ${this.place}` : 'Interactive map of this location');
    document.body.style.overflow = 'hidden';
    this.mapObj.map.scrollZoom.enable();
    this.mapObj.map.touchZoomRotate.enable();
    this.mapObj.map.touchZoomRotate.disableRotation();
    closeBtn.focus();
    requestAnimationFrame(() => this.mapObj.map.resize());
  }

  close() {
    this.mapObj.map.scrollZoom.disable();
    this.mapObj.map.touchZoomRotate.disable();
    overlay.removeAttribute('data-open');
    document.body.style.overflow = '';
    this.box.prepend(this.canvas); // move the map back inline
    this.mapObj.map.getCanvas().setAttribute('aria-label', this.place ? `Map of ${this.place}` : 'Map of this location');
    requestAnimationFrame(() => this.mapObj.map.resize());
    active = null;
    this.maxBtn.focus();
  }
}

customElements.define('place-map', PlaceMap);
