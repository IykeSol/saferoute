/* ═══════════════════════════════════════════════════════
   SafeRoute AI — South East Nigeria Road Safety Analytics
   script.js — Full Dashboard Logic
═══════════════════════════════════════════════════════ */

'use strict';

// ─── SE NIGERIA LOCATION DATABASE ───────────────────
const SE_LOCATIONS = {
    // Enugu State
    'Enugu':              [6.4584, 7.5464],
    'Nsukka':             [6.8562, 7.3958],
    'Ninth Mile Corner':  [6.4167, 7.4167],
    'Oji River':          [6.3600, 7.3500],
    'Agbani':             [6.3200, 7.5100],
    // Anambra State
    'Onitsha':            [6.1423, 6.7856],
    'Awka':               [6.2123, 7.0783],
    'Nnewi':              [6.0167, 6.9167],
    'Ekwulobia':          [6.0667, 7.1000],
    'Agulu':              [6.1800, 7.0600],
    'Ihiala':             [5.8700, 6.8500],
    // Imo State
    'Owerri':             [5.4836, 7.0498],
    'Orlu':               [5.7833, 7.0333],
    'Okigwe':             [5.8500, 7.3500],
    'Oguta':              [5.7167, 6.7833],
    'Aba Junction':       [5.5800, 7.1200],
    // Abia State
    'Umuahia':            [5.5167, 7.4833],
    'Aba':                [5.1065, 7.3501],
    'Ohafia':             [5.6167, 7.8000],
    'Bende':              [5.7000, 7.6500],
    // Ebonyi State
    'Abakaliki':          [6.3249, 8.1137],
    'Afikpo':             [5.8833, 7.9333],
    'Onueke':             [6.1000, 8.0000],
    'Ishielu':            [6.5000, 8.0500],
};

// XAI factor color palette
const XAI_COLORS = [
    '#4f8ef7', '#ff4757', '#ffa502', '#2ed573', '#a55eea', '#18dcff'
];

// ─── GLOBAL STATE ──────────────────────────────────
let map, heatLayer, darkTileLayer, lightTileLayer;
let analyticsLoaded = false;
let modelInfoLoaded = false;
let chartMonthly, chartTime, chartWeather, chartRoads, chartXai, chartFeatures;
let lastPrediction = null;
let xaiChart = null;

// ─── UTILITY FUNCTIONS ────────────────────────────
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4500);
}

function setLoading(btnId, loaderId, on) {
    const btn = document.getElementById(btnId);
    const ldr = document.getElementById(loaderId);
    if (!btn || !ldr) return;
    btn.disabled = on;
    ldr.classList.toggle('hidden', !on);
}

function animateCounter(el, target, duration = 1500) {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
        start += step;
        if (start >= target) {
            el.textContent = Math.round(target).toLocaleString();
            clearInterval(timer);
        } else {
            el.textContent = Math.round(start).toLocaleString();
        }
    }, 16);
}

function getNextWeekday(dayOffset) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d.toISOString().split('T')[0];
}

// ─── THEME TOGGLE ─────────────────────────────────
function initThemeToggle() {
    const btn        = document.getElementById('theme-toggle');
    const sun        = document.getElementById('theme-icon-sun');
    const moon       = document.getElementById('theme-icon-moon');
    const label      = document.getElementById('theme-label');
    const mobileBtn  = document.getElementById('mobile-theme-btn');
    const mobileSun  = document.getElementById('mobile-theme-icon-sun');
    const mobileMoon = document.getElementById('mobile-theme-icon-moon');
    const html       = document.documentElement;

    const saved = localStorage.getItem('sr-theme') || 'dark';
    applyTheme(saved);

    btn.addEventListener('click', () => {
        const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('sr-theme', next);
    });

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            localStorage.setItem('sr-theme', next);
        });
    }

    function applyTheme(theme) {
        html.dataset.theme = theme;
        const isDark = theme === 'dark';
        // Desktop toggle
        sun.classList.toggle('hidden', !isDark);
        moon.classList.toggle('hidden', isDark);
        label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        // Mobile toggle
        if (mobileSun)  mobileSun.classList.toggle('hidden', !isDark);
        if (mobileMoon) mobileMoon.classList.toggle('hidden', isDark);
        // Switch Leaflet tile layer if map already initialized
        if (map) updateMapTiles(theme);
    }
}

