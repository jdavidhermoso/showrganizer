(function () {
    'use strict';

    var L = window.LANG || {};

    let allJokes = [];

    // ── DOM refs ──────────────────────────────────────────────
    const list          = document.getElementById('chistes-list');
    const countEl       = document.getElementById('chistes-count');
    const tpl           = document.getElementById('chiste-card-tpl');
    const fText         = document.getElementById('filter-text');
    const searchClear   = document.getElementById('ch-search-clear');
    const filterBtn     = document.getElementById('ch-filter-btn');
    const filterBadge   = document.getElementById('ch-filter-badge');
    const pillsRow      = document.getElementById('ch-pills-row');
    const sheet         = document.getElementById('ch-sheet');
    const sheetOverlay  = document.getElementById('ch-sheet-overlay');
    const sheetClear    = document.getElementById('ch-sheet-clear');
    const sheetApply    = document.getElementById('ch-sheet-apply');
    const sheetCount    = document.getElementById('ch-sheet-count');

    // ── Filter state ──────────────────────────────────────────
    const DEFAULTS = { estado: '', cat: '', punt: '', sort: 'reciente' };
    let filters = { ...DEFAULTS };

    // pill display labels per key/value
    function pillLabel(key, val) {
        const chips = document.querySelectorAll(`[data-key="${key}"][data-val="${val}"]`);
        return chips.length ? chips[0].textContent.trim() : val;
    }

    // ── Data loading ──────────────────────────────────────────
    async function load() {
        list.innerHTML = '<p style="color:var(--text-muted);padding:1rem">' + (L.loading || 'Loading...') + '</p>';
        try {
            const res  = await fetch(BASE_URL + '/api/chistes.php');
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (_) {
                list.innerHTML = '<p style="color:var(--danger)">' + (L.server_error || 'Server error') + ':<br><pre style="font-size:0.75rem;overflow:auto;max-height:200px">' + text.replace(/</g, '&lt;') + '</pre></p>';
                return;
            }
            if (!res.ok) {
                list.innerHTML = '<p style="color:var(--danger)">Error ' + res.status + ': ' + escHtml(data.error || 'unknown') + '</p>';
                return;
            }
            allJokes = Array.isArray(data) ? data : [];
            applyFilters();
        } catch (e) {
            list.innerHTML = '<p style="color:var(--danger)">' + (L.network_error || 'Network error') + ': ' + escHtml(e.message) + '</p>';
        }
    }

    // ── Render ────────────────────────────────────────────────
    function renderList(jokes) {
        list.innerHTML = '';
        if (jokes.length === 0) {
            countEl.textContent = '';
            list.innerHTML = '<p class="empty-state">' + (L.no_jokes_filter || 'No jokes.') + '</p>';
            return;
        }
        countEl.textContent = jokes.length === 1
            ? (L.joke_count_single || '1 joke')
            : (L.joke_count_plural || '%d jokes').replace('%d', jokes.length);
        const frag = document.createDocumentFragment();
        jokes.forEach(j => frag.appendChild(makeCard(j)));
        list.appendChild(frag);
    }

    function makeCard(j) {
        const node = tpl.content.cloneNode(true);
        const card = node.querySelector('.chiste-card');
        card.dataset.id    = j.id;
        card.dataset.estado = j.estado;

        node.querySelector('.chiste-categoria').textContent = j.categoria || '—';
        node.querySelector('.chiste-stars').innerHTML = starsHtml(j.puntuacion) + (j.duracion ? ' <span class="chiste-dur">' + durStr(j.duracion) + '</span>' : '');
        node.querySelector('.chiste-texto').innerHTML = parseBold(j.texto);

        const tagsEl = node.querySelector('.chiste-tags');
        (j.tags || []).forEach(t => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = t;
            tagsEl.appendChild(span);
        });

        const estadoEl = node.querySelector('.estado');
        estadoEl.className = 'estado estado-' + j.estado;
        estadoEl.textContent = estadoLabel(j.estado);

        const editLink = node.querySelector('a.btn');
        editLink.href = BASE_URL + '/chiste_form.php?id=' + j.id;

        const shareBtn = node.querySelector('.share-btn');
        shareBtn.addEventListener('click', () => shareJoke(j.texto));

        return node;
    }

    // ── Filter logic ──────────────────────────────────────────
    function getFiltered() {
        const q = fText.value.trim().toLowerCase();

        let result = allJokes.filter(j => {
            if (q) {
                const haystack = (j.texto || '').replace(/\*\*/g, '').replace(/\[PAUSA\]/g, '').toLowerCase();
                const inText  = haystack.includes(q);
                const inCat   = (j.categoria || '').toLowerCase().includes(q);
                const inTags  = (j.tags || []).some(t => t.toLowerCase().includes(q));
                if (!inText && !inCat && !inTags) return false;
            }
            if (filters.estado && j.estado !== filters.estado) return false;
            if (filters.cat && (j.categoria || '') !== filters.cat) return false;
            if (filters.punt !== '') {
                const min = parseInt(filters.punt, 10);
                if (j.puntuacion == null || j.puntuacion < min) return false;
            }
            return true;
        });

        result.sort((a, b) => {
            switch (filters.sort) {
                case 'antiguos':        return (a.fecha_creacion || '') > (b.fecha_creacion || '') ? 1 : -1;
                case 'puntuacion-desc': return (b.puntuacion ?? -1) - (a.puntuacion ?? -1);
                case 'duracion-asc':    return (a.duracion ?? 99999) - (b.duracion ?? 99999);
                default:                return (a.fecha_creacion || '') < (b.fecha_creacion || '') ? 1 : -1;
            }
        });

        return result;
    }

    function applyFilters() {
        const result = getFiltered();
        renderList(result);
        updateUI();
    }

    // ── UI state sync ─────────────────────────────────────────
    function updateUI() {
        // search clear button
        searchClear.style.display = fText.value ? '' : 'none';

        // active filter count (exclude sort from badge since it always has a value)
        const activeCount = ['estado', 'cat', 'punt'].filter(k => filters[k] !== DEFAULTS[k]).length;

        filterBadge.textContent = activeCount;
        filterBadge.style.display = activeCount > 0 ? '' : 'none';
        filterBtn.classList.toggle('ch-filter-btn--active', activeCount > 0);

        // pills
        renderPills(activeCount);

        // chips highlight
        document.querySelectorAll('.ch-chip').forEach(chip => {
            const key = chip.dataset.key;
            const val = chip.dataset.val;
            chip.classList.toggle('ch-chip--active', filters[key] === val);
        });

        // sheet results count
        sheetCount.textContent = getFiltered().length;
    }

    function renderPills(activeCount) {
        if (activeCount === 0) {
            pillsRow.style.display = 'none';
            pillsRow.innerHTML = '';
            return;
        }
        pillsRow.style.display = '';
        const items = ['estado', 'cat', 'punt']
            .filter(k => filters[k] !== DEFAULTS[k])
            .map(k => {
                const label = pillLabel(k, filters[k]);
                const pill = document.createElement('span');
                pill.className = 'ch-pill';
                pill.innerHTML = escHtml(label) + '<button class="ch-pill-remove" aria-label="Quitar filtro">×</button>';
                pill.querySelector('.ch-pill-remove').addEventListener('click', () => {
                    filters[k] = DEFAULTS[k];
                    applyFilters();
                });
                return pill;
            });

        pillsRow.innerHTML = '';
        items.forEach(el => pillsRow.appendChild(el));

        const clearBtn = document.createElement('button');
        clearBtn.className = 'ch-pills-clear';
        clearBtn.textContent = L.filter_clear || 'Limpiar';
        clearBtn.addEventListener('click', clearFilters);
        pillsRow.appendChild(clearBtn);
    }

    function clearFilters() {
        filters = { ...DEFAULTS };
        applyFilters();
    }

    // ── Search input ──────────────────────────────────────────
    fText.addEventListener('input', () => {
        searchClear.style.display = fText.value ? '' : 'none';
        applyFilters();
    });
    searchClear.addEventListener('click', () => {
        fText.value = '';
        searchClear.style.display = 'none';
        applyFilters();
    });

    // ── Bottom sheet ──────────────────────────────────────────
    function openSheet() {
        sheet.classList.add('ch-sheet--open');
        sheetOverlay.classList.add('ch-sheet-overlay--open');
        sheet.setAttribute('aria-hidden', 'false');
        document.body.classList.add('ch-sheet-body-lock');
        updateUI();
    }

    function closeSheet() {
        sheet.classList.remove('ch-sheet--open');
        sheetOverlay.classList.remove('ch-sheet-overlay--open');
        sheet.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('ch-sheet-body-lock');
    }

    filterBtn.addEventListener('click', openSheet);
    sheetOverlay.addEventListener('click', closeSheet);
    sheetApply.addEventListener('click', () => { applyFilters(); closeSheet(); });
    sheetClear.addEventListener('click', () => { clearFilters(); });

    // chip clicks
    document.querySelectorAll('.ch-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            filters[chip.dataset.key] = chip.dataset.val;
            updateUI();
        });
    });

    // ── Helpers ───────────────────────────────────────────────
    function shareJoke(texto) {
        if (navigator.share) {
            navigator.share({ text: texto }).catch(() => {});
        } else {
            window.open('https://www.threads.net/intent/post?text=' + encodeURIComponent(texto), '_blank');
        }
    }

    function parseBold(text) {
        return escHtml(text)
            .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
            .replace(/\n?\[PAUSA\]\n?/g, '<span class="pausa-tag">— PAUSA —</span>');
    }

    function starsHtml(n) {
        if (n == null) return '<span class="stars empty">—</span>';
        let s = '<span class="stars">';
        for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
        return s + '</span>';
    }

    function durStr(sec) {
        if (!sec) return '';
        const m = Math.floor(sec / 60), s = sec % 60;
        return m + 'min' + (s ? s + 's' : '');
    }

    function estadoLabel(e) {
        const map = {
            borrador:   L.status_draft    || 'Draft',
            desarrollo: L.status_dev      || 'In development',
            probado:    L.status_tested   || 'Tested',
            rotacion:   L.status_rotation || 'In rotation',
            retirado:   L.status_retired  || 'Retired',
        };
        return map[e] || e;
    }

    function escHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Estimate durations ────────────────────────────────────
    const estimateAllBtn    = document.getElementById('estimate-all-btn');
    const estimateAllStatus = document.getElementById('estimate-all-status');

    if (estimateAllBtn) {
        estimateAllBtn.addEventListener('click', async () => {
            const toEstimate = allJokes.filter(j => !j.duracion);
            if (!toEstimate.length) {
                estimateAllStatus.textContent = L.estimate_none || 'All jokes already have a duration';
                setTimeout(() => { estimateAllStatus.textContent = ''; }, 3000);
                return;
            }

            const originalLabel = estimateAllBtn.textContent;
            estimateAllBtn.disabled = true;
            const total = toEstimate.length;
            let done = 0;

            function setStatus(text) {
                estimateAllStatus.textContent = text;
                estimateAllBtn.textContent    = text;
            }

            for (const joke of toEstimate) {
                setStatus((L.estimating_n || 'Estimating %d of %d...')
                    .replace('%d', done + 1).replace('%d', total));
                await new Promise(r => setTimeout(r, 0));

                const rawText = joke.texto.replace(/\*\*/g, '').trim();
                const words   = rawText.split(/\s+/).filter(Boolean).length;
                const minutes = words > 0 ? words / 120 : 0.5;
                const rounded = Math.round(minutes * 2) / 2;
                const durSec  = Math.round((rounded > 0 ? rounded : 0.5) * 60);

                await fetch(BASE_URL + '/api/chistes.php?id=' + joke.id, {
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        texto:      joke.texto,
                        categoria:  joke.categoria  || '',
                        estado:     joke.estado     || 'borrador',
                        puntuacion: joke.puntuacion ?? null,
                        tags:       joke.tags       || [],
                        duracion:   durSec,
                        callbacks:  joke.callbacks  || [],
                    }),
                });
                done++;
            }

            estimateAllStatus.textContent = (L.estimate_done_n || '%d jokes updated').replace('%d', done);
            estimateAllBtn.textContent    = originalLabel;
            estimateAllBtn.disabled       = false;
            setTimeout(() => { estimateAllStatus.textContent = ''; }, 4000);
            await load();
        });
    }

    load();
}());
