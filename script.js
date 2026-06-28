const mapConfig = {
  width: 2000,
  height: 1200,
  minZoom: 0.6,
  maxZoom: 3,
  step: 0.12,
  initialZoom: 1,
  markers: [
    {
      id: 'crimson-keep',
      x: 860,
      y: 320,
      icon: 'assets/icons/marker-red.svg',
      label: 'Crimson Keep',
      minZoom: 0.6,
      maxZoom: 3,
    },
    {
      id: 'silverport',
      x: 1460,
      y: 790,
      icon: 'assets/icons/marker-blue.svg',
      label: 'Silverport',
      minZoom: 0.6,
      maxZoom: 2.3,
    },
    {
      id: 'elder-ruins',
      x: 420,
      y: 960,
      icon: 'assets/icons/marker-green.svg',
      label: 'Elder Ruins',
      minZoom: 0.9,
      maxZoom: 3,
    },
  ],
  areas: [
    {
      id: 'whisperwood',
      x: 520,
      y: 250,
      text: 'Whisperwood',
      minZoom: 0.6,
    },
    {
      id: 'sunfields',
      x: 1230,
      y: 430,
      text: 'Sunfields',
      minZoom: 0.6,
    },
    {
      id: 'obsidian-basin',
      x: 760,
      y: 720,
      text: 'Obsidian Basin',
      minZoom: 1.1,
    },
  ],
};

const state = {
  zoom: mapConfig.initialZoom,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  pointerId: null,
  lastClientX: 0,
  lastClientY: 0,
};

const mapStage = document.getElementById('map-stage');
const mapLayer = document.getElementById('map-layer');
const overlay = document.getElementById('overlay');
const zoomLevel = document.getElementById('zoom-level');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const resetButton = document.getElementById('reset');

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMapBounds() {
  const stageRect = mapStage.getBoundingClientRect();
  const scaledWidth = mapConfig.width * state.zoom;
  const scaledHeight = mapConfig.height * state.zoom;

  if (scaledWidth <= stageRect.width) {
    return {
      minX: (stageRect.width - scaledWidth) / 2 / state.zoom,
      maxX: (stageRect.width - scaledWidth) / 2 / state.zoom,
    };
  }

  return {
    minX: (stageRect.width - scaledWidth) / state.zoom,
    maxX: 0,
  };
}

function getMapBoundsY() {
  const stageRect = mapStage.getBoundingClientRect();
  const scaledHeight = mapConfig.height * state.zoom;

  if (scaledHeight <= stageRect.height) {
    return {
      minY: (stageRect.height - scaledHeight) / 2 / state.zoom,
      maxY: (stageRect.height - scaledHeight) / 2 / state.zoom,
    };
  }

  return {
    minY: (stageRect.height - scaledHeight) / state.zoom,
    maxY: 0,
  };
}

function clampOffsets() {
  const { minX, maxX } = getMapBounds();
  const { minY, maxY } = getMapBoundsY();
  state.offsetX = clamp(state.offsetX, minX, maxX);
  state.offsetY = clamp(state.offsetY, minY, maxY);
}

function updateTransform() {
  clampOffsets();
  mapLayer.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.zoom})`;
  zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
  renderMarkers();
  renderAreaLabels();
}

function toMapSpace(clientX, clientY) {
  const rect = mapStage.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / state.zoom - state.offsetX,
    y: (clientY - rect.top) / state.zoom - state.offsetY,
  };
}

function setZoom(newZoom, anchorClientX = null, anchorClientY = null) {
  const previousZoom = state.zoom;
  const clampedZoom = clamp(newZoom, mapConfig.minZoom, mapConfig.maxZoom);
  if (clampedZoom === state.zoom) {
    return;
  }

  if (anchorClientX !== null && anchorClientY !== null) {
    const previousMapPoint = toMapSpace(anchorClientX, anchorClientY);
    state.zoom = clampedZoom;
    state.offsetX = anchorClientX / state.zoom - previousMapPoint.x;
    state.offsetY = anchorClientY / state.zoom - previousMapPoint.y;
  } else {
    state.zoom = clampedZoom;
  }

  updateTransform();
}

function renderMarkers() {
  overlay.querySelectorAll('.marker').forEach((markerEl) => markerEl.remove());

  mapConfig.markers.forEach((marker) => {
    const visible = state.zoom >= marker.minZoom && state.zoom <= marker.maxZoom;
    if (!visible) {
      return;
    }

    const markerEl = document.createElement('div');
    markerEl.className = 'marker';
    markerEl.style.left = `${marker.x}px`;
    markerEl.style.top = `${marker.y}px`;
    markerEl.style.setProperty('--inverse-scale', `${1 / state.zoom}`);
    markerEl.innerHTML = `
      <img src="${marker.icon}" alt="Marker icon" draggable="false" />
      <div class="marker-label">${marker.label}</div>
    `;

    overlay.appendChild(markerEl);
  });
}

function renderAreaLabels() {
  overlay.querySelectorAll('.area-label').forEach((labelEl) => labelEl.remove());

  mapConfig.areas.forEach((area) => {
    if (state.zoom < (area.minZoom || 0)) {
      return;
    }

    const labelEl = document.createElement('div');
    labelEl.className = 'area-label';
    labelEl.style.left = `${area.x}px`;
    labelEl.style.top = `${area.y}px`;
    labelEl.style.setProperty('--inverse-scale', `${1 / state.zoom}`);
    labelEl.textContent = area.text;
    overlay.appendChild(labelEl);
  });
}

function resetView() {
  state.zoom = mapConfig.initialZoom;
  state.offsetX = 0;
  state.offsetY = 0;
  updateTransform();
}

mapStage.addEventListener('wheel', (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -mapConfig.step : mapConfig.step;
  setZoom(state.zoom + delta, event.clientX, event.clientY);
});

mapStage.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return;
  }

  mapStage.setPointerCapture(event.pointerId);
  state.dragging = true;
  state.pointerId = event.pointerId;
  state.lastClientX = event.clientX;
  state.lastClientY = event.clientY;
  mapStage.style.cursor = 'grabbing';
});

mapStage.addEventListener('pointermove', (event) => {
  if (!state.dragging || event.pointerId !== state.pointerId) {
    return;
  }

  const dx = event.clientX - state.lastClientX;
  const dy = event.clientY - state.lastClientY;
  state.lastClientX = event.clientX;
  state.lastClientY = event.clientY;

  state.offsetX += dx / state.zoom;
  state.offsetY += dy / state.zoom;
  updateTransform();
});

mapStage.addEventListener('pointerup', () => {
  state.dragging = false;
  state.pointerId = null;
  mapStage.style.cursor = 'grab';
});

mapStage.addEventListener('pointercancel', () => {
  state.dragging = false;
  state.pointerId = null;
  mapStage.style.cursor = 'grab';
});

zoomInButton.addEventListener('click', () => setZoom(state.zoom + mapConfig.step));
zoomOutButton.addEventListener('click', () => setZoom(state.zoom - mapConfig.step));
resetButton.addEventListener('click', resetView);

window.addEventListener('resize', updateTransform);

resetView();