// ─── MOBILE NAV ─────────────────────────────────
function initMobileNav() {
    const hamburger = document.getElementById('hamburger');
    const sidebar   = document.querySelector('.sidebar');
    const backdrop  = document.getElementById('sidebar-backdrop');
    if (!hamburger || !sidebar || !backdrop) return;

    function openSidebar() {
        sidebar.classList.add('mobile-open');
        backdrop.classList.add('open');
        hamburger.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
    }
    function closeSidebar() {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
    }

    hamburger.addEventListener('click', () => {
        if (sidebar.classList.contains('mobile-open')) closeSidebar();
        else openSidebar();
    });

    // Tap backdrop to close
    backdrop.addEventListener('click', closeSidebar);

    // Close sidebar when a nav item is clicked on mobile
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });
}

// ─── CLOCK ────────────────────────────────────────
function startClock() {
    function tick() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-NG', { hour12: false });
        const dateStr = now.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
        document.getElementById('live-clock').textContent = timeStr;
        document.getElementById('live-date').textContent = dateStr + ' · Enugu, Nigeria';
    }
    tick();
    setInterval(tick, 1000);
}

// ─── TAB NAVIGATION ─────────────────────────────
function switchToTab(name) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === name);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'tab-' + name);
    });

    if (name === 'analytics' && !analyticsLoaded) {
        loadAnalytics();
    }
    if (name === 'model' && !modelInfoLoaded) {
        loadModelInfo();
    }
    if (name === 'map') {
        setTimeout(() => map && map.invalidateSize(), 200);
    }
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchToTab(btn.dataset.tab));
});

// Also expose for inline calls
window.switchToTab = switchToTab;

// ─── MAP INITIALIZATION ──────────────────────────
function initMap() {
    // Center on South East Nigeria
    map = L.map('map', {
        center: [6.02, 7.30],
        zoom: 8,
        zoomControl: true,
        attributionControl: true
    });

    // Dark tile layer
    darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright">OSM</a> \u00a9 <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd', maxZoom: 18
    });

    // Light tile layer
    lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright">OSM</a> \u00a9 <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd', maxZoom: 18
    });

    // Start with saved theme tile
    const theme = document.documentElement.dataset.theme || 'dark';
    (theme === 'light' ? lightTileLayer : darkTileLayer).addTo(map);

    // SE Nigeria city markers
    const cities = [
        { name: 'Enugu', coords: [6.4584, 7.5464] },
        { name: 'Onitsha', coords: [6.1423, 6.7856] },
        { name: 'Awka', coords: [6.2123, 7.0783] },
        { name: 'Owerri', coords: [5.4836, 7.0498] },
        { name: 'Umuahia', coords: [5.5167, 7.4833] },
        { name: 'Aba', coords: [5.1065, 7.3501] },
        { name: 'Abakaliki', coords: [6.3249, 8.1137] },
        { name: 'Nsukka', coords: [6.8562, 7.3958] },
        { name: 'Nnewi', coords: [6.0167, 6.9167] },
        { name: 'Orlu', coords: [5.7833, 7.0333] },
    ];

    cities.forEach(city => {
        const icon = L.divIcon({
            className: '',
            html: `<div style="background:rgba(7,12,26,0.88);border:1px solid rgba(79,142,247,0.4);border-radius:20px;padding:3px 9px;font-size:10px;font-weight:600;color:#4f8ef7;white-space:nowrap;font-family:Inter,sans-serif;backdrop-filter:blur(6px)">${city.name}</div>`,
            iconAnchor: [0, 0]
        });
        L.marker(city.coords, { icon }).addTo(map);
    });
}

