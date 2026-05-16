/**
 * Virasat-Namma Frontend — app.js
 * Architecture: Clean separation of UI Layer and Business/Data Layer
 */

'use strict';

// ═══════════════════════════════════════════════════════
// ── CONFIGURATION ──────────────────────────────────────
// ═══════════════════════════════════════════════════════

const CONFIG = {
  API_BASE: window.location.origin + '/api',
  DEFAULT_LAT: 15.3173,   // Karnataka center
  DEFAULT_LNG: 75.7139,
  DEFAULT_RADIUS: 500,    // show all initially
};

// ═══════════════════════════════════════════════════════
// ── STATE (Business Layer) ─────────────────────────────
// ═══════════════════════════════════════════════════════

const State = {
  lang: 'en',
  userId: null,
  userLat: null,
  userLng: null,
  sites: [],
  map: null,
  mapMarkers: [],
};

// Persist userId in localStorage (simulating device_id)
function initUser() {
  let id = localStorage.getItem('vn_user_id');
  if (!id) {
    id = 'user-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('vn_user_id', id);
  }
  State.userId = id;

  API.registerUser({ device_id: id, name: 'Heritage Explorer', preferred_lang: 'en' })
    .catch(() => {}); // Silently fail — user already exists
}

// ═══════════════════════════════════════════════════════
// ── API LAYER (Business Logic — separated from UI) ─────
// ═══════════════════════════════════════════════════════

