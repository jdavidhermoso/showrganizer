(function () {
    'use strict';

    var L = window.LANG || {};

    // ── Bold toolbar ──────────────────────────────────────────
    var boldBtn = document.getElementById('bold-btn');
    var textoTA = document.getElementById('texto');

    function applyBold() {
        var start    = textoTA.selectionStart;
        var end      = textoTA.selectionEnd;
        if (start === end) return;
        var before   = textoTA.value.substring(0, start);
        var selected = textoTA.value.substring(start, end);
        var after    = textoTA.value.substring(end);
        if (selected.startsWith('**') && selected.endsWith('**') && selected.length > 4) {
            var inner = selected.slice(2, -2);
            textoTA.value = before + inner + after;
            textoTA.setSelectionRange(start, start + inner.length);
        } else {
            textoTA.value = before + '**' + selected + '**' + after;
            textoTA.setSelectionRange(start, end + 4);
        }
        textoTA.focus();
    }

    if (boldBtn) boldBtn.addEventListener('click', applyBold);
    textoTA.addEventListener('keydown', function (e) {
        if (e.key === 'b' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); applyBold(); }
    });
    // ─────────────────────────────────────────────────────────

    const starsInput = document.getElementById('stars-input');
    const punInput   = document.getElementById('puntuacion');
    const starBtns   = starsInput.querySelectorAll('.star-btn');
    let currentVal   = parseInt(starsInput.dataset.value) || 0;

    function renderStars(val) {
        starBtns.forEach((btn, i) => {
            btn.classList.toggle('active', i < val);
        });
        punInput.value = val > 0 ? val : '';
    }

    starBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => {
            currentVal = i + 1;
            renderStars(currentVal);
        });
        btn.addEventListener('mouseover', () => renderStars(i + 1));
        btn.addEventListener('mouseout',  () => renderStars(currentVal));
    });

    starsInput.querySelector('.star-clear').addEventListener('click', () => {
        currentVal = 0;
        renderStars(0);
    });

    renderStars(currentVal);

    const tagsField  = document.getElementById('tags-field');
    const tagsHidden = document.getElementById('tags-hidden');
    const tagsInput  = document.getElementById('tags-input');
    let tags = tagsHidden.value ? tagsHidden.value.split(',').map(t => t.trim()).filter(Boolean) : [];

    function renderTagChips() {
        tagsField.querySelectorAll('.tag-chip').forEach(c => c.remove());

        tags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = escHtml(tag) + '<button type="button" class="tag-remove" data-tag="' + escHtml(tag) + '">×</button>';
            chip.querySelector('.tag-remove').addEventListener('click', () => {
                tags = tags.filter(t => t !== tag);
                updateTagsHidden();
                renderTagChips();
            });
            tagsField.insertBefore(chip, tagsInput);
        });
        updateTagsHidden();
    }

    function updateTagsHidden() {
        tagsHidden.value = tags.join(',');
    }

    tagsInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = tagsInput.value.trim().replace(/,/g, '');
            if (val && !tags.includes(val)) {
                tags.push(val);
                renderTagChips();
            }
            tagsInput.value = '';
        } else if (e.key === 'Backspace' && tagsInput.value === '' && tags.length) {
            tags.pop();
            renderTagChips();
        }
    });

    tagsField.addEventListener('click', () => tagsInput.focus());

    renderTagChips();

    const callbacksField  = document.getElementById('callbacks-field');
    const callbacksHidden = document.getElementById('callbacks-hidden');
    const callbacksChips  = document.getElementById('callbacks-chips');
    const callbacksSearch = document.getElementById('callbacks-search');
    const callbacksSugg   = document.getElementById('callbacks-suggestions');

    let allJokesCache = null;
    let callbackIds   = [];

    try { callbackIds = JSON.parse(callbacksHidden?.value || '[]'); } catch(_) {}

    async function loadAllJokes() {
        if (allJokesCache) return allJokesCache;
        try {
            const res = await fetch(BASE_URL + '/api/chistes.php');
            allJokesCache = await res.json();
        } catch(_) { allJokesCache = []; }
        return allJokesCache;
    }

    async function renderCallbackChips() {
        if (!callbacksChips) return;
        callbacksChips.innerHTML = '';
        if (!callbackIds.length) return;
        const jokes = await loadAllJokes();
        callbackIds.forEach(cid => {
            const joke = jokes.find(j => j.id === cid);
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            const label = joke ? joke.texto.slice(0, 40) + (joke.texto.length > 40 ? '…' : '') : cid;
            chip.innerHTML = escHtml(label) + '<button type="button" class="tag-remove">×</button>';
            chip.querySelector('.tag-remove').addEventListener('click', () => {
                callbackIds = callbackIds.filter(i => i !== cid);
                updateCallbacksHidden();
                renderCallbackChips();
            });
            callbacksChips.appendChild(chip);
        });
    }

    function updateCallbacksHidden() {
        if (callbacksHidden) callbacksHidden.value = JSON.stringify(callbackIds);
    }

    if (callbacksSearch) {
        callbacksSearch.addEventListener('input', async () => {
            const q = callbacksSearch.value.trim().toLowerCase();
            callbacksSugg.innerHTML = '';
            if (!q) { callbacksSugg.style.display = 'none'; return; }
            const jokes = await loadAllJokes();
            const currentId = document.getElementById('chiste-form')?.dataset.id || '';
            const matches = jokes.filter(j =>
                j.id !== currentId &&
                !callbackIds.includes(j.id) &&
                j.texto.toLowerCase().includes(q)
            ).slice(0, 6);
            if (!matches.length) { callbacksSugg.style.display = 'none'; return; }
            matches.forEach(j => {
                const li = document.createElement('li');
                li.textContent = j.texto.slice(0, 60) + (j.texto.length > 60 ? '…' : '');
                li.addEventListener('mousedown', e => {
                    e.preventDefault();
                    callbackIds.push(j.id);
                    updateCallbacksHidden();
                    renderCallbackChips();
                    callbacksSearch.value = '';
                    callbacksSugg.style.display = 'none';
                });
                callbacksSugg.appendChild(li);
            });
            callbacksSugg.style.display = 'block';
        });
        callbacksSearch.addEventListener('blur', () => {
            setTimeout(() => { callbacksSugg.style.display = 'none'; }, 150);
        });
    }

    renderCallbackChips();

    const historialContent = document.getElementById('historial-content');
    if (historialContent && CHISTE_ID) {
        (async () => {
            try {
                const res  = await fetch(BASE_URL + '/api/shows.php?action=historial&id=' + encodeURIComponent(CHISTE_ID));
                const data = await res.json();
                if (!data.length) {
                    historialContent.innerHTML = '<p class="text-muted">' + (L.not_in_shows || 'Not in any show yet.') + '</p>';
                    return;
                }
                const rows = data.map(s => {
                    const stars = s.estrellas_reales != null ? '★'.repeat(s.estrellas_reales) + '☆'.repeat(5 - s.estrellas_reales) : '—';
                    const meta  = [s.fecha_show, s.sala, s.ciudad].filter(Boolean).join(' · ');
                    return '<tr>' +
                        '<td><a href="' + BASE_URL + '/show_editor.php?id=' + escHtml(s.id) + '">' + escHtml(s.titulo) + '</a></td>' +
                        '<td>' + escHtml(meta || '—') + '</td>' +
                        '<td class="stars">' + stars + '</td>' +
                        '<td>' + escHtml(s.notas || '') + '</td>' +
                    '</tr>';
                }).join('');
                const colShow     = L.col_show      || 'Show';
                const colDateVenue= L.col_date_venue || 'Date / Venue';
                const colReal     = L.col_real       || 'Actual';
                const colNotes    = L.col_notes      || 'Notes';
                historialContent.innerHTML = '<table class="historial-table"><thead><tr><th>' + colShow + '</th><th>' + colDateVenue + '</th><th>' + colReal + '</th><th>' + colNotes + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
            } catch(_) {
                historialContent.innerHTML = '<p class="text-muted">' + (L.history_error || 'Error loading history.') + '</p>';
            }
        })();
    }

    const form     = document.getElementById('chiste-form');
    const statusEl = document.getElementById('form-status');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const durMin = parseFloat(document.getElementById('duracion')?.value || '');
        const data = {
            texto:      document.getElementById('texto').value,
            categoria:  document.getElementById('categoria').value || '',
            estado:     document.getElementById('estado').value,
            puntuacion: punInput.value ? parseInt(punInput.value) : null,
            tags:       tags,
            duracion:   !isNaN(durMin) && durMin >= 0 ? Math.round(durMin * 60) : null,
            callbacks:  getCallbackIds(),
        };

        const id     = form.dataset.id || '';
        const url    = BASE_URL + '/api/chistes.php' + (id ? '?id=' + id : '');
        const method = id ? 'PUT' : 'POST';

        statusEl.className = 'form-status';
        statusEl.textContent = L.form_saving || 'Saving...';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Error');

            if (!id && json.id) {
                window.location.href = BASE_URL + '/chiste_form.php?id=' + json.id;
                return;
            }
            statusEl.className   = 'form-status ok';
            statusEl.textContent = L.form_saved || '✓ Saved';
            setTimeout(() => { statusEl.textContent = ''; }, 2500);
        } catch (err) {
            statusEl.className   = 'form-status err';
            statusEl.textContent = err.message || (L.form_error || 'Error saving');
        }
    });

    const delBtn = document.getElementById('delete-btn');
    if (delBtn) {
        delBtn.addEventListener('click', async () => {
            if (!confirm(L.confirm_delete_joke || 'Delete this joke?')) return;
            const id  = form.dataset.id || '';
            const res = await fetch(BASE_URL + '/api/chistes.php?id=' + id, { method: 'DELETE' });
            if (res.ok) window.location.href = BASE_URL + '/chistes.php';
        });
    }

    function getCallbackIds() {
        const el = document.getElementById('callbacks-hidden');
        if (!el || !el.value) return [];
        try { return JSON.parse(el.value); } catch (_) { return []; }
    }

    function escHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}());