// ─── MAP CLICK → LOCATION REPORT ─────────────────
async function onMapClick(e) {
    // Only works after heatmap analysis has been run
    if (!window._lastHotspots || window._lastHotspots.length === 0) {
        showToast('Run Analysis first to enable click-based AI summaries');
        return;
    }

    const clickLat = e.latlng.lat;
    const clickLng = e.latlng.lng;
    const RADIUS_DEG = 0.08; // ~8km radius

    // Compute stats from nearby hotspot points
    const nearby = window._lastHotspots.filter(h =>
        Math.abs(h.lat - clickLat) < RADIUS_DEG && Math.abs(h.lng - clickLng) < RADIUS_DEG
    );

    if (nearby.length === 0) {
        showToast('No analysis data near this point. Try clicking closer to a hotspot.');
        return;
    }

    const highPts  = nearby.filter(h => h.risk > 0.65).length;
    const medPts   = nearby.filter(h => h.risk >= 0.35 && h.risk <= 0.65).length;
    const lowPts   = nearby.filter(h => h.risk < 0.35).length;
    const avgRisk  = nearby.reduce((s, h) => s + h.risk, 0) / nearby.length;
    const peakRisk = Math.max(...nearby.map(h => h.risk));

    // Find nearest named location
    const NAMED = [
        ['Ninth Mile Corner', 6.4167, 7.4167],
        ['Onitsha Head Bridge', 6.1423, 6.7856],
        ['Owerri Control Post', 5.4836, 7.0498],
        ['Aba-Osisioma Junction', 5.1450, 7.3320],
        ['Awka', 6.2123, 7.0783],
        ['Ugwu Onyeama', 6.4350, 7.4500],
        ['Enugu', 6.4584, 7.5464],
        ['Umuahia', 5.5167, 7.4833],
        ['Nnewi', 6.0167, 6.9167],
        ['Orlu', 5.7833, 7.0333],
        ['Abakaliki', 6.3249, 8.1137],
    ];
    let nearestName = 'this area', minD = 999;
    for (const [name, lt, ln] of NAMED) {
        const d = Math.sqrt((lt - clickLat)**2 + (ln - clickLng)**2);
        if (d < minD) { minD = d; nearestName = name; }
    }

    // Show popup immediately with loading state
    const popup   = document.getElementById('loc-popup');
    const loading = document.getElementById('loc-loading');
    const content = document.getElementById('loc-report-content');
    const badge   = document.getElementById('loc-risk-badge');
    const pctEl   = document.getElementById('loc-risk-pct');
    const nameEl  = document.getElementById('loc-popup-name');

    nameEl.textContent = nearestName;
    pctEl.textContent  = `${(avgRisk * 100).toFixed(1)}% avg risk · ${nearby.length} pts`;

    const riskLabel = peakRisk > 0.65 ? 'critical' : avgRisk > 0.45 ? 'high' : avgRisk > 0.30 ? 'moderate' : 'low';
    badge.className  = `loc-risk-badge ${riskLabel}`;
    badge.textContent = riskLabel.toUpperCase();

    loading.classList.remove('hidden');
    content.classList.add('hidden');
    content.innerHTML = '';
    popup.classList.remove('hidden');

    try {
        const res = await fetch('/api/location_report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: clickLat,
                lng: clickLng,
                location_name: nearestName,
                radius_km: RADIUS_DEG * 111,
                nearby_high: highPts,
                nearby_med: medPts,
                nearby_low: lowPts,
                avg_risk_pct: avgRisk * 100,
                peak_risk_pct: peakRisk * 100
            })
        });
        if (!res.ok) throw new Error('Report failed');
        const data = await res.json();

        content.innerHTML = marked.parse(data.report);
        loading.classList.add('hidden');
        content.classList.remove('hidden');

        // Update badge from server-side classification
        if (data.risk_label) {
            badge.className  = `loc-risk-badge ${data.risk_label.toLowerCase()}`;
            badge.textContent = data.risk_label;
        }
    } catch (err) {
        loading.classList.add('hidden');
        content.innerHTML = `<p style="color:var(--red)">Could not generate AI summary: ${err.message}</p>`;
        content.classList.remove('hidden');
    }
}

