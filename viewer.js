/* viewer.js — Fantasy Map Viewer */

(async function () {

  // ── 1. Load data ──────────────────────────────────────────────
  let data;
  try {
    const res = await fetch('data.json');
    data = await res.json();
  } catch (e) {
    console.error('Failed to load data.json', e);
    data = { markers: [], labels: [] };
  }

  // ── 2. Get map image dimensions ───────────────────────────────
  const mapImg = new Image();
  mapImg.src = 'map.png';
  await new Promise(resolve => { mapImg.onload = resolve; });
  const IMG_W = mapImg.naturalWidth;
  const IMG_H = mapImg.naturalHeight;

  // ── 3. Set up Leaflet with CRS.Simple ────────────────────────
  //    CRS.Simple uses raw pixel coords. We flip Y so [0,0] = top-left.
  const bounds = [[0, 0], [IMG_H, IMG_W]];

  const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 3,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    attributionControl: false,
  });

  L.imageOverlay('map.png', bounds).addTo(map);
  map.fitBounds(bounds);

  // ── 4. Zoom indicator ─────────────────────────────────────────
  const zoomEl = document.getElementById('zoom-indicator');
  function updateZoomLabel() {
    const z = map.getZoom().toFixed(2);
    if (zoomEl) zoomEl.textContent = `zoom ${z}`;
  }
  map.on('zoom', updateZoomLabel);
  updateZoomLabel();

  // ── 5. Marker layer ───────────────────────────────────────────
  //    Each marker is stored with its data so we can filter on zoom.
  const markerObjects = [];

  for (const m of data.markers) {
    const icon = L.icon({
      iconUrl: m.icon,
      iconSize: [32, 32],       // fixed px size regardless of zoom
      iconAnchor: [16, 16],     // centre of icon sits on the coord
      tooltipAnchor: [0, -18],  // tooltip appears above icon
      popupAnchor: [0, -18],
    });

    // Leaflet CRS.Simple: coords are [lat, lng] = [y, x]
    const latlng = [IMG_H - m.coords[1], m.coords[0]];

    const marker = L.marker(latlng, { icon })
      .bindTooltip(m.name, { permanent: false, direction: 'top', offset: [0, -4] })
      .bindPopup(`
        <div class="popup-name">${m.name}</div>
        <div class="popup-desc">${m.description || ''}</div>
      `, { maxWidth: 260 });

    markerObjects.push({ leaflet: marker, data: m });
  }

  // ── 6. Label layer ────────────────────────────────────────────
  const labelObjects = [];

  for (const l of data.labels) {
    const latlng = [IMG_H - l.coords[1], l.coords[0]];

    const icon = L.divIcon({
      className: `map-label label-${l.style}`,
      html: `<span>${l.text}</span>`,
      iconAnchor: [0, 0],   // anchor will be overridden by CSS centering
    });

    const marker = L.marker(latlng, { icon, interactive: false });
    labelObjects.push({ leaflet: marker, data: l });
  }

  // ── 7. Zoom-based visibility ──────────────────────────────────
  function updateVisibility() {
    const z = map.getZoom();

    for (const { leaflet, data: m } of markerObjects) {
      const visible = z >= m.minZoom && z <= m.maxZoom;
      if (visible && !map.hasLayer(leaflet)) map.addLayer(leaflet);
      if (!visible && map.hasLayer(leaflet)) map.removeLayer(leaflet);
    }

    for (const { leaflet, data: l } of labelObjects) {
      const visible = z >= l.minZoom && z <= l.maxZoom;
      if (visible && !map.hasLayer(leaflet)) map.addLayer(leaflet);
      if (!visible && map.hasLayer(leaflet)) map.removeLayer(leaflet);
    }
  }

  map.on('zoomend', updateVisibility);
  updateVisibility(); // run once on load

})();
