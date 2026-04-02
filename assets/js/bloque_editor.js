(function () {
    'use strict';

    var L = window.LANG || {};

    var jokeIds     = INITIAL_CHISTES.slice();
    var allJokes    = [];
    var saveTimer   = null;

    var titleInput  = document.getElementById('titulo-input');
    var descInput   = document.getElementById('desc-input');
    var jokeSearch  = document.getElementById('joke-search');
    var suggList    = document.getElementById('joke-suggestions');
    var jokesList   = document.getElementById('bloque-jokes-list');
    var emptyHint   = document.getElementById('bloque-empty-hint');
    var jokeCount   = document.getElementById('joke-count');
    var bloqueTotalDur = document.getElementById('bloque-total-dur');
    var saveStatus  = document.getElementById('save-status');
    var titleDisplay= document.getElementById('bloque-titulo-display');

    // ── Load all jokes ────────────────────────────────────────
    fetch(BASE_URL + '/api/chistes.php')
        .then(r => r.json())
        .then(data => {
            allJokes = Array.isArray(data) ? data : [];
            renderList();
        });

    // ── Render the joke list ──────────────────────────────────
    function renderList() {
        jokesList.querySelectorAll('.bloque-joke-row').forEach(el => el.remove());
        emptyHint.style.display = jokeIds.length === 0 ? 'list-item' : 'none';
        jokeCount.textContent = jokeIds.length
            ? '(' + jokeIds.length + ')'
            : '';

        // Compute total duration
        let totalSec = 0;
        jokeIds.forEach(id => {
            const joke = allJokes.find(j => j.id === id);
            if (joke && joke.duracion) totalSec += joke.duracion;
        });
        if (bloqueTotalDur) bloqueTotalDur.innerHTML = totalSec ? '· <strong>' + durStr(totalSec) + '</strong>' : '';

        jokeIds.forEach((id, idx) => {
            const joke = allJokes.find(j => j.id === id);
            const li   = document.createElement('li');
            li.className   = 'bloque-joke-row';
            li.draggable   = true;
            li.dataset.id  = id;
            li.dataset.idx = idx;

            const text = joke
                ? parseBold(joke.texto.length > 100 ? joke.texto.slice(0, 100) + '…' : joke.texto)
                : escHtml(id);
            const cat  = joke ? escHtml(joke.categoria || '—') : '';
            const stars = joke ? starsHtml(joke.puntuacion) : '';
            const dur  = joke && joke.duracion ? ' <strong class="chiste-dur">' + durStr(joke.duracion) + '</strong>' : '';

            li.innerHTML =
                '<span class="bloque-drag-handle" title="' + (L.drag_reorder || 'Drag to reorder') + '">⠿</span>' +
                '<span class="bloque-joke-text">' + text + '</span>' +
                '<span class="bloque-joke-meta">' + cat + (stars ? ' ' + stars : '') + dur + '</span>' +
                '<button class="bloque-remove-btn" data-id="' + escHtml(id) + '" title="' + (L.remove || 'Remove') + '">×</button>';

            li.querySelector('.bloque-remove-btn').addEventListener('click', () => removeJoke(id));

            // Drag-to-reorder
            li.addEventListener('dragstart', onDragStart);
            li.addEventListener('dragover',  onDragOver);
            li.addEventListener('drop',      onDrop);
            li.addEventListener('dragend',   onDragEnd);

            jokesList.insertBefore(li, emptyHint);
        });
    }

    function removeJoke(id) {
        jokeIds = jokeIds.filter(i => i !== id);
        renderList();
        scheduleSave();
    }

    // ── Drag-and-drop reorder ─────────────────────────────────
    var dragSrcIdx = null;

    function onDragStart(e) {
        dragSrcIdx = parseInt(this.dataset.idx);
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }
    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        jokesList.querySelectorAll('.bloque-joke-row').forEach(r => r.classList.remove('drag-over'));
        this.classList.add('drag-over');
    }
    function onDrop(e) {
        e.preventDefault();
        const targetIdx = parseInt(this.dataset.idx);
        if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
        const moved = jokeIds.splice(dragSrcIdx, 1)[0];
        jokeIds.splice(targetIdx, 0, moved);
        renderList();
        scheduleSave();
    }
    function onDragEnd() {
        jokesList.querySelectorAll('.bloque-joke-row').forEach(r => {
            r.classList.remove('dragging', 'drag-over');
        });
        dragSrcIdx = null;
    }

    // ── Joke search & add ─────────────────────────────────────
    jokeSearch.addEventListener('input', () => {
        const q = jokeSearch.value.trim().toLowerCase();
        suggList.innerHTML = '';
        if (!q) { suggList.style.display = 'none'; return; }
        const matches = allJokes.filter(j =>
            !jokeIds.includes(j.id) &&
            j.texto.replace(/\*\*/g, '').replace(/\[PAUSA\]/g, '').toLowerCase().includes(q)
        ).slice(0, 6);
        if (!matches.length) { suggList.style.display = 'none'; return; }
        matches.forEach(j => {
            const li = document.createElement('li');
            li.textContent = j.texto.replace(/\*\*/g, '').slice(0, 70) + (j.texto.length > 70 ? '…' : '');
            li.addEventListener('mousedown', e => {
                e.preventDefault();
                jokeIds.push(j.id);
                jokeSearch.value = '';
                suggList.style.display = 'none';
                renderList();
                scheduleSave();
            });
            suggList.appendChild(li);
        });
        suggList.style.display = 'block';
    });
    jokeSearch.addEventListener('blur', () => {
        setTimeout(() => { suggList.style.display = 'none'; }, 150);
    });

    // ── Title & desc auto-save ────────────────────────────────
    titleInput.addEventListener('input', () => {
        titleDisplay.textContent = titleInput.value || '…';
        scheduleSave();
    });
    descInput.addEventListener('input', scheduleSave);

    // ── Save ──────────────────────────────────────────────────
    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 900);
    }

    async function save() {
        saveStatus.className   = 'form-status';
        saveStatus.textContent = L.form_saving || 'Saving...';
        try {
            const res = await fetch(BASE_URL + '/api/bloques.php?id=' + encodeURIComponent(BLOQUE_ID), {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titulo:      titleInput.value.trim() || 'Bloque sin título',
                    descripcion: descInput.value.trim(),
                    chistes:     jokeIds,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error');
            saveStatus.className   = 'form-status ok';
            saveStatus.textContent = L.form_saved || '✓ Saved';
            setTimeout(() => { saveStatus.textContent = ''; }, 2500);
        } catch (err) {
            saveStatus.className   = 'form-status err';
            saveStatus.textContent = err.message;
        }
    }

    // ── Helpers ───────────────────────────────────────────────
    function durStr(sec) {
        if (!sec) return '';
        const m = Math.floor(sec / 60), s = sec % 60;
        return m + 'min' + (s ? s + 's' : '');
    }
    function parseBold(text) {
        return escHtml(text)
            .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
            .replace(/\n?\[PAUSA\]\n?/g, '<span class="pausa-tag">— PAUSA —</span>');
    }
    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function starsHtml(n) {
        if (n == null) return '';
        let s = '<span class="stars" style="font-size:0.8rem">';
        for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
        return s + '</span>';
    }
}());
