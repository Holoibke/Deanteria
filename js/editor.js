// ── Editor state ──────────────────────────────────────────────────────────────
const editorState = {
  editMode:    false,
  activeTab:   'markers',
  pendingType: null,   // 'marker' | 'label' — what a next click will place
  selectedId:  null,
  selectedType: null,  // 'marker' | 'label'
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showToast(msg, duration = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

// ── Edit mode toggle ──────────────────────────────────────────────────────────
function setEditMode(on) {
  editorState.editMode = on;
  document.body.classList.toggle('edit-mode', on);
  const btn = document.getElementById('edit-mode-btn');
  btn.textContent = on ? '✏ Editing' : '✏ Edit Mode';
  btn.classList.toggle('active', on);

  const badge = document.querySelector('.mode-badge');
  badge.textContent = on ? 'Edit' : 'View';
  badge.classList.toggle('view-mode', !on);

  if (!on) {
    editorState.pendingType = null;
    clearEditForm();
    updatePlaceBtnStates();
  }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(name) {
  editorState.activeTab = name;
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.dataset.panel === name));
  clearEditForm();
  renderList();
}

// ── Sidebar toggle ────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const toolbar  = document.getElementById('toolbar');
  const btn      = document.getElementById('toggle-sidebar-btn');
  const hidden   = sidebar.classList.toggle('hidden');
  toolbar.classList.toggle('sidebar-hidden', hidden);
  btn.textContent = hidden ? '◀ Editor' : '▶ Hide';
}

// ── Icon dropdown builder ─────────────────────────────────────────────────────
function buildIconOptions(selectedId) {
  return mapAPI.config.icons.map(ic =>
    `<option value="${ic.id}" ${ic.id === selectedId ? 'selected' : ''}>${ic.label}</option>`
  ).join('');
}

// ── List renderers ────────────────────────────────────────────────────────────
function renderList() {
  if (editorState.activeTab === 'markers') renderMarkerList();
  else if (editorState.activeTab === 'labels') renderLabelList();
  else renderDataTab();
}

function renderMarkerList() {
  const list = document.getElementById('marker-list');
  const items = window.mapState.markers;
  if (!items.length) {
    list.innerHTML = '<p class="empty-state">No markers yet.<br>Enable Edit Mode and click the map.</p>';
    return;
  }

  list.innerHTML = items.map(m => {
    const iconDef = mapAPI.config.icons.find(i => i.id === m.icon) || mapAPI.config.icons[0];
    const sel = editorState.selectedId === m.id && editorState.selectedType === 'marker';
    return `
      <div class="item-entry ${sel ? 'selected' : ''}" data-id="${m.id}" data-type="marker">
        <img class="item-icon" src="icons/${iconDef.file}" alt="">
        <span class="item-name">${m.name || '(unnamed)'}</span>
        <span class="item-meta">z${m.minZoom ?? '?'}–${m.maxZoom ?? '?'}</span>
      </div>`;
  }).join('');

  list.querySelectorAll('.item-entry').forEach(el => {
    el.addEventListener('click', () => editorSelectMarker(el.dataset.id));
  });
}

function renderLabelList() {
  const list = document.getElementById('label-list');
  const items = window.mapState.labels;
  if (!items.length) {
    list.innerHTML = '<p class="empty-state">No area labels yet.<br>Enable Edit Mode and click the map.</p>';
    return;
  }

  list.innerHTML = items.map(l => {
    const sel = editorState.selectedId === l.id && editorState.selectedType === 'label';
    return `
      <div class="item-entry ${sel ? 'selected' : ''}" data-id="${l.id}" data-type="label">
        <span class="item-name">${l.name || '(unnamed)'}</span>
        <span class="item-meta">${l.fontSize || 18}px</span>
      </div>`;
  }).join('');

  list.querySelectorAll('.item-entry').forEach(el => {
    el.addEventListener('click', () => editorSelectLabel(el.dataset.id));
  });
}

function renderDataTab() {
  document.getElementById('stat-markers').textContent = window.mapState.markers.length;
  document.getElementById('stat-labels').textContent  = window.mapState.labels.length;
}

// ── Selection & edit form ─────────────────────────────────────────────────────
window.editorSelectMarker = function(id) {
  editorState.selectedId   = id;
  editorState.selectedType = 'marker';
  const m = window.mapState.markers.find(x => x.id === id);
  if (!m) return;
  mapAPI.flyTo(m.lat, m.lng);
  showMarkerForm(m);
  renderMarkerList();
};

