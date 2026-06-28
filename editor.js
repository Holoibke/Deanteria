// ── editor.js ─────────────────────────────────────────────────────────────────
// Runs after viewer.js. Assumes `map`, `markerLayers`, `labelLayers`,
// `loadData`, `toLatLng`, `addMarker`, `addLabel` are all in scope.
//
// Password: change EDITOR_PASSWORD_HASH to match your chosen password.
// To generate a new hash, open the browser console and run:
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourpassword'))
//     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
//
// Default password is:  fantasycartographer
// ──────────────────────────────────────────────────────────────────────────────

const EDITOR_PASSWORD_HASH =
  'e6c239a49b5e78396c7bb3e7ee89fe40ee44f5b0862553c2c81498da9c5ff4aa';

// ── Available icon types ──────────────────────────────────────────────────────
// Add entries here as you drop new files into the icons/ folder.
const ICON_OPTIONS = [
  { label: 'City',    value: 'icons/city.png'    },
  { label: 'Town',    value: 'icons/town.png'    },
  { label: 'Dungeon', value: 'icons/dungeon.png' },
  { label: 'Castle',  value: 'icons/castle.png'  },
  { label: 'Ruin',    value: 'icons/ruin.png'    },
  { label: 'Port',    value: 'icons/port.png'    },
  { label: 'Temple',  value: 'icons/temple.png'  },
  { label: 'Camp',    value: 'icons/camp.png'    },
];

const LABEL_STYLES = ['region', 'ocean', 'city'];

// ── State ─────────────────────────────────────────────────────────────────────
let mapData     = { markers: [], labels: [] };
let editTarget  = null;   // { type: 'marker'|'label', id }
let placingMode = null;   // 'marker' | 'label' | null
let cfg         = {};     // github settings

// ── Password gate ─────────────────────────────────────────────────────────────
async function sha256(str) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function tryUnlock() {
  const val  = document.getElementById('gate-input').value;
  const hash = await sha256(val);
  if (hash === EDITOR_PASSWORD_HASH) {
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initEditor();
  } else {
    const err = document.getElementById('gate-error');
    err.textContent = 'Incorrect password.';
    setTimeout(() => { err.textContent = ''; }, 2000);
    document.getElementById('gate-input').value = '';
  }
}

document.getElementById('gate-btn').addEventListener('click', tryUnlock);
document.getElementById('gate-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') tryUnlock();
});

// ── Init (runs after auth) ────────────────────────────────────────────────────
async function initEditor() {
  loadCfg();
  await loadEditorData();
  initTabs();
  initMapClickPlacement();

  document.getElementById('add-marker-btn').addEventListener('click', () => startPlacing('marker'));
  document.getElementById('add-label-btn').addEventListener('click',  () => startPlacing('label'));
  document.getElementById('commit-btn').addEventListener('click', commitToGithub);
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('edit-save-btn').addEventListener('click',   applyEdit);
  document.getElementById('edit-cancel-btn').addEventListener('click', closeEditPanel);
  document.getElementById('edit-delete-btn').addEventListener('click', deleteItem);
}

// ── Config (GitHub settings) ──────────────────────────────────────────────────
function loadCfg() {
  const stored = localStorage.getItem('map-editor-cfg');
  cfg = stored ? JSON.parse(stored) : {};
  if (cfg.owner)  document.getElementById('cfg-owner').value  = cfg.owner;
  if (cfg.repo)   document.getElementById('cfg-repo').value   = cfg.repo;
  if (cfg.branch) document.getElementById('cfg-branch').value = cfg.branch;
  if (cfg.token)  document.getElementById('cfg-token').value  = cfg.token;
}

function saveSettings() {
  cfg = {
    owner:  document.getElementById('cfg-owner').value.trim(),
    repo:   document.getElementById('cfg-repo').value.trim(),
    branch: document.getElementById('cfg-branch').value.trim() || 'main',
    token:  document.getElementById('cfg-token').value.trim(),
  };
  localStorage.setItem('map-editor-cfg', JSON.stringify(cfg));
  setStatus('settings-status', 'Saved.', 'ok');
}

// ── Data ──────────────────────────────────────────────────────────────────────
async function loadEditorData() {
  try {
    const res  = await fetch(`data.json?_=${Date.now()}`);
    mapData    = await res.json();
  } catch {
    mapData = { markers: [], labels: [] };
  }
  await loadData(); // re-render viewer layers
  renderLists();
}

function renderLists() {
  renderMarkerList();
  renderLabelList();
}