document.getElementById('close-loc-popup').addEventListener('click', () => {
    document.getElementById('loc-popup').classList.add('hidden');
});

// ─── MAP SEARCH ──────────────────────────────────
function initMapSearch() {
    const input = document.getElementById('map-search');
    const dropdown = document.getElementById('search-dropdown');

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        if (q.length < 2) { dropdown.classList.remove('open'); return; }

        const matches = Object.entries(SE_LOCATIONS).filter(([name]) =>
            name.toLowerCase().includes(q)
        ).slice(0, 6);

        if (!matches.length) { dropdown.classList.remove('open'); return; }

        dropdown.innerHTML = matches.map(([name, coords]) =>
            `<div class="sd-item" data-name="${name}" data-lat="${coords[0]}" data-lng="${coords[1]}">
                <strong>${name}</strong>
            </div>`
        ).join('');
        dropdown.classList.add('open');
    });

    dropdown.addEventListener('click', e => {
        const item = e.target.closest('.sd-item');
        if (!item) return;
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        map.setView([lat, lng], 12, { animate: true });
        input.value = item.dataset.name;
        dropdown.classList.remove('open');
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrap')) dropdown.classList.remove('open');
    });
}

// ─── HEATMAP ANALYSIS ────────────────────────────
document.getElementById('analyze-btn').addEventListener('click', async () => {
    setLoading('analyze-btn', 'btn-loader', true);

    try {
        const bounds = map.getBounds();
        const n = parseInt(document.getElementById('resolution-select').value, 10);

        const res = await fetch('/api/predict_hotspots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bounds: [
                    bounds.getSouthWest().lng,
                    bounds.getSouthWest().lat,
                    bounds.getNorthEast().lng,
                    bounds.getNorthEast().lat
                ],
                n_points: n
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Prediction failed');
        }

        const data = await res.json();
        const hotspots = data.hotspots;

        if (heatLayer) map.removeLayer(heatLayer);

        let highCount = 0, medCount = 0, lowCount = 0, totalRisk = 0;
        const heatData = hotspots.map(h => {
            totalRisk += h.risk;
            if (h.risk > 0.65) highCount++;
            else if (h.risk > 0.35) medCount++;
            else lowCount++;
            return [h.lat, h.lng, h.risk];
        });

        const avgRisk = totalRisk / hotspots.length;

        // Store all hotspots globally for click-based reports
        window._lastHotspots = hotspots;

        heatLayer = L.heatLayer(heatData, {
            radius: 28,
            blur: 18,
            maxZoom: 14,
            max: 1.0,
            gradient: { 0.0: 'rgba(46,213,115,0)', 0.3: '#2ed573', 0.55: '#ffa502', 0.75: '#ff6b35', 1.0: '#ff4757' }
        }).addTo(map);

        // Update stats
        document.getElementById('mfs-high').textContent = highCount;
        document.getElementById('mfs-avg').textContent = (avgRisk * 100).toFixed(1) + '%';
        document.getElementById('mfs-pts').textContent = hotspots.length;
        document.getElementById('map-float-stats').classList.remove('hidden');

        document.getElementById('rb-high').textContent = highCount;
        document.getElementById('rb-med').textContent = medCount;
        document.getElementById('rb-low').textContent = lowCount;
        document.getElementById('map-result-bar').classList.remove('hidden');

        document.getElementById('sidebar-hr').textContent = highCount;

        // Store for report
        window._lastHeatStats = {
            bounds: [bounds.getSouthWest().lng, bounds.getSouthWest().lat, bounds.getNorthEast().lng, bounds.getNorthEast().lat],
            high_risk_count: highCount,
            avg_risk: avgRisk,
            total_points: hotspots.length
        };

    } catch (err) {
        showToast(err.message);
    } finally {
        setLoading('analyze-btn', 'btn-loader', false);
    }
});

