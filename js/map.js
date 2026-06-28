// ── Config ────────────────────────────────────────────────────────────────────
const MAP_CONFIG = {
  imageUrl:   'js/map.jpg',          // ← change to your map filename
  imageWidth:  12088,
  imageHeight: 7932,
  minZoom:    -4,
  maxZoom:     3,
  startZoom:  -2,

  // Icon definitions — add entries here as you add files to /icons/
  // { id, label, file }  (file relative to icons/)
  icons: [
    { id: 'default',  label: 'Default Pin',  file: 'default.png'  },
    { id: 'city',     label: 'City',         file: 'city.png'     },
    { id: 'dungeon',  label: 'Dungeon',      file: 'dungeon.png'  },
  ],

  iconSize: [28, 28],   // px — fixed regardless of zoom
};

// ── State ─────────────────────────────────────────────────────────────────────
window.mapState = {
  markers: [],   // { id, name, lat, lng, icon, minZoom, maxZoom, description }
  labels:  [],   // { id, name, lat, lng, minZoom, maxZoom, fontSize }
};

// ── Leaflet instances ─────────────────────────────────────────────────────────
let map;
const markerLayers = {};  // id → L.Marker
const labelLayers  = {};  // id → L.Tooltip (permanent)

// ── Init ─────────────────────────────────────────────────────────────────────
function initMap() {
  const bounds = [
    [0, 0],
    [MAP_CONFIG.imageHeight, MAP_CONFIG.imageWidth],
  ];

  map = L.map('map', {
    crs:              L.CRS.Simple,
    minZoom:          MAP_CONFIG.minZoom,
    maxZoom:          MAP_CONFIG.maxZoom,
    zoomSnap:         0.25,
    zoomDelta:        0.5,
    maxBounds:        bounds,
    maxBoundsViscosity: 0.85,
    attributionControl: false,
  });

  // Fit whole map on screen initially
  map.fitBounds(bounds);

  // Image overlay
  L.imageOverlay(MAP_CONFIG.imageUrl, bounds).addTo(map);

  // Zoom change → update visibility
  map.on('zoomend', updateVisibility);

  // Mouse move → coords display
  map.on('mousemove', (e) => {
    const el = document.getElementById('coords-display');
    if (el) {
      const x = Math.round(e.latlng.lng);
      const y = Math.round(MAP_CONFIG.imageHeight - e.latlng.lat);
      el.textContent = `x ${x}  y ${y}`;
    }
  });

  // Click → editor placement hook (handled in editor.js)
  map.on('click', (e) => {
    if (window.editorHandleMapClick) {
      window.editorHandleMapClick(e.latlng);
    }
  });
}

// ── Icon helpers ──────────────────────────────────────────────────────────────
function getLeafletIcon(iconId) {
  const def = MAP_CONFIG.icons.find(i => i.id === iconId) || MAP_CONFIG.icons[0];
  return L.icon({
    iconUrl:     `icons/${def.file}`,
    iconSize:    MAP_CONFIG.iconSize,
    iconAnchor:  [MAP_CONFIG.iconSize[0] / 2, MAP_CONFIG.iconSize[1]],
    tooltipAnchor: [0, -MAP_CONFIG.iconSize[1]],
  });
}

// ── Markers ───────────────────────────────────────────────────────────────────
function addMarkerToMap(markerData) {
  const m = L.marker([markerData.lat, markerData.lng], {
    icon: getLeafletIcon(markerData.icon),
    interactive: true,
  });

  m.bindTooltip(markerData.name, {
    className:   'marker-tooltip',
    direction:   'top',
    offset:      [0, -MAP_CONFIG.iconSize[1] + 4],
    permanent:   false,
    sticky:      false,
  });

  m.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    if (window.editorSelectMarker) window.editorSelectMarker(markerData.id);
  });

  m.addTo(map);
  markerLayers[markerData.id] = m;
  applyVisibility(markerData.id, 'marker');
}

function removeMarkerFromMap(id) {
  if (markerLayers[id]) {
    markerLayers[id].remove();
    delete markerLayers[id];
  }
}

function updateMarkerOnMap(markerData) {
  removeMarkerFromMap(markerData.id);
  addMarkerToMap(markerData);
}