const API = {
  async get(path) {
    const res = await fetch(CONFIG.API_BASE + path);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  },

  async post(path, body) {
    const res = await fetch(CONFIG.API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  },

  async postForm(path, formData) {
    const res = await fetch(CONFIG.API_BASE + path, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  },

  async patch(path, body) {
    const res = await fetch(CONFIG.API_BASE + path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  },

  // Business methods
  fetchSites(lat, lng, radius) {
    let url = `/sites?lang=${State.lang}&radius=${radius}`;
    if (lat !== undefined && lng !== undefined) url += `&lat=${lat}&lng=${lng}`;
    return this.get(url);
  },

  fetchSiteById(id) {
    return this.get(`/sites/${id}?lang=${State.lang}`);
  },

  resolveQR(code) {
    return this.get(`/sites/qr/${encodeURIComponent(code)}?lang=${State.lang}`);
  },

  checkIn(siteId, lat, lng) {
    return this.post('/checkins', {
      site_id: siteId,
      user_id: State.userId,
      latitude: lat,
      longitude: lng,
    });
  },

  getPassport() {
    return this.get(`/checkins/passport/${State.userId}`);
  },

  getCheckinStatus(siteId) {
    return this.get(`/checkins/status/${State.userId}/${siteId}`);
  },

  submitReport(formData) {
    return this.postForm('/reports', formData);
  },

  registerUser(body) {
    return this.post('/users/register', body);
  },
};

// ═══════════════════════════════════════════════════════
// ── GEOLOCATION (Business Logic) ──────────────────────
// ═══════════════════════════════════════════════════════

function initGeolocation() {
  const dot = document.querySelector('.gps-dot');
  const gpsText = document.getElementById('gpsText');
  const coordDisplay = document.getElementById('coordDisplay');

  if (!navigator.geolocation) {
    if (dot) dot.classList.add('error');
    if (gpsText) gpsText.textContent = 'No GPS';
    useDefaultLocation();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      State.userLat = pos.coords.latitude;
      State.userLng = pos.coords.longitude;
      if (dot) dot.classList.add('active');
      if (gpsText) gpsText.textContent = 'GPS Active';
      if (coordDisplay) coordDisplay.textContent = `${State.userLat.toFixed(4)}°N, ${State.userLng.toFixed(4)}°E`;
      loadSites();
      if (State.map) centerMapOnUser();
    },
    () => {
      if (dot) dot.classList.add('error');
      if (gpsText) gpsText.textContent = 'GPS Off';
      useDefaultLocation();
    },
    { timeout: 8000, enableHighAccuracy: true }
  );
}

function useDefaultLocation() {
  State.userLat = CONFIG.DEFAULT_LAT;
  State.userLng = CONFIG.DEFAULT_LNG;
  const coordDisplay = document.getElementById('coordDisplay');
  if (coordDisplay) coordDisplay.textContent = 'Karnataka, India (Default)';
  loadSites();
}

function captureLocation() {
  if (State.userLat !== null && State.userLng !== null) {
    document.getElementById('reportLat').value = State.userLat.toFixed(6);
    document.getElementById('reportLng').value = State.userLng.toFixed(6);
    showToast('📍 Location captured!');
  } else {
    showToast('⚠️ GPS not available');
  }
}

// ═══════════════════════════════════════════════════════
// ── UI: DISCOVER TAB ──────────────────────────────────
// ═══════════════════════════════════════════════════════

async function loadSites() {
  const radius = document.getElementById('radiusSelect')?.value || CONFIG.DEFAULT_RADIUS;
  const grid = document.getElementById('sitesGrid');
  if (!grid) return;

  grid.innerHTML = `<div class="loading-sites"><div class="spinner"></div><p>Discovering heritage...</p></div>`;

  try {
    const data = await API.fetchSites(State.userLat, State.userLng, radius);
    State.sites = data.sites;
    renderSitesGrid(data.sites);
    populateReportSiteSelect(data.sites);
    if (State.map) renderMapMarkers(data.sites);
  } catch (err) {
    grid.innerHTML = `<div class="loading-sites"><p>⚠️ Could not load sites. Is the server running?<br/><small>${err.message}</small></p></div>`;
  }
}

function renderSitesGrid(sites) {
  const grid = document.getElementById('sitesGrid');
  if (!sites.length) {
    grid.innerHTML = `<div class="loading-sites"><p>🔍 No sites found in this radius.</p></div>`;
    return;
  }

  grid.innerHTML = sites.map(site => buildSiteCard(site)).join('');
}

function buildSiteCard(site) {
  const dist = site.distance_km !== undefined
    ? `<span class="card-distance">${site.distance_km} km</span>` : '';

  const displayName = site.display_name || site.name;
  const displayDesc = site.display_description || site.description;
  const imgHtml = site.image_url
    ? `<img src="${site.image_url}" class="card-img" alt="${displayName}" onerror="this.style.display='none'">`
    : '<span class="card-image-placeholder">🛕</span>';

  return `
    <div class="site-card" onclick="openSiteModal('${site.id}')">
      <div class="card-image">
        ${imgHtml}
        ${dist}
        <span class="card-badge">${site.period || 'Ancient'}</span>
      </div>
      <div class="card-body">
        <div class="card-title">${displayName}</div>
        <div class="card-title-kn">${site.name_kn}</div>
        <div class="card-desc">${displayDesc}</div>
        <div class="card-meta">
          <span class="meta-tag">📍 ${site.district}</span>
          <span class="meta-tag">🏛 ${site.period || 'Historical'}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn-checkin" id="checkin-${site.id}" onclick="event.stopPropagation(); doCheckIn('${site.id}')">
          ✓ Check In
        </button>
        <button class="btn-info" onclick="event.stopPropagation(); openSiteModal('${site.id}')">
          Info
        </button>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// ── UI: SITE DETAIL MODAL ─────────────────────────────
// ═══════════════════════════════════════════════════════

async function openSiteModal(siteId) {
  const modal = document.getElementById('siteModal');
  const content = document.getElementById('modalContent');
  modal.classList.remove('hidden');

  content.innerHTML = `<div class="loading-sites"><div class="spinner"></div></div>`;

  try {
    const { site } = await API.fetchSiteById(siteId);
    const { checked_in } = await API.getCheckinStatus(siteId);

    const displayName = site.display_name || site.name;
    const displayDesc = site.display_description || site.description;

    content.innerHTML = `
      <div class="modal-site-title">${displayName}</div>
      <div class="modal-site-kn">${site.name_kn}</div>
      <div class="modal-meta-row">
        <span class="modal-tag">📍 ${site.district}</span>
        <span class="modal-tag">📅 ${site.period || 'Historical'}</span>
      </div>
      <div class="modal-divider"></div>

      ${site.image_url ? `<img src="${site.image_url}" style="width:100%;border-radius:12px;margin-bottom:1rem;box-shadow:var(--shadow-soft)" onerror="this.style.display='none'">` : ''}

      <div class="modal-section-title">About</div>
      <div class="modal-text">${displayDesc}</div>

      <div class="modal-section-title">Architectural Significance</div>
      <div class="modal-text">${site.architectural_significance || 'Information not available.'}</div>

      <div class="modal-section-title">Local Legend</div>
      <div class="modal-text">${site.local_legend || 'Stories passed down through generations.'}</div>

      <div class="modal-section-title">QR Code</div>
      <div class="modal-text" style="font-family:monospace;font-size:0.9rem;color:var(--saffron)">
        ${site.qr_code}
      </div>

      <div class="modal-actions">
        <button class="btn-checkin ${checked_in ? 'checked' : ''}" style="flex:2"
          onclick="doCheckIn('${site.id}')">
          ${checked_in ? '✓ Checked In' : '✓ Check In'}
        </button>
        <button class="btn-info" style="flex:1"
          onclick="closeSiteModalDirect(); switchTab('qr', document.querySelectorAll('.nav-btn')[2]); fillQR('${site.qr_code}')">
          Scan QR
        </button>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p style="color:var(--error)">Error: ${err.message}</p>`;
  }
}

function closeSiteModal(event) {
  if (event.target === document.getElementById('siteModal')) closeSiteModalDirect();
}

function closeSiteModalDirect() {
  document.getElementById('siteModal').classList.add('hidden');
}

// ═══════════════════════════════════════════════════════
// ── UI: CHECK-IN (Business Logic Call → UI Update) ────
// ═══════════════════════════════════════════════════════

async function doCheckIn(siteId) {
  try {
    const res = await API.checkIn(siteId, State.userLat, State.userLng);
    showToast(`🛕 ${res.message}`);

    // Update UI button
    const btn = document.getElementById(`checkin-${siteId}`);
    if (btn) { btn.textContent = '✓ Checked In'; btn.classList.add('checked'); }

    // Refresh passport if on that tab
    loadPassport();
  } catch (err) {
    showToast(`⚠️ ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════
// ── UI: MAP TAB ───────────────────────────────────────
// ═══════════════════════════════════════════════════════

function initMap() {
  if (State.map) return;

  State.map = L.map('map', { zoomControl: true }).setView(
    [State.userLat || CONFIG.DEFAULT_LAT, State.userLng || CONFIG.DEFAULT_LNG], 7
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(State.map);

  // User marker
  if (State.userLat !== null) {
    L.circleMarker([State.userLat, State.userLng], {
      radius: 8, fillColor: '#2196F3', color: '#fff',
      weight: 2, fillOpacity: 0.9,
    }).addTo(State.map).bindPopup('📍 You are here');
  }

  if (State.sites.length) renderMapMarkers(State.sites);
}

function renderMapMarkers(sites) {
  if (!State.map) return;

  State.mapMarkers.forEach(m => m.remove());
  State.mapMarkers = [];

  sites.forEach(site => {
    const icon = L.divIcon({
      html: `<div style="
        background:${site.status === 'reported' ? '#F44336' : (site.status === 'cleaned' ? '#4CAF50' : '#E8621A')};
        border:2px solid white; border-radius:50% 50% 50% 0;
        width:28px; height:28px; transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
      "><span style="transform:rotate(45deg);font-size:12px">🛕</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      className: '',
    });

    const marker = L.marker([site.latitude, site.longitude], { icon })
      .addTo(State.map)
      .bindPopup(`
        <strong>${site.display_name || site.name}</strong><br/>
        <span style="font-size:0.75rem;color:#666">${site.district} · ${site.period || ''}</span><br/>
        <button onclick="openSiteModal('${site.id}')"
          style="margin-top:6px;padding:4px 12px;background:#E8621A;color:white;
                 border:none;border-radius:6px;cursor:pointer;font-size:0.75rem">
          View Details
        </button>
      `);

    State.mapMarkers.push(marker);
  });
}

function centerMapOnUser() {
  if (State.map && State.userLat !== null) {
    State.map.setView([State.userLat, State.userLng], 8);
  }
}

// ═══════════════════════════════════════════════════════
// ── UI: QR SCANNER ────────────────────────────────────
// ═══════════════════════════════════════════════════════

function fillQR(code) {
  const input = document.getElementById('qrManualInput');
  if (input) input.value = code;
}

async function resolveQR() {
  const code = document.getElementById('qrManualInput').value.trim();
  const result = document.getElementById('qrResult');

  if (!code) { showToast('⚠️ Enter a QR code'); return; }

  result.classList.add('hidden');
  result.innerHTML = '<div class="spinner" style="margin:auto"></div>';
  result.classList.remove('hidden');

  try {
    const { site, hidden_fact } = await API.resolveQR(code);
    const displayName = site.display_name || site.name;
    const displayDesc = site.display_description || site.description;

    result.innerHTML = `
      <div style="margin-bottom:0.5rem">
        <div style="font-family:'Cinzel Decorative',serif;font-size:0.95rem;color:var(--gold)">
          ${displayName}
        </div>
        <div style="font-family:'Tiro Kannada',serif;font-size:0.8rem;color:var(--stone-light)">
          ${site.name_kn}
        </div>
      </div>
      <div style="font-size:0.78rem;color:var(--ivory-dark);margin-bottom:0.75rem;line-height:1.5">
        ${displayDesc}
      </div>
      <div class="hidden-fact-banner">
        <strong>🔓 Hidden Fact Unlocked!</strong>
        ${hidden_fact || 'This site holds many mysteries yet to be uncovered...'}
      </div>
      <div style="display:flex;gap:8px;margin-top:0.85rem">
        <button class="btn-checkin" style="flex:1" onclick="doCheckIn('${site.id}')">
          ✓ Check In Here
        </button>
        <button class="btn-info" style="flex:1;color:white;background:rgba(255,255,255,0.1)"
          onclick="openSiteModal('${site.id}')">
          Full Info
        </button>
      </div>
    `;

    showToast('🎉 QR Code recognized!');
  } catch (err) {
    result.innerHTML = `
      <div style="color:#FF7043;font-size:0.85rem">
        ❌ ${err.message}
      </div>`;
  }
}

// ═══════════════════════════════════════════════════════
// ── UI: TRAVEL PASSPORT ───────────────────────────────
// ═══════════════════════════════════════════════════════

async function loadPassport() {
  try {
    const data = await API.getPassport();
    renderPassport(data);
  } catch (err) {
    console.warn('Passport load error:', err.message);
  }
}

function renderPassport(data) {
  const stampCountEl = document.getElementById('stampCount');
  const completionPctEl = document.getElementById('completionPct');
  const progressBarEl = document.getElementById('progressBar');

  if (stampCountEl) stampCountEl.textContent = data.stamps_count;
  if (completionPctEl) completionPctEl.textContent = data.completion_pct + '%';
  if (progressBarEl) progressBarEl.style.width = data.completion_pct + '%';

  const grid = document.getElementById('stampsGrid');
  if (!grid) return;

  if (!data.stamps.length) {
    grid.innerHTML = `
      <div class="no-stamps">
        <p>🗺️</p>
        <p>No stamps yet — start exploring!</p>
      </div>`;
    return;
  }

  const emojis = ['🛕','⛩','🏛','🗿','🏺','🔱','☸️','🪬'];
  grid.innerHTML = data.stamps.map((stamp, i) => {
    const name = State.lang === 'kn' ? stamp.name_kn : stamp.name;
    return `
    <div class="stamp-card">
      <div class="stamp-badge">Visited</div>
      <div class="stamp-emoji">${emojis[i % emojis.length]}</div>
      <div class="stamp-name">${name}</div>
      <div style="font-size:0.65rem;color:var(--stone);margin-bottom:2px">${stamp.district}</div>
      <div class="stamp-date">${formatDate(stamp.visit_date)}</div>
    </div>
  `}).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ═══════════════════════════════════════════════════════
// ── UI: REPORT TAB ────────────────────────────────────
// ═══════════════════════════════════════════════════════

function populateReportSiteSelect(sites) {
  const sel = document.getElementById('reportSiteSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Select Heritage Site --</option>' +
    sites.map(s => {
      const name = State.lang === 'kn' ? s.name_kn : s.name;
      return `<option value="${s.id}">${name}</option>`;
    }).join('');
}

function previewPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  const preview = document.getElementById('photoPreview');
  const label = document.getElementById('photoLabel');
  if (preview) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
  }
  if (label) label.textContent = `📸 ${file.name} (${(file.size / 1024).toFixed(0)}KB)`;
}

async function submitReport() {
  const site_id = document.getElementById('reportSiteSelect').value;
  const lat = document.getElementById('reportLat').value;
  const lng = document.getElementById('reportLng').value;
  const desc = document.getElementById('reportDesc').value;
  const photo = document.getElementById('photoInput').files[0];
  const resultEl = document.getElementById('reportResult');

  if (!site_id) { showToast('⚠️ Please select a heritage site'); return; }
  if (lat === '' || lng === '') { showToast('⚠️ Please capture your GPS location'); return; }

  const formData = new FormData();
  formData.append('site_id', site_id);
  formData.append('user_id', State.userId);
  formData.append('latitude', lat);
  formData.append('longitude', lng);
  formData.append('description', desc);
  if (photo) formData.append('photo', photo);

  try {
    const res = await API.submitReport(formData);
    resultEl.className = 'report-result success';
    resultEl.innerHTML = `✅ ${res.message}<br/>
      <small>Report ID: ${res.report_id}</small><br/>
      ${res.photo_url ? `<small>📸 Photo uploaded & compressed</small>` : ''}
    `;
    resultEl.classList.remove('hidden');
    showToast('✅ Report submitted!');
  } catch (err) {
    resultEl.className = 'report-result error';
    resultEl.innerHTML = `❌ ${err.message}`;
    resultEl.classList.remove('hidden');
  }
}

// ═══════════════════════════════════════════════════════
// ── UI: LANGUAGE TOGGLE ───────────────────────────────
// ═══════════════════════════════════════════════════════

function toggleLang() {
  State.lang = State.lang === 'en' ? 'kn' : 'en';
  const btn = document.getElementById('langToggle');
  if (btn) btn.textContent = State.lang === 'en' ? 'ಕನ್ನಡ' : 'English';

  // Update all data-en / data-kn elements
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.getAttribute(`data-${State.lang}`) || el.getAttribute('data-en');
  });

  // Reload sites in new language
  loadSites();
  loadPassport();
}

// ═══════════════════════════════════════════════════════
// ── UI: TAB NAVIGATION ────────────────────────────────
// ═══════════════════════════════════════════════════════

function switchTab(name, btn) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const tab = document.getElementById(`tab-${name}`);
  if (tab) tab.classList.add('active');
  if (btn) btn.classList.add('active');

  if (name === 'map') {
    setTimeout(() => {
      initMap();
      if (State.map) State.map.invalidateSize();
    }, 100);
  }

  if (name === 'passport') {
    loadPassport();
  }
}

// ═══════════════════════════════════════════════════════
// ── UI: TOAST ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ═══════════════════════════════════════════════════════
// ── BOOT SEQUENCE ─────────────────────────────────────
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Hide splash after 2.5s
  setTimeout(() => {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    if (splash) splash.style.display = 'none';
    if (app) app.classList.remove('hidden');

    initUser();
    initGeolocation();
  }, 2500);
});