// ─── AI REPORT ────────────────────────────────────
document.getElementById('generate-report-btn').addEventListener('click', async () => {
    if (!window._lastHeatStats) return;
    setLoading('generate-report-btn', 'report-loader', true);

    try {
        const res = await fetch('/api/generate_report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window._lastHeatStats)
        });
        if (!res.ok) throw new Error('Report generation failed');
        const data = await res.json();
        document.getElementById('report-content').innerHTML = marked.parse(data.report);
        document.getElementById('ai-report-panel').classList.remove('hidden');
    } catch (err) {
        showToast(err.message);
    } finally {
        setLoading('generate-report-btn', 'report-loader', false);
    }
});

document.getElementById('close-report').addEventListener('click', () => {
    document.getElementById('ai-report-panel').classList.add('hidden');
});

// ─── CHART.JS DEFAULT CONFIG ──────────────────────
const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: '#8892b0', font: { family: 'Inter', size: 11 }, padding: 16 }
        },
        tooltip: {
            backgroundColor: 'rgba(13,21,40,0.95)',
            titleColor: '#e8edf8',
            bodyColor: '#8892b0',
            borderColor: 'rgba(79,142,247,0.25)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8
        }
    },
    scales: {
        x: {
            ticks: { color: '#8892b0', font: { family: 'Inter', size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
            ticks: { color: '#8892b0', font: { family: 'Inter', size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
        }
    }
};

// ─── ANALYTICS ───────────────────────────────────
async function loadAnalytics() {
    try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Analytics fetch failed');
        const d = await res.json();

        // Animate KPI counters
        document.querySelectorAll('.counter').forEach(el => {
            const target = parseInt(el.dataset.target, 10);
            animateCounter(el, target);
        });

        // Monthly trend chart
        const ctxMonthly = document.getElementById('chart-monthly').getContext('2d');
        chartMonthly = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: d.monthly_trends.labels,
                datasets: [{
                    label: 'Accidents',
                    data: d.monthly_trends.data,
                    backgroundColor: d.monthly_trends.data.map(v =>
                        v > 100 ? 'rgba(255,71,87,0.8)' :
                        v > 80  ? 'rgba(255,165,2,0.8)' :
                                  'rgba(79,142,247,0.8)'
                    ),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                ...chartDefaults,
                plugins: {
                    ...chartDefaults.plugins,
                    legend: { display: false }
                }
            }
        });

        // Time distribution (donut)
        const ctxTime = document.getElementById('chart-time').getContext('2d');
        chartTime = new Chart(ctxTime, {
            type: 'doughnut',
            data: {
                labels: d.time_distribution.labels,
                datasets: [{
                    data: d.time_distribution.data,
                    backgroundColor: ['rgba(165,94,234,0.8)', 'rgba(79,142,247,0.8)', 'rgba(255,165,2,0.8)', 'rgba(255,71,87,0.8)'],
                    borderColor: ['#a55eea','#4f8ef7','#ffa502','#ff4757'],
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                ...chartDefaults,
                cutout: '68%',
                scales: {}
            }
        });

        // Weather distribution (pie)
        const ctxWeather = document.getElementById('chart-weather').getContext('2d');
        chartWeather = new Chart(ctxWeather, {
            type: 'pie',
            data: {
                labels: d.weather_distribution.labels,
                datasets: [{
                    data: d.weather_distribution.data,
                    backgroundColor: ['rgba(79,142,247,0.8)', 'rgba(24,220,255,0.8)', 'rgba(165,94,234,0.8)', 'rgba(255,165,2,0.8)'],
                    borderColor: ['#4f8ef7','#18dcff','#a55eea','#ffa502'],
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: { ...chartDefaults, scales: {} }
        });

        // Top dangerous roads (horizontal bar)
        const roads = d.dangerous_roads;
        const ctxRoads = document.getElementById('chart-roads').getContext('2d');
        chartRoads = new Chart(ctxRoads, {
            type: 'bar',
            data: {
                labels: roads.map(r => r.name),
                datasets: [{
                    label: 'Accidents',
                    data: roads.map(r => r.count),
                    backgroundColor: roads.map((r, i) =>
                        i < 3 ? 'rgba(255,71,87,0.85)' :
                        i < 6 ? 'rgba(255,165,2,0.85)' : 'rgba(79,142,247,0.75)'
                    ),
                    borderRadius: 5
                }]
            },
            options: {
                ...chartDefaults,
                indexAxis: 'y',
                plugins: { ...chartDefaults.plugins, legend: { display: false } }
            }
        });

        // Dangerous intersections table
        const table = document.getElementById('intersection-table');
        table.innerHTML = d.dangerous_intersections.map((item, i) => `
            <div class="int-row">
                <span class="int-rank">#${i + 1}</span>
                <span class="int-name">${item.name}</span>
                <span class="int-count">${item.count} accidents</span>
                <span class="int-risk ${item.risk.toLowerCase()}">${item.risk}</span>
            </div>
        `).join('');

        analyticsLoaded = true;
    } catch (err) {
        showToast('Could not load analytics: ' + err.message);
    }
}

// ─── PREDICTION FORM ──────────────────────────────

// Set default date to today
document.getElementById('pred-date').value = getNextWeekday(0);
document.getElementById('pred-time').value = '20:00';

// Quick example buttons
document.querySelectorAll('.qe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const dayOffset = parseInt(btn.dataset.day, 10);
        document.getElementById('pred-road').value = btn.dataset.road;
        document.getElementById('pred-location').value = btn.dataset.loc;
        document.getElementById('pred-date').value = getNextWeekday(dayOffset);
        document.getElementById('pred-time').value = btn.dataset.time;
        document.getElementById('pred-weather').value = btn.dataset.wx;
    });
});

document.getElementById('prediction-form').addEventListener('submit', async e => {
    e.preventDefault();
    const road     = document.getElementById('pred-road').value;
    const location = document.getElementById('pred-location').value;
    const date     = document.getElementById('pred-date').value;
    const time     = document.getElementById('pred-time').value;
    const weather  = document.getElementById('pred-weather').value;

    if (!road || !location || !date || !time) {
        showToast('Please fill in all fields');
        return;
    }

    setLoading('predict-btn', 'predict-loader', true);

    try {
        const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ road, location, date, time, weather })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Prediction failed'); }

        const data = await res.json();
        lastPrediction = data;

        showPredictionResult(data);
    } catch (err) {
        showToast(err.message);
    } finally {
        setLoading('predict-btn', 'predict-loader', false);
    }
});

function showPredictionResult(data) {
    const risk = parseFloat(data.risk_score);
    const pct  = parseFloat(data.risk_percentage);
    const level = data.risk_level;

    // Hide placeholder, show result
    document.getElementById('pred-placeholder').classList.add('hidden');
    const resultCard = document.getElementById('pred-result');
    resultCard.classList.remove('hidden');

    // Road tag
    document.getElementById('res-road-tag').textContent = data.road;

    // Animate gauge
    animateGauge(risk, level);

    // Risk badge
    const badge = document.getElementById('risk-level-badge');
    badge.className = 'risk-level-badge ' + level.toLowerCase();
    document.getElementById('rlb-text').textContent = level;
    badge.querySelector('.rlb-dot').style.background = level === 'High' ? '#ff4757' : level === 'Medium' ? '#ffa502' : '#2ed573';

    // Details
    document.getElementById('res-location').textContent  = data.location;
    document.getElementById('res-datetime').textContent  = `${data.datetime}`;
    const wxMap = { clear:'☀️ Clear', rain:'🌧️ Rain', fog:'🌫️ Fog/Haze', harmattan:'💨 Harmattan', wind:'🌬️ Windy' };
    document.getElementById('res-weather').textContent   = wxMap[data.weather] || data.weather;

    // Prep XAI tab
    prepareXAI(data);
}

// ─── GAUGE ANIMATION ──────────────────────────────
function animateGauge(risk, level) {
    const fill    = document.getElementById('gauge-fill');
    const numEl   = document.getElementById('gauge-num');
    const target  = Math.round(risk * 100);
    const arcLen  = 408; // stroke-dasharray for the path

    // Set gradient based on risk
    const gradId = level === 'High' ? 'gauge-grad-high' :
                   level === 'Medium' ? 'gauge-grad-med' : 'gauge-grad-low';
    fill.setAttribute('stroke', `url(#${gradId})`);

    const targetOffset = arcLen - (risk * arcLen);
    let frame = 0, total = 70;
    let currentNum = 0;

    const anim = () => {
        if (frame <= total) {
            const t = frame / total;
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            fill.style.strokeDashoffset = arcLen - (risk * arcLen * ease);
            numEl.textContent = Math.round(risk * 100 * ease) + '%';
            frame++;
            requestAnimationFrame(anim);
        } else {
            fill.style.strokeDashoffset = targetOffset;
            numEl.textContent = target + '%';
        }
    };
    requestAnimationFrame(anim);
}

// ─── XAI PREPARATION ──────────────────────────────
function prepareXAI(data) {
    const factors = data.factors;
    const entries = Object.entries(factors).sort((a, b) => b[1] - a[1]);

    // Render bars
    const barsEl = document.getElementById('xai-bars');
    barsEl.innerHTML = entries.map(([name, pct], i) => {
        const color = XAI_COLORS[i % XAI_COLORS.length];
        return `
        <div class="xai-bar-item">
            <div class="xai-bar-header">
                <span class="xai-bar-name">${name}</span>
                <span class="xai-bar-pct" style="color:${color}">${pct}%</span>
            </div>
            <div class="xai-bar-track">
                <div class="xai-bar-fill" style="width:0%; background:${color}" data-target="${pct}"></div>
            </div>
        </div>`;
    }).join('');

    // Banner
    document.getElementById('xai-road-name').textContent = data.road;
    const chip = document.getElementById('xai-risk-chip');
    chip.textContent = data.risk_level + ' Risk';
    chip.className = 'xai-risk-chip ' + data.risk_level.toLowerCase();
    document.getElementById('xai-score').textContent = data.risk_percentage + '%';

    // Natural language
    const top1 = entries[0];
    const top2 = entries[1];
    const top3 = entries[2];
    const level = data.risk_level;
    const color = level === 'High' ? '#ff4757' : level === 'Medium' ? '#ffa502' : '#2ed573';

    document.getElementById('xai-nl').innerHTML = `
        The AI model assessed a <strong style="color:${color}">${data.risk_percentage}% (${level})</strong> accident probability
        for <em>${data.road}</em> at the specified date and time.
        <br><br>
        The dominant risk driver is <strong>${top1[0]}</strong> (${top1[1]}%), followed by
        <strong>${top2[0]}</strong> (${top2[1]}%) and <strong>${top3[0]}</strong> (${top3[1]}%).
        ${level === 'High' ? ' Conditions on this route are critically dangerous at this time — travel is strongly discouraged.' :
          level === 'Medium' ? ' Moderate caution is advised. Drive defensively and reduce speed.' :
          ' Conditions appear relatively safe. Standard road precautions apply.'}
    `;

    // Recommendations
    const recs = getRecommendations(data);
    document.getElementById('xai-rec-list').innerHTML = recs.map(r => `<li>${r}</li>`).join('');

    // Destroy old XAI chart before creating new one
    if (xaiChart) { xaiChart.destroy(); xaiChart = null; }

    // Show content, hide empty
    document.getElementById('xai-empty').classList.add('hidden');
    document.getElementById('xai-content').classList.remove('hidden');

    // If on XAI tab, animate bars immediately; else animate when tab is opened
    animateXAIBars();
}

function animateXAIBars() {
    setTimeout(() => {
        document.querySelectorAll('.xai-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.target + '%';
        });
        renderXAIChart();
    }, 100);
}