function renderMarkerList() {
  const el = document.getElementById('markers-list');
  el.innerHTML = '';
  (mapData.markers || []).forEach(m => {
    const item = document.createElement('div');
    item.className = 'list-item' + (editTarget?.id === m.id ? ' selected' : '');
    item.dataset.id = m.id;

    const iconEl = m.icon
      ? `<img class="list-item-icon" src="${m.icon}" alt="" />`
      : `<div class="list-item-icon-placeholder"></div>`;

    item.innerHTML = `
      ${iconEl}
      <span class="list-item-name">${m.name || '(unnamed)'}</span>
      <span class="list-item-zoom">z${m.minZoom}–${m.maxZoom}</span>
    `;
    item.addEventListener('click', () => openEditPanel('marker', m.id));
    el.appendChild(item);
  });
}

function renderLabelList() {
  const el = document.getElementById('labels-list');
  el.innerHTML = '';
  (mapData.labels || []).forEach(l => {
    const item = document.createElement('div');
    item.className = 'list-item' + (editTarget?.id === l.id ? ' selected' : '');
    item.dataset.id = l.id;
    item.innerHTML = `
      <div class="list-item-icon-placeholder"></div>
      <span class="list-item-name">${l.text || '(untitled)'}</span>
      <span class="list-item-zoom">${l.style} · z${l.minZoom}–${l.maxZoom}</span>
    `;
    item.addEventListener('click', () => openEditPanel('label', l.id));
    el.appendChild(item);
  });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ── Place mode ────────────────────────────────────────────────────────────────
let previewMarker = null;

function startPlacing(type) {
  placingMode = type;
  document.getElementById('place-hint').classList.remove('hidden');
  document.getElementById('map').style.cursor = 'crosshair';
}

function stopPlacing() {
  placingMode = null;
  document.getElementById('place-hint').classList.add('hidden');
  document.getElementById('map').style.cursor = '';
  if (previewMarker) { map.removeLayer(previewMarker); previewMarker = null; }
}

function initMapClickPlacement() {
  map.on('click', e => {
    if (!placingMode) return;

    // Convert Leaflet latlng back to pixel [x, y]
    const x = Math.round(e.latlng.lng);
    const y = Math.round(MAP_HEIGHT - e.latlng.lat);

    const id = `${placingMode[0]}${Date.now()}`;

    if (placingMode === 'marker') {
      const item = {
        id, name: 'New marker',
        icon: ICON_OPTIONS[0].value,
        coords: [x, y],
        minZoom: 0, maxZoom: 5,
        description: '',
      };
      mapData.markers.push(item);
    } else {
      const item = {
        id, text: 'New label',
        style: 'region',
        coords: [x, y],
        minZoom: 0, maxZoom: 5,
      };
      mapData.labels.push(item);
    }

    stopPlacing();
    syncViewer();
    renderLists();
    openEditPanel(placingMode === null ? 'marker' : (mapData.markers.find(m=>m.id===id) ? 'marker' : 'label'), id);
  });
}

// ── Edit panel ────────────────────────────────────────────────────────────────
function openEditPanel(type, id) {
  editTarget = { type, id };
  renderLists(); // update selected highlight

  const panel = document.getElementById('edit-panel');
  const title = document.getElementById('edit-panel-title');
  const fields = document.getElementById('edit-fields');

  title.textContent = type === 'marker' ? 'Edit marker' : 'Edit label';
  fields.innerHTML = '';

  if (type === 'marker') {
    const m = mapData.markers.find(x => x.id === id);
    if (!m) return;
    fields.innerHTML = `
      ${field('Name', `<input id="ef-name" type="text" value="${esc(m.name)}" />`)}
      ${field('Description', `<textarea id="ef-desc">${esc(m.description || '')}</textarea>`)}
      ${field('Icon', `<select id="ef-icon">${ICON_OPTIONS.map(o =>
        `<option value="${o.value}" ${m.icon === o.value ? 'selected' : ''}>${o.label}</option>`
      ).join('')}</select>`)}
      <div class="zoom-row">
        ${field('Min zoom', `<input id="ef-minzoom" type="number" min="0" max="5" value="${m.minZoom}" />`)}
        ${field('Max zoom', `<input id="ef-maxzoom" type="number" min="0" max="5" value="${m.maxZoom}" />`)}
      </div>
      ${field('Coords (x, y)', `<input id="ef-coords" type="text" value="${m.coords.join(', ')}" />`)}
    `;
  } else {
    const l = mapData.labels.find(x => x.id === id);
    if (!l) return;
    fields.innerHTML = `
      ${field('Text', `<input id="ef-text" type="text" value="${esc(l.text)}" />`)}
      ${field('Style', `<select id="ef-style">${LABEL_STYLES.map(s =>
        `<option value="${s}" ${l.style === s ? 'selected' : ''}>${s}</option>`
      ).join('')}</select>`)}
      <div class="zoom-row">
        ${field('Min zoom', `<input id="ef-minzoom" type="number" min="0" max="5" value="${l.minZoom}" />`)}
        ${field('Max zoom', `<input id="ef-maxzoom" type="number" min="0" max="5" value="${l.maxZoom}" />`)}
      </div>
      ${field('Coords (x, y)', `<input id="ef-coords" type="text" value="${l.coords.join(', ')}" />`)}
    `;
  }

  panel.classList.remove('hidden');
}

function field(label, input) {
  return `<div class="field-group"><label>${label}</label>${input}</div>`;
}

function esc(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function applyEdit() {
  if (!editTarget) return;
  const { type, id } = editTarget;

  const coordRaw = document.getElementById('ef-coords')?.value || '';
  const coords   = coordRaw.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));

  if (type === 'marker') {
    const m = mapData.markers.find(x => x.id === id);
    if (!m) return;
    m.name        = document.getElementById('ef-name').value.trim();
    m.description = document.getElementById('ef-desc').value.trim();
    m.icon        = document.getElementById('ef-icon').value;
    m.minZoom     = parseInt(document.getElementById('ef-minzoom').value, 10);
    m.maxZoom     = parseInt(document.getElementById('ef-maxzoom').value, 10);
    if (coords.length === 2) m.coords = coords;
  } else {
    const l = mapData.labels.find(x => x.id === id);
    if (!l) return;
    l.text    = document.getElementById('ef-text').value.trim();
    l.style   = document.getElementById('ef-style').value;
    l.minZoom = parseInt(document.getElementById('ef-minzoom').value, 10);
    l.maxZoom = parseInt(document.getElementById('ef-maxzoom').value, 10);
    if (coords.length === 2) l.coords = coords;
  }

  syncViewer();
  renderLists();
  closeEditPanel();
}