// ── Labels ────────────────────────────────────────────────────────────────────
function addLabelToMap(labelData) {
  // Permanent tooltip attached to an invisible marker
  const anchor = L.marker([labelData.lat, labelData.lng], {
    opacity: 0,
    interactive: false,
    keyboard: false,
  });

  anchor.bindTooltip(labelData.name, {
    className:  'area-label',
    permanent:  true,
    direction:  'center',
    offset:     [0, 0],
  });

  // Apply font size
  anchor.on('add', () => {
    const el = anchor.getTooltip()?.getElement();
    if (el) el.style.fontSize = (labelData.fontSize || 18) + 'px';
  });

  anchor.addTo(map);

  // Also update font size immediately if tooltip already exists
  const el = anchor.getTooltip()?.getElement();
  if (el) el.style.fontSize = (labelData.fontSize || 18) + 'px';

  labelLayers[labelData.id] = anchor;
  applyVisibility(labelData.id, 'label');
}

function removeLabelFromMap(id) {
  if (labelLayers[id]) {
    labelLayers[id].remove();
    delete labelLayers[id];
  }
}

function updateLabelOnMap(labelData) {
  removeLabelFromMap(labelData.id);
  addLabelToMap(labelData);
}

// ── Zoom visibility ───────────────────────────────────────────────────────────
function applyVisibility(id, type) {
  const z = map.getZoom();
  const data = type === 'marker'
    ? window.mapState.markers.find(m => m.id === id)
    : window.mapState.labels.find(l => l.id === id);

  if (!data) return;

  const layer = type === 'marker' ? markerLayers[id] : labelLayers[id];
  if (!layer) return;

  const minZ = data.minZoom ?? MAP_CONFIG.minZoom;
  const maxZ = data.maxZoom ?? MAP_CONFIG.maxZoom;
  const visible = z >= minZ && z <= maxZ;

  const el = layer.getElement?.();
  if (el) el.style.display = visible ? '' : 'none';

  // Also hide/show the tooltip for labels
  if (type === 'label') {
    const tip = layer.getTooltip()?.getElement();
    if (tip) tip.style.display = visible ? '' : 'none';
  }
}

function updateVisibility() {
  window.mapState.markers.forEach(m => applyVisibility(m.id, 'marker'));
  window.mapState.labels.forEach(l => applyVisibility(l.id, 'label'));
}

// ── Load from JSON ────────────────────────────────────────────────────────────
async function loadMapData() {
  try {
    const res = await fetch('data/mapdata.json');
    if (!res.ok) throw new Error('No mapdata.json found');
    const data = await res.json();
    window.mapState.markers = data.markers || [];
    window.mapState.labels  = data.labels  || [];

    window.mapState.markers.forEach(addMarkerToMap);
    window.mapState.labels.forEach(addLabelToMap);
  } catch (e) {
    console.warn('Could not load mapdata.json — starting empty.', e.message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
window.mapAPI = {
  config: MAP_CONFIG,
  map: () => map,
  getZoom: () => map.getZoom(),

  addMarker(data) {
    window.mapState.markers.push(data);
    addMarkerToMap(data);
  },
  updateMarker(data) {
    const idx = window.mapState.markers.findIndex(m => m.id === data.id);
    if (idx !== -1) window.mapState.markers[idx] = data;
    updateMarkerOnMap(data);
  },
  deleteMarker(id) {
    window.mapState.markers = window.mapState.markers.filter(m => m.id !== id);
    removeMarkerFromMap(id);
  },

  addLabel(data) {
    window.mapState.labels.push(data);
    addLabelToMap(data);
  },
  updateLabel(data) {
    const idx = window.mapState.labels.findIndex(l => l.id === data.id);
    if (idx !== -1) window.mapState.labels[idx] = data;
    updateLabelOnMap(data);
  },
  deleteLabel(id) {
    window.mapState.labels = window.mapState.labels.filter(l => l.id !== id);
    removeLabelFromMap(id);
  },

  flyTo(lat, lng) {
    map.flyTo([lat, lng], 0, { duration: 0.6 });
  },

  exportJSON() {
    return JSON.stringify({
      _schema: {
        markers: '{ id, name, lat, lng, icon, minZoom, maxZoom, description }',
        labels:  '{ id, name, lat, lng, minZoom, maxZoom, fontSize }',
      },
      markers: window.mapState.markers,
      labels:  window.mapState.labels,
    }, null, 2);
  },

  importJSON(json) {
    const data = JSON.parse(json);
    // Clear existing
    window.mapState.markers.forEach(m => removeMarkerFromMap(m.id));
    window.mapState.labels.forEach(l => removeLabelFromMap(l.id));
    window.mapState.markers = [];
    window.mapState.labels  = [];

    (data.markers || []).forEach(m => mapAPI.addMarker(m));
    (data.labels  || []).forEach(l => mapAPI.addLabel(l));
  },
};

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadMapData();
  if (window.editorInit) window.editorInit();
});