function renderXAIChart() {
    const ctx = document.getElementById('chart-xai');
    if (!ctx) return;

    const bars = document.querySelectorAll('.xai-bar-item');
    const labels = [], data = [], colors = [];

    bars.forEach((bar, i) => {
        const name = bar.querySelector('.xai-bar-name').textContent;
        const pct  = parseFloat(bar.querySelector('.xai-bar-pct').textContent);
        labels.push(name);
        data.push(pct);
        colors.push(XAI_COLORS[i % XAI_COLORS.length]);
    });

    if (xaiChart) xaiChart.destroy();
    xaiChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Contribution %',
                data,
                backgroundColor: colors.map(c => c + 'cc'),
                borderColor: colors,
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            ...chartDefaults,
            plugins: { ...chartDefaults.plugins, legend: { display: false } }
        }
    });
}

function getRecommendations(data) {
    const factors = data.factors;
    const recs = [];
    const level = data.risk_level;

    if (factors['Traffic Density'] > 25) {
        recs.push('Avoid peak travel hours (7–9AM and 5–8PM) on this route.');
    }
    if (factors['Weather Conditions'] > 18) {
        recs.push('Check weather forecasts before travel; reduce speed by 30% in rain or harmattan haze.');
    }
    if (factors['Road Condition'] > 20) {
        recs.push('Drive with extra caution — this road has significant surface irregularities and curvature.');
    }
    if (factors['Time & Lighting'] > 22) {
        recs.push('Use headlights early and avoid travel between 10PM–5AM on this road.');
    }
    if (factors['Accident History'] > 20) {
        recs.push('This route has a documented high accident history — consider alternative roads if available.');
    }
    if (level === 'High') {
        recs.push('Ensure your vehicle is roadworthy (tyres, brakes, lights) before attempting this journey.');
        recs.push('Travel with others or inform someone of your travel plan. Carry emergency contacts.');
    } else if (level === 'Medium') {
        recs.push('Maintain safe following distance and be prepared for sudden stops.');
    }
    return recs.slice(0, 5);
}