function editorSelectLabel(id) {
  editorState.selectedId   = id;
  editorState.selectedType = 'label';
  const l = window.mapState.labels.find(x => x.id === id);
  if (!l) return;
  mapAPI.flyTo(l.lat, l.lng);
  showLabelForm(l);
  renderLabelList();
}

function showMarkerForm(m) {
  const wrap = document.getElementById('edit-form-wrap');
  document.getElementById('edit-form-title').textContent = m ? 'Edit Marker' : 'New Marker';

  const cfg = mapAPI.config;
  wrap.querySelector('#edit-form-fields').innerHTML = `
    <div class="field">
      <label>Name</label>
      <input type="text" id="ef-name" value="${m?.name || ''}" placeholder="Marker name">
    </div>
    <div class="field">
      <label>Icon</label>
      <select id="ef-icon">${buildIconOptions(m?.icon)}</select>
    </div>
    <div class="field field-row">
      <div>
        <label>Min Zoom</label>
        <input type="number" id="ef-minzoom" value="${m?.minZoom ?? cfg.minZoom}" step="0.25" min="${cfg.minZoom}" max="${cfg.maxZoom}">
      </div>
      <div>
        <label>Max Zoom</label>
        <input type="number" id="ef-maxzoom" value="${m?.maxZoom ?? cfg.maxZoom}" step="0.25" min="${cfg.minZoom}" max="${cfg.maxZoom}">
      </div>
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="ef-desc" placeholder="Optional description">${m?.description || ''}</textarea>
    </div>
    <div class="field-row" style="font-size:11px; color:var(--ink-faint); margin-bottom:4px;">
      <span>x: ${m ? Math.round(m.lng) : '—'}  y: ${m ? Math.round(mapAPI.config.imageHeight - m.lat) : '—'}</span>
    </div>
  `;

  const btnRow = wrap.querySelector('#edit-form-btns');
  btnRow.innerHTML = `
    <button class="btn primary" id="ef-save">Save</button>
    <button class="btn danger" id="ef-delete">Delete</button>
    <button class="btn" id="ef-cancel">Cancel</button>
  `;

  wrap.style.display = 'block';

  wrap.querySelector('#ef-save').addEventListener('click', () => {
    const updated = {
      ...m,
      name:        document.getElementById('ef-name').value.trim() || '(unnamed)',
      icon:        document.getElementById('ef-icon').value,
      minZoom:     parseFloat(document.getElementById('ef-minzoom').value),
      maxZoom:     parseFloat(document.getElementById('ef-maxzoom').value),
      description: document.getElementById('ef-desc').value.trim(),
    };
    mapAPI.updateMarker(updated);
    showToast('Marker saved');
    renderMarkerList();
    showMarkerForm(updated);
  });

  wrap.querySelector('#ef-delete').addEventListener('click', () => {
    mapAPI.deleteMarker(m.id);
    showToast('Marker deleted');
    clearEditForm();
    renderMarkerList();
  });

  wrap.querySelector('#ef-cancel').addEventListener('click', () => {
    clearEditForm();
    editorState.selectedId = null;
    renderMarkerList();
  });
}

function showLabelForm(l) {
  const wrap = document.getElementById('edit-form-wrap');
  document.getElementById('edit-form-title').textContent = l ? 'Edit Label' : 'New Label';

  const cfg = mapAPI.config;
  wrap.querySelector('#edit-form-fields').innerHTML = `
    <div class="field">
      <label>Label Text</label>
      <input type="text" id="ef-name" value="${l?.name || ''}" placeholder="Region name">
    </div>
    <div class="field">
      <label>Font Size (px)</label>
      <input type="number" id="ef-fontsize" value="${l?.fontSize || 18}" min="8" max="72">
    </div>
    <div class="field field-row">
      <div>
        <label>Min Zoom</label>
        <input type="number" id="ef-minzoom" value="${l?.minZoom ?? cfg.minZoom}" step="0.25" min="${cfg.minZoom}" max="${cfg.maxZoom}">
      </div>
      <div>
        <label>Max Zoom</label>
        <input type="number" id="ef-maxzoom" value="${l?.maxZoom ?? cfg.maxZoom}" step="0.25" min="${cfg.minZoom}" max="${cfg.maxZoom}">
      </div>
    </div>
    <div class="field-row" style="font-size:11px; color:var(--ink-faint); margin-bottom:4px;">
      <span>x: ${l ? Math.round(l.lng) : '—'}  y: ${l ? Math.round(mapAPI.config.imageHeight - l.lat) : '—'}</span>
    </div>
  `;

  const btnRow = wrap.querySelector('#edit-form-btns');
  btnRow.innerHTML = `
    <button class="btn primary" id="ef-save">Save</button>
    <button class="btn danger" id="ef-delete">Delete</button>
    <button class="btn" id="ef-cancel">Cancel</button>
  `;

  wrap.style.display = 'block';

  wrap.querySelector('#ef-save').addEventListener('click', () => {
    const updated = {
      ...l,
      name:     document.getElementById('ef-name').value.trim() || '(unnamed)',
      fontSize: parseInt(document.getElementById('ef-fontsize').value, 10) || 18,
      minZoom:  parseFloat(document.getElementById('ef-minzoom').value),
      maxZoom:  parseFloat(document.getElementById('ef-maxzoom').value),
    };
    mapAPI.updateLabel(updated);
    showToast('Label saved');
    renderLabelList();
    showLabelForm(updated);
  });

  wrap.querySelector('#ef-delete').addEventListener('click', () => {
    mapAPI.deleteLabel(l.id);
    showToast('Label deleted');
    clearEditForm();
    renderLabelList();
  });

  wrap.querySelector('#ef-cancel').addEventListener('click', () => {
    clearEditForm();
    editorState.selectedId = null;
    renderLabelList();
  });
}