function deleteItem() {
  if (!editTarget) return;
  const { type, id } = editTarget;
  if (type === 'marker') {
    mapData.markers = mapData.markers.filter(x => x.id !== id);
  } else {
    mapData.labels = mapData.labels.filter(x => x.id !== id);
  }
  closeEditPanel();
  syncViewer();
  renderLists();
}

function closeEditPanel() {
  editTarget = null;
  document.getElementById('edit-panel').classList.add('hidden');
  renderLists();
}

// ── Viewer sync ───────────────────────────────────────────────────────────────
// Re-renders the Leaflet layers from current mapData without a network fetch.
function syncViewer() {
  markerLayers.forEach(e => map.removeLayer(e.layer));
  labelLayers.forEach(e => map.removeLayer(e.layer));
  markerLayers.length = 0;
  labelLayers.length  = 0;

  (mapData.markers || []).forEach(addMarker);
  (mapData.labels  || []).forEach(addLabel);
}

// ── GitHub commit ─────────────────────────────────────────────────────────────
async function commitToGithub() {
  const { owner, repo, branch, token } = cfg;

  if (!owner || !repo || !token) {
    setStatus('commit-status', 'Fill in GitHub settings first.', 'err');
    return;
  }

  const btn = document.getElementById('commit-btn');
  btn.disabled = true;
  setStatus('commit-status', 'Saving…', '');

  try {
    const filePath = 'data.json';
    const apiBase  = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const headers  = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // 1. Fetch current file SHA (required to update).
    let sha = null;
    const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
    if (getRes.ok) {
      const fileInfo = await getRes.json();
      sha = fileInfo.sha;
    } else if (getRes.status !== 404) {
      throw new Error(`GitHub GET failed: ${getRes.status}`);
    }

    // 2. Encode new content.
    const json    = JSON.stringify(mapData, null, 2);
    const encoded = btoa(unescape(encodeURIComponent(json))); // UTF-8 → base64

    // 3. PUT updated file.
    const body = {
      message: `Update data.json via map editor [${new Date().toISOString().slice(0,16)}]`,
      content: encoded,
      branch,
      ...(sha ? { sha } : {}),
    };

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!putRes.ok) {
      const detail = await putRes.json().catch(() => ({}));
      throw new Error(detail.message || `HTTP ${putRes.status}`);
    }

    setStatus('commit-status', '✓ Saved to GitHub.', 'ok');
  } catch (err) {
    console.error(err);
    setStatus('commit-status', `Error: ${err.message}`, 'err');
  } finally {
    btn.disabled = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setStatus(elId, msg, type) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.className   = type === 'ok' ? 'status-ok' : type === 'err' ? 'status-err' : '';
  if (msg && type) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 4000);
}