// View XAI from prediction tab
document.getElementById('view-xai-btn').addEventListener('click', () => {
    switchToTab('xai');
    setTimeout(animateXAIBars, 300);
});

// ─── MODEL INFO ───────────────────────────────────
async function loadModelInfo() {
    try {
        const res = await fetch('/api/model_info');
        if (!res.ok) throw new Error('Failed to load model info');
        const d = await res.json();

        // Update banner
        const dot = document.getElementById('mb-dot');
        const title = document.getElementById('mb-title');
        if (d.model_loaded) {
            dot.classList.remove('offline');
            title.textContent = '✓ Model Loaded — Ready for Inference';
        } else {
            dot.classList.add('offline');
            title.textContent = '⚠ Model Not Loaded — Run: python ml/train_model.py';
        }
        document.getElementById('model-status-text').textContent = d.model_loaded ? 'Model Active' : 'Model Offline';

        // Feature importance chart
        const fi = d.feature_importances;
        const ctxFeat = document.getElementById('chart-features').getContext('2d');
        const featColors = fi.map((_, i) => {
            const palette = ['#4f8ef7','#ff4757','#ffa502','#2ed573','#a55eea','#18dcff','#4f8ef7','#ff6b35','#ffa502','#2ed573'];
            return palette[i % palette.length];
        });
        chartFeatures = new Chart(ctxFeat, {
            type: 'bar',
            data: {
                labels: fi.map(f => f.feature),
                datasets: [{
                    label: 'Importance %',
                    data: fi.map(f => f.importance),
                    backgroundColor: featColors.map(c => c + 'bb'),
                    borderColor: featColors,
                    borderWidth: 1.5,
                    borderRadius: 5
                }]
            },
            options: {
                ...chartDefaults,
                indexAxis: 'y',
                plugins: { ...chartDefaults.plugins, legend: { display: false } }
            }
        });

        modelInfoLoaded = true;
    } catch (err) {
        showToast('Could not load model info: ' + err.message);
    }
}

// ─── MODEL STATUS CHECK ──────────────────────────
async function checkStatus() {
    try {
        const res = await fetch('/api/status');
        const d = await res.json();
        if (!d.model_loaded) {
            document.getElementById('model-status-text').textContent = 'Model Offline';
            document.querySelector('.status-dot').style.background = '#ff4757';
            document.querySelector('.status-dot').style.boxShadow = '0 0 6px #ff4757';
        }
    } catch {}
}

// ─── INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    startClock();
    initThemeToggle();
    initMobileNav();
    initMap();
    initMapSearch();
    checkStatus();
});