function clearEditForm() {
  const wrap = document.getElementById('edit-form-wrap');
  wrap.style.display = 'none';
  wrap.querySelector('#edit-form-fields').innerHTML = '';
  wrap.querySelector('#edit-form-btns').innerHTML   = '';
  editorState.selectedId   = null;
  editorState.selectedType = null;
  editorState.pendingType  = null;
  updatePlaceBtnStates();
}

// ── Place buttons ─────────────────────────────────────────────────────────────
function updatePlaceBtnStates() {
  document.querySelectorAll('[data-place]').forEach(btn => {
    const active = editorState.pendingType === btn.dataset.place;
    btn.classList.toggle('primary', active);
  });
}

function startPlacing(type) {
  if (!editorState.editMode) {
    showToast('Enable Edit Mode first');
    return;
  }
  editorState.pendingType = editorState.pendingType === type ? null : type;
  updatePlaceBtnStates();
  if (editorState.pendingType) showToast(`Click the map to place a ${type}`);
}

// ── Map click handler ─────────────────────────────────────────────────────────
window.editorHandleMapClick = function(latlng) {
  if (!editorState.editMode || !editorState.pendingType) return;

  if (editorState.pendingType === 'marker') {
    const newMarker = {
      id:          uid(),
      name:        'New Marker',
      lat:         latlng.lat,
      lng:         latlng.lng,
      icon:        'default',
      minZoom:     mapAPI.config.minZoom,
      maxZoom:     mapAPI.config.maxZoom,
      description: '',
    };
    mapAPI.addMarker(newMarker);
    editorState.pendingType = null;
    updatePlaceBtnStates();
    switchTab('markers');
    editorSelectMarker(newMarker.id);
    showToast('Marker placed — edit details below');

  } else if (editorState.pendingType === 'label') {
    const newLabel = {
      id:       uid(),
      name:     'New Region',
      lat:      latlng.lat,
      lng:      latlng.lng,
      fontSize: 18,
      minZoom:  mapAPI.config.minZoom,
      maxZoom:  mapAPI.config.maxZoom,
    };
    mapAPI.addLabel(newLabel);
    editorState.pendingType = null;
    updatePlaceBtnStates();
    switchTab('labels');
    editorSelectLabel(newLabel.id);
    showToast('Label placed — edit details below');
  }
};

// ── Import / Export ───────────────────────────────────────────────────────────
function exportData() {
  const json = mapAPI.exportJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mapdata.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('mapdata.json downloaded');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        mapAPI.importJSON(ev.target.result);
        showToast(`Loaded ${window.mapState.markers.length} markers, ${window.mapState.labels.length} labels`);
        renderList();
      } catch (err) {
        showToast('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ── Init ──────────────────────────────────────────────────────────────────────
window.editorInit = function() {
  // Sidebar toggle
  document.getElementById('toggle-sidebar-btn')
    .addEventListener('click', toggleSidebar);

  // Edit mode toggle
  document.getElementById('edit-mode-btn')
    .addEventListener('click', () => setEditMode(!editorState.editMode));

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // Place buttons
  document.querySelectorAll('[data-place]').forEach(btn =>
    btn.addEventListener('click', () => startPlacing(btn.dataset.place)));

  // Export / Import
  document.getElementById('btn-export')?.addEventListener('click', exportData);
  document.getElementById('btn-import')?.addEventListener('click', importData);

  // Initial render
  renderList();
};
