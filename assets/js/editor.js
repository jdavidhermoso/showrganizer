(function () {
    'use strict';

    var L = window.LANG || {};

    let blocks     = [];
    let allJokes   = [];
    let allBloques = [];
    let showId     = SHOW_ID;
    let saveTimer  = null;
    let chartInstance = null;
    let chartOpen  = false;
    let targetMinutes = 30;

    // ── DOM refs ──────────────────────────────────────────────
    const docBlocks    = document.getElementById('document-blocks');
    const docEmpty     = document.getElementById('doc-empty');
    const addFirstText = document.getElementById('add-first-text');
    const saveBtn      = document.getElementById('save-btn');
    const saveStatus   = document.getElementById('save-status');
    const titleInput   = document.getElementById('show-titulo');
    const sidebarList    = document.getElementById('sidebar-jokes-list');
    const sidebarSearch  = document.getElementById('sidebar-search');
    const sidebarEstado  = document.getElementById('sidebar-estado');
    const sidebarBloques = document.getElementById('sidebar-bloques-list');
    const panelBloques   = document.getElementById('sidebar-panel-bloques');

    const progressFill  = document.getElementById('se-progress-fill');
    const progressLabel = document.getElementById('se-progress-label');
    const subtitleBtn   = document.getElementById('se-subtitle-btn');
    const subtitleText  = document.getElementById('se-subtitle-text');

    // Meta inputs (hidden)
    const metaFecha   = document.getElementById('show-fecha');
    const metaSala    = document.getElementById('show-sala');
    const metaCiudad  = document.getElementById('show-ciudad');
    const metaDurObj  = document.getElementById('show-duracion-obj');

    // ── Touch sort ────────────────────────────────────────────
    function initTouchSort() {
        let drag = null;

        docBlocks.addEventListener('touchstart', e => {
            const handle = e.target.closest('.se-drag-handle');
            if (!handle) return;
            const row = handle.closest('[data-block-id]');
            if (!row) return;
            e.preventDefault();
            drag = {
                el: row,
                blockId: row.dataset.blockId,
                startY: e.touches[0].clientY,
                targetEl: null,
                targetAbove: false,
            };
            row.classList.add('se-dragging');
        }, { passive: false });

        document.addEventListener('touchmove', e => {
            if (!drag) return;
            e.preventDefault();
            const y = e.touches[0].clientY;
            drag.el.style.transform = 'translateY(' + (y - drag.startY) + 'px)';

            clearDropIndicators();
            drag.targetEl = null;
            const rows = docBlocks.querySelectorAll('[data-block-id]');
            for (const r of rows) {
                if (r === drag.el) continue;
                const rect = r.getBoundingClientRect();
                if (y >= rect.top && y <= rect.bottom) {
                    const above = y < rect.top + rect.height / 2;
                    drag.targetEl    = r;
                    drag.targetAbove = above;
                    r.classList.add(above ? 'drop-above' : 'drop-below');
                    break;
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (!drag) return;
            drag.el.style.transform = '';
            drag.el.classList.remove('se-dragging');
            clearDropIndicators();

            const { blockId, targetEl, targetAbove } = drag;
            drag = null;

            if (!targetEl) return;
            const fromIdx = blocks.findIndex(b => b.id === blockId);
            const toId    = targetEl.dataset.blockId;
            if (fromIdx === -1) return;
            const [moved] = blocks.splice(fromIdx, 1);
            const toIdx = blocks.findIndex(b => b.id === toId);
            if (toIdx === -1) { blocks.splice(fromIdx, 0, moved); return; }
            blocks.splice(targetAbove ? toIdx : toIdx + 1, 0, moved);
            renderDocument();
            scheduleSave();
        });
    }

    // ── Init ──────────────────────────────────────────────────
    async function init() {
        await Promise.all([loadJokes(), loadBloques()]);

        if (SHOW_META) {
            if (metaFecha)  metaFecha.value  = SHOW_META.fecha_show || '';
            if (metaSala)   metaSala.value   = SHOW_META.sala       || '';
            if (metaCiudad) metaCiudad.value = SHOW_META.ciudad     || '';
        }

        if (SHOW_DATA && SHOW_DATA.blocks) {
            if (SHOW_DATA.target_minutes) targetMinutes = SHOW_DATA.target_minutes;
            blocks = SHOW_DATA.blocks.map(b => {
                if (b.type === 'joke') {
                    b.jokeData = allJokes.find(j => j.id === b.joke_id) || null;
                    b.notas    = b.notas || '';
                }
                if (b.type === 'bloque') {
                    b.bloqueData = allBloques.find(bl => bl.id === b.bloque_id) || null;
                }
                return b;
            });
        }

        if (metaDurObj) metaDurObj.value = targetMinutes;

        renderDocument();
        renderSidebar(allJokes);
        renderBloquesSidebar();
        updateSubtitle();
        wireSheets();
        wireMenu();
        initTouchSort();
    }

    async function loadJokes() {
        try {
            const res = await fetch(BASE_URL + '/api/chistes.php');
            allJokes  = await res.json();
        } catch (e) {
            sidebarList.innerHTML = '<p class="sidebar-loading" style="color:var(--danger)">' + (L.error_load_jokes || 'Error loading jokes.') + '</p>';
        }
    }

    async function loadBloques() {
        try {
            const res  = await fetch(BASE_URL + '/api/bloques.php');
            allBloques = await res.json();
        } catch (e) {
            allBloques = [];
        }
    }

    // ── Subtitle ──────────────────────────────────────────────
    function updateSubtitle() {
        const sala   = metaSala   ? metaSala.value.trim()   : '';
        const ciudad = metaCiudad ? metaCiudad.value.trim() : '';
        const fecha  = metaFecha  ? metaFecha.value         : '';

        let parts = [];
        if (sala)   parts.push(sala);
        if (ciudad) parts.push(ciudad);
        if (fecha) {
            const d = new Date(fecha + 'T00:00:00');
            if (!isNaN(d)) {
                parts.push(d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }));
            }
        }
        if (subtitleText) subtitleText.textContent = parts.join(' · ') || '—';
    }

    // ── Progress bar ──────────────────────────────────────────
    function updateProgress() {
        const total  = getFlatJokeBlocks().reduce((sum, item) => sum + (item.jokeData.duracion || 0), 0);
        const target = targetMinutes * 60;
        const pct    = target > 0 ? Math.min(total / target * 100, 100) : 0;
        const over   = total > target;

        if (progressFill) {
            progressFill.style.width = pct + '%';
            progressFill.classList.toggle('se-progress-fill--over', over);
        }
        if (progressLabel) {
            const m = Math.floor(total / 60), s = total % 60;
            progressLabel.textContent = m + ':' + String(s).padStart(2, '0') + ' /' + targetMinutes + ' min';
            progressLabel.classList.toggle('se-progress-label--over', over);
        }
    }

    // ── Sidebar (joke picker) ─────────────────────────────────
    function renderSidebar(jokes) {
        sidebarList.innerHTML = '';
        if (jokes.length === 0) {
            sidebarList.innerHTML = '<p class="sidebar-no-results">' + (L.no_sidebar_results || 'No results.') + '</p>';
            return;
        }
        jokes.forEach(j => sidebarList.appendChild(makeSidebarCard(j)));
    }

    function makeSidebarCard(j) {
        const div = document.createElement('div');
        div.className = 'sidebar-joke-card';
        div.draggable = true;
        div.dataset.jokeId = j.id;

        div.innerHTML =
            '<div class="sidebar-joke-header">' +
                '<span class="sidebar-joke-cat">' + escHtml(j.categoria || '—') + '</span>' +
                '<span class="estado estado-' + j.estado + '">' + estadoLabel(j.estado) + '</span>' +
            '</div>' +
            '<div class="sidebar-joke-text">' + escHtml(j.texto) + '</div>';

        div.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/block-source', 'sidebar');
            e.dataTransfer.setData('text/joke-id', String(j.id));
            div.classList.add('dragging');
        });
        div.addEventListener('dragend', () => div.classList.remove('dragging'));

        div.addEventListener('click', () => {
            addJokeBlock(j);
            if (window.closeAddSheet) window.closeAddSheet();
        });

        return div;
    }

    function addJokeBlock(joke, insertAt) {
        const block = { id: genId(), type: 'joke', joke_id: joke.id, jokeData: joke };
        if (insertAt !== undefined && insertAt < blocks.length) {
            blocks.splice(insertAt, 0, block);
        } else {
            blocks.push(block);
        }
        renderDocument();
        scheduleSave();
    }

    function filterSidebar() {
        const q      = sidebarSearch.value.trim().toLowerCase();
        const estado = sidebarEstado.value;
        const filtered = allJokes.filter(j => {
            if (estado && j.estado !== estado) return false;
            if (q && !j.texto.toLowerCase().includes(q) && !(j.categoria || '').toLowerCase().includes(q)) return false;
            return true;
        });
        renderSidebar(filtered);
    }

    if (sidebarSearch)  sidebarSearch.addEventListener('input', filterSidebar);
    if (sidebarEstado)  sidebarEstado.addEventListener('change', filterSidebar);

    // ── Bloques sidebar ───────────────────────────────────────
    function renderBloquesSidebar() {
        sidebarBloques.innerHTML = '';
        if (!allBloques.length) {
            sidebarBloques.innerHTML = '<p class="sidebar-loading">' + (L.no_bloques_yet || 'No blocks yet.') + '</p>';
            return;
        }
        allBloques.forEach(b => sidebarBloques.appendChild(makeBloqueCard(b)));
    }

    function makeBloqueCard(bloque) {
        const div = document.createElement('div');
        div.className = 'sidebar-bloque-card';
        div.draggable = true;
        div.dataset.bloqueId = bloque.id;

        const count = bloque.chistes ? bloque.chistes.length : 0;
        div.innerHTML =
            '<div class="sidebar-bloque-name">' + escHtml(bloque.titulo) + '</div>' +
            '<div class="sidebar-bloque-meta">' + count + ' ' + (L.jokes_count || 'jokes') + '</div>';

        div.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/block-source', 'bloque');
            e.dataTransfer.setData('text/bloque-id', String(bloque.id));
            div.classList.add('dragging');
        });
        div.addEventListener('dragend', () => div.classList.remove('dragging'));

        div.addEventListener('click', () => {
            addBloqueBlock(bloque);
            if (window.closeAddSheet) window.closeAddSheet();
        });

        return div;
    }

    function addBloqueBlock(bloque, insertAt) {
        const newBlock = { id: genId(), type: 'bloque', bloque_id: bloque.id, bloqueData: bloque };
        if (insertAt !== undefined && insertAt < blocks.length) {
            blocks.splice(insertAt, 0, newBlock);
        } else {
            blocks.push(newBlock);
        }
        renderDocument();
        scheduleSave();
    }

    // ── Document render ───────────────────────────────────────
    function renderDocument() {
        const focusedId = document.activeElement?.closest?.('[data-block-id]')?.dataset.blockId;

        Array.from(docBlocks.children).forEach(el => {
            if (el.id !== 'doc-empty') el.remove();
        });

        if (blocks.length === 0) {
            docEmpty.style.display = '';
            updateProgress();
            return;
        }
        docEmpty.style.display = 'none';

        let jokeCounter = 0;
        blocks.forEach((block, index) => {
            if (block.type === 'joke') jokeCounter++;
            const el = makeBlockElement(block, index, jokeCounter);
            docBlocks.appendChild(el);
        });

        if (chartOpen) renderChart();
        updateProgress();

        if (focusedId) {
            const el = docBlocks.querySelector('[data-block-id="' + focusedId + '"] .text-block-content');
            if (el) el.focus();
        }
    }

    function makeBlockElement(block, index, jokeNum) {
        if (block.type === 'joke')   return makeJokeRow(block, index, jokeNum);
        if (block.type === 'text')   return makeTextRow(block, index);
        if (block.type === 'bloque') return makeBloqueRow(block, index);
        if (block.type === 'video')  return makeVideoRow(block, index);
        return document.createElement('div');
    }

    // ── Joke row ──────────────────────────────────────────────
    function makeJokeRow(block, index, num) {
        const joke = block.jokeData;
        const row  = document.createElement('div');
        row.className = 'se-joke-row';
        row.dataset.blockId = block.id;
        row.dataset.index   = String(index);
        row.draggable = true;

        const estado  = joke ? joke.estado : 'borrador';
        const badge   = document.createElement('div');
        badge.className = 'se-joke-badge se-badge--' + estado;
        badge.textContent = num;
        row.appendChild(badge);

        const body = document.createElement('div');
        body.className = 'se-joke-body';

        if (joke) {
            const textEl = document.createElement('div');
            textEl.className = 'se-joke-text';
            textEl.textContent = joke.texto.replace(/\*\*/g, '').replace(/\[PAUSA\]/g, '');

            const metaEl = document.createElement('div');
            metaEl.className = 'se-joke-meta';
            metaEl.textContent = [
                joke.categoria || '',
                joke.puntuacion != null ? '★'.repeat(joke.puntuacion) + '☆'.repeat(5 - joke.puntuacion) : '',
            ].filter(Boolean).join('  ');

            body.appendChild(textEl);
            body.appendChild(metaEl);

            body.addEventListener('click', () => openJokePopup(joke));
        } else {
            body.innerHTML = '<em style="color:var(--text-muted)">#' + block.joke_id + ' (' + (L.not_in_shows || 'not found') + ')</em>';
        }
        row.appendChild(body);

        const right = document.createElement('div');
        right.className = 'se-joke-right';

        if (joke && joke.duracion) {
            const durEl = document.createElement('span');
            durEl.className = 'se-joke-dur';
            durEl.textContent = durStrShort(joke.duracion);
            right.appendChild(durEl);
        }

        const handle = document.createElement('div');
        handle.className = 'se-drag-handle';
        handle.innerHTML = '≡';
        handle.title = 'Arrastrar';
        right.appendChild(handle);

        const delBtn = document.createElement('button');
        delBtn.className = 'se-joke-del';
        delBtn.innerHTML = '×';
        delBtn.title = 'Eliminar';
        delBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (!confirm(L.confirm_del_from_show || 'Remove this joke from the show?')) return;
            blocks.splice(index, 1);
            renderDocument();
            scheduleSave();
        });
        right.appendChild(delBtn);

        row.appendChild(right);

        // Drag from handle only
        let dragFromHandle = false;
        handle.addEventListener('mousedown', () => { dragFromHandle = true; });
        row.addEventListener('dragend', () => { dragFromHandle = false; });

        row.addEventListener('dragstart', e => {
            if (!dragFromHandle) { e.preventDefault(); return; }
            dragFromHandle = false;
            e.dataTransfer.setData('text/block-source', 'document');
            e.dataTransfer.setData('text/block-id', block.id);
            row.classList.add('dragging');
        });
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            clearDropIndicators();
        });

        wireDropTarget(row, block, index);

        return row;
    }

    // ── Text row ──────────────────────────────────────────────
    function makeTextRow(block, index) {
        const row = document.createElement('div');
        row.className = 'se-text-row';
        row.dataset.blockId = block.id;
        row.dataset.index   = String(index);

        const ed = document.createElement('div');
        ed.className       = 'text-block-content';
        ed.contentEditable = 'true';
        ed.setAttribute('data-placeholder', L.text_block_ph || 'Escribe aquí...');
        ed.innerHTML = block.content || '';
        ed.addEventListener('input', () => { block.content = ed.innerHTML; scheduleSave(); });
        ed.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTextBlock(index); }
        });
        row.appendChild(ed);

        const textHandle = document.createElement('div');
        textHandle.className = 'se-drag-handle';
        textHandle.innerHTML = '≡';
        textHandle.title = 'Arrastrar';
        row.appendChild(textHandle);

        const delBtn = document.createElement('button');
        delBtn.className = 'se-text-del';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('click', () => { blocks.splice(index, 1); renderDocument(); scheduleSave(); });
        row.appendChild(delBtn);

        wireDropTarget(row, block, index);
        return row;
    }

    // ── Bloque row ────────────────────────────────────────────
    function makeBloqueRow(block, index) {
        const bloque = block.bloqueData;
        const row = document.createElement('div');
        row.className = 'se-bloque-row';
        row.dataset.blockId = block.id;
        row.dataset.index   = String(index);

        if (bloque) {
            const totalSec = (bloque.chistes || []).reduce((sum, jid) => {
                const j = allJokes.find(x => x.id === jid);
                return sum + (j && j.duracion ? j.duracion : 0);
            }, 0);

            row.innerHTML =
                '<div class="se-bloque-header">' +
                    '<span class="se-drag-handle se-bloque-handle">≡</span>' +
                    '<span class="se-bloque-icon">📦</span>' +
                    '<span class="se-bloque-title">' + escHtml(bloque.titulo) + '</span>' +
                    (totalSec ? '<strong class="se-bloque-dur">' + durStrShort(totalSec) + '</strong>' : '') +
                    '<a class="btn btn-ghost btn-sm se-bloque-edit" href="' + BASE_URL + '/bloque_editor.php?id=' + escHtml(bloque.id) + '" target="_blank">↗</a>' +
                    '<button class="se-bloque-del">×</button>' +
                '</div>' +
                '<ol class="se-bloque-jokes">' +
                    (bloque.chistes || []).map(jid => {
                        const j = allJokes.find(x => x.id === jid);
                        return '<li>' + (j ? escHtml(j.texto.replace(/\*\*/g,'').slice(0, 80)) + (j.texto.length > 80 ? '…' : '') : escHtml(jid)) + '</li>';
                    }).join('') +
                '</ol>';

            row.querySelector('.se-bloque-del').addEventListener('click', () => {
                blocks.splice(index, 1);
                renderDocument();
                scheduleSave();
            });

            // Desktop drag
            const bHandle = row.querySelector('.se-drag-handle');
            row.draggable = true;
            let dragFromHandle = false;
            bHandle.addEventListener('mousedown', () => { dragFromHandle = true; });
            row.addEventListener('dragstart', e => {
                if (!dragFromHandle) { e.preventDefault(); return; }
                dragFromHandle = false;
                e.dataTransfer.setData('text/block-source', 'document');
                e.dataTransfer.setData('text/block-id', block.id);
                row.classList.add('dragging');
            });
            row.addEventListener('dragend', () => { row.classList.remove('dragging'); clearDropIndicators(); });
        } else {
            row.innerHTML = '<em style="color:var(--text-muted)">' + (L.bloque_not_found || 'Bloque eliminado') + '</em>';
        }

        wireDropTarget(row, block, index);
        return row;
    }

    // ── Video row ─────────────────────────────────────────────
    function makeVideoRow(block, index) {
        const div = document.createElement('div');
        div.className = 'block block-video';
        div.dataset.blockId = block.id;

        const vDiv = document.createElement('div');
        vDiv.className = 'video-block-content';
        const embedId = youtubeId(block.url);

        if (embedId) {
            const iframe = document.createElement('iframe');
            iframe.src = 'https://www.youtube.com/embed/' + embedId;
            iframe.allowFullscreen = true;
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.className = 'video-embed';
            vDiv.appendChild(iframe);

            const urlRow = document.createElement('div');
            urlRow.className = 'video-url-row';
            const urlSpan = document.createElement('span');
            urlSpan.className = 'video-url-label';
            urlSpan.textContent = block.url;
            const changeBtn = document.createElement('button');
            changeBtn.className = 'btn btn-ghost btn-sm';
            changeBtn.textContent = 'Cambiar URL';
            changeBtn.addEventListener('click', () => { block.url = ''; renderDocument(); });
            urlRow.appendChild(urlSpan);
            urlRow.appendChild(changeBtn);
            vDiv.appendChild(urlRow);
        } else {
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.className = 'video-url-input';
            urlInput.placeholder = 'Pega la URL de YouTube...';
            urlInput.value = block.url || '';
            urlInput.addEventListener('input', () => { block.url = urlInput.value.trim(); scheduleSave(); });
            urlInput.addEventListener('keydown', e => { if (e.key === 'Enter' && youtubeId(block.url)) renderDocument(); });
            urlInput.addEventListener('paste', e => {
                setTimeout(() => { block.url = urlInput.value.trim(); if (youtubeId(block.url)) renderDocument(); scheduleSave(); }, 0);
            });
            vDiv.appendChild(urlInput);
        }

        const delBtn = document.createElement('button');
        delBtn.className = 'se-text-del';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('click', () => { blocks.splice(index, 1); renderDocument(); scheduleSave(); });

        div.appendChild(vDiv);
        div.appendChild(delBtn);
        return div;
    }

    // ── Drop targets ──────────────────────────────────────────
    function wireDropTarget(el, block, index) {
        el.addEventListener('dragover', e => {
            if (!e.dataTransfer.types.includes('text/block-source')) return;
            e.preventDefault();
            clearDropIndicators();
            const above = e.clientY < el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
            el.classList.add(above ? 'drop-above' : 'drop-below');
        });
        el.addEventListener('dragleave', () => clearDropIndicators());
        el.addEventListener('drop', e => {
            e.preventDefault();
            const above  = el.classList.contains('drop-above');
            clearDropIndicators();
            const source = e.dataTransfer.getData('text/block-source');

            if (source === 'document') {
                const draggedId  = e.dataTransfer.getData('text/block-id');
                const draggedIdx = blocks.findIndex(b => b.id === draggedId);
                if (draggedIdx === -1) return;
                const [removed]  = blocks.splice(draggedIdx, 1);
                const targetIdx  = blocks.findIndex(b => b.id === block.id);
                blocks.splice(above ? targetIdx : targetIdx + 1, 0, removed);
            } else if (source === 'sidebar') {
                const jokeId = e.dataTransfer.getData('text/joke-id');
                const joke   = allJokes.find(j => j.id === jokeId);
                const targetIdx = blocks.findIndex(b => b.id === block.id);
                blocks.splice(above ? targetIdx : targetIdx + 1, 0, { id: genId(), type: 'joke', joke_id: jokeId, jokeData: joke || null });
            } else if (source === 'bloque') {
                const bloqueId = e.dataTransfer.getData('text/bloque-id');
                const bloque   = allBloques.find(b => b.id === bloqueId);
                if (bloque) {
                    const targetIdx = blocks.findIndex(b => b.id === block.id);
                    addBloqueBlock(bloque, above ? targetIdx : targetIdx + 1);
                    return;
                }
            }
            renderDocument();
            scheduleSave();
        });
    }

    function clearDropIndicators() {
        docBlocks.querySelectorAll('.drop-above, .drop-below').forEach(el => el.classList.remove('drop-above', 'drop-below'));
    }

    docBlocks.addEventListener('dragover', e => {
        if (blocks.length > 0) return;
        e.preventDefault();
        docEmpty.style.borderColor = 'var(--accent)';
    });
    docBlocks.addEventListener('dragleave', () => { docEmpty.style.borderColor = ''; });
    docBlocks.addEventListener('drop', e => {
        if (blocks.length > 0) return;
        e.preventDefault();
        docEmpty.style.borderColor = '';
        const source = e.dataTransfer.getData('text/block-source');
        if (source === 'sidebar') {
            const jokeId = e.dataTransfer.getData('text/joke-id');
            const joke   = allJokes.find(j => j.id === jokeId);
            blocks.push({ id: genId(), type: 'joke', joke_id: jokeId, jokeData: joke || null });
            renderDocument(); scheduleSave();
        } else if (source === 'bloque') {
            const bloqueId = e.dataTransfer.getData('text/bloque-id');
            const bloque   = allBloques.find(b => b.id === bloqueId);
            if (bloque) addBloqueBlock(bloque);
        }
    });

    // ── Block helpers ─────────────────────────────────────────
    function addTextBlock(afterIndex) {
        const block = { id: genId(), type: 'text', content: '' };
        if (afterIndex === undefined || afterIndex >= blocks.length - 1) {
            blocks.push(block);
        } else {
            blocks.splice(afterIndex + 1, 0, block);
        }
        renderDocument();
        requestAnimationFrame(() => {
            const el = docBlocks.querySelector('[data-block-id="' + block.id + '"] .text-block-content');
            if (el) el.focus();
        });
    }

    function addVideoBlock() {
        const block = { id: genId(), type: 'video', url: '' };
        blocks.push(block);
        renderDocument();
        scheduleSave();
        requestAnimationFrame(() => {
            const el = docBlocks.querySelector('[data-block-id="' + block.id + '"] .video-url-input');
            if (el) el.focus();
        });
    }

    addFirstText?.addEventListener('click', () => addTextBlock());

    // ── Sheets ────────────────────────────────────────────────
    function wireSheets() {
        // Add joke sheet
        const addOverlay  = document.getElementById('se-add-overlay');
        const addSheet    = document.getElementById('se-add-sheet');
        const addCloseBtn = document.getElementById('se-add-close');
        const addJokeBtn  = document.getElementById('se-add-joke-btn');
        const notesBtn    = document.getElementById('se-notes-btn');

        function openAddSheet(showBloques) {
            addSheet.classList.add('ch-sheet--open');
            addOverlay.classList.add('ch-sheet-overlay--open');
            addSheet.setAttribute('aria-hidden', 'false');
            document.body.classList.add('ch-sheet-body-lock');
            if (showBloques) {
                sidebarList.style.display = 'none';
                if (panelBloques) panelBloques.style.display = '';
            } else {
                sidebarList.style.display = '';
                if (panelBloques) panelBloques.style.display = 'none';
            }
        }

        window.closeAddSheet = function() {
            addSheet.classList.remove('ch-sheet--open');
            addOverlay.classList.remove('ch-sheet-overlay--open');
            addSheet.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('ch-sheet-body-lock');
        };

        if (addJokeBtn) addJokeBtn.addEventListener('click', () => openAddSheet(false));
        if (addCloseBtn) addCloseBtn.addEventListener('click', closeAddSheet);
        if (addOverlay) addOverlay.addEventListener('click', closeAddSheet);
        if (notesBtn) notesBtn.addEventListener('click', () => { addTextBlock(); });

        // Meta sheet
        const metaOverlay = document.getElementById('se-meta-overlay');
        const metaSheet   = document.getElementById('se-meta-sheet');
        const metaClose   = document.getElementById('se-meta-close');
        const metaSaveBtn = document.getElementById('se-meta-save');
        const seMetaSala  = document.getElementById('se-meta-sala');
        const seMetaCiudad= document.getElementById('se-meta-ciudad');
        const seMetaFecha = document.getElementById('se-meta-fecha');
        const seMetaDurObj= document.getElementById('se-meta-durobj');

        function openMetaSheet() {
            if (seMetaSala)   seMetaSala.value   = metaSala   ? metaSala.value   : '';
            if (seMetaCiudad) seMetaCiudad.value = metaCiudad ? metaCiudad.value : '';
            if (seMetaFecha)  seMetaFecha.value  = metaFecha  ? metaFecha.value  : '';
            if (seMetaDurObj) seMetaDurObj.value = targetMinutes;
            metaSheet.classList.add('ch-sheet--open');
            metaOverlay.classList.add('ch-sheet-overlay--open');
            metaSheet.setAttribute('aria-hidden', 'false');
            document.body.classList.add('ch-sheet-body-lock');
        }

        function closeMetaSheet() {
            metaSheet.classList.remove('ch-sheet--open');
            metaOverlay.classList.remove('ch-sheet-overlay--open');
            metaSheet.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('ch-sheet-body-lock');
        }

        if (subtitleBtn) subtitleBtn.addEventListener('click', openMetaSheet);
        if (metaClose)   metaClose.addEventListener('click', closeMetaSheet);
        if (metaOverlay) metaOverlay.addEventListener('click', closeMetaSheet);
        if (metaSaveBtn) {
            metaSaveBtn.addEventListener('click', () => {
                if (metaSala   && seMetaSala)   metaSala.value   = seMetaSala.value;
                if (metaCiudad && seMetaCiudad) metaCiudad.value = seMetaCiudad.value;
                if (metaFecha  && seMetaFecha)  metaFecha.value  = seMetaFecha.value;
                if (seMetaDurObj) {
                    const v = parseInt(seMetaDurObj.value, 10);
                    if (v > 0) targetMinutes = v;
                }
                updateSubtitle();
                updateProgress();
                scheduleSave();
                closeMetaSheet();
            });
        }
    }

    // ── Menu sheet ────────────────────────────────────────────
    function wireMenu() {
        const menuBtn     = document.getElementById('se-menu-btn');
        const menuOverlay = document.getElementById('se-menu-overlay');
        const menuSheet   = document.getElementById('se-menu-sheet');

        function openMenu() {
            menuSheet.classList.add('ch-sheet--open');
            menuOverlay.classList.add('ch-sheet-overlay--open');
            menuSheet.setAttribute('aria-hidden', 'false');
            document.body.classList.add('ch-sheet-body-lock');
        }
        function closeMenu() {
            menuSheet.classList.remove('ch-sheet--open');
            menuOverlay.classList.remove('ch-sheet-overlay--open');
            menuSheet.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('ch-sheet-body-lock');
        }

        if (menuBtn)     menuBtn.addEventListener('click', openMenu);
        if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);

        function menuAction(id, fn) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => { closeMenu(); fn(); });
        }

        menuAction('menu-add-text',   () => addTextBlock());
        menuAction('menu-add-video',  () => addVideoBlock());
        menuAction('menu-add-bloque', () => { if (typeof closeAddSheet === 'function') {} openAddSheet_bloques(); });
        menuAction('menu-player',     openPlayer);
        menuAction('menu-diagram',    openDiagram);
        menuAction('menu-chart',      () => { chartToggleFn(); });
        menuAction('menu-export',     doExportText);
        menuAction('menu-clone',      doClone);

        function openAddSheet_bloques() {
            const addOverlay = document.getElementById('se-add-overlay');
            const addSheet   = document.getElementById('se-add-sheet');
            sidebarList.style.display = 'none';
            if (panelBloques) panelBloques.style.display = '';
            addSheet.classList.add('ch-sheet--open');
            addOverlay.classList.add('ch-sheet-overlay--open');
            addSheet.setAttribute('aria-hidden', 'false');
            document.body.classList.add('ch-sheet-body-lock');
        }
    }

    // ── Save ──────────────────────────────────────────────────
    function scheduleSave() {
        if (saveTimer) clearTimeout(saveTimer);
        setSaveStatus('saving', 'composer_saving');
        saveTimer = setTimeout(save, 1500);
    }

    function getMeta() {
        return {
            fecha_show: metaFecha  ? metaFecha.value  : '',
            sala:       metaSala   ? metaSala.value   : '',
            ciudad:     metaCiudad ? metaCiudad.value : '',
        };
    }

    async function save() {
        const titulo    = titleInput.value.trim() || 'Show sin título';
        const contenido = { blocks: blocks.map(serializeBlock), target_minutes: targetMinutes };
        const meta      = getMeta();

        try {
            let res;
            if (showId) {
                res = await fetch(BASE_URL + '/api/shows.php?id=' + showId, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, contenido, ...meta }),
                });
            } else {
                res = await fetch(BASE_URL + '/api/shows.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, contenido, ...meta }),
                });
                if (res.ok) {
                    const data = await res.json();
                    showId = data.id;
                    history.replaceState(null, '', BASE_URL + '/show_editor.php?id=' + showId);
                    setSaveStatus('saved', 'composer_saved');
                    return;
                }
            }
            if (!res.ok) throw new Error('Error ' + res.status);
            setSaveStatus('saved', 'composer_saved');
        } catch (e) {
            setSaveStatus('error', 'form_error');
        }
    }

    function serializeBlock(b) {
        if (b.type === 'text')   return { id: b.id, type: 'text',   content: b.content || '' };
        if (b.type === 'joke')   return { id: b.id, type: 'joke',   joke_id: b.joke_id, estrellas_reales: b.estrellas_reales ?? null, notas: b.notas || '' };
        if (b.type === 'video')  return { id: b.id, type: 'video',  url: b.url || '' };
        if (b.type === 'bloque') return { id: b.id, type: 'bloque', bloque_id: b.bloque_id };
        return b;
    }

    function getFlatJokeBlocks() {
        const result = [];
        blocks.forEach(b => {
            if (b.type === 'joke' && b.jokeData) {
                result.push({ jokeData: b.jokeData, estrellas_reales: b.estrellas_reales ?? null });
            } else if (b.type === 'bloque' && b.bloqueData) {
                (b.bloqueData.chistes || []).forEach(jokeId => {
                    const joke = allJokes.find(j => j.id === jokeId);
                    if (joke) result.push({ jokeData: joke, estrellas_reales: null });
                });
            }
        });
        return result;
    }

    saveBtn.addEventListener('click', () => { if (saveTimer) clearTimeout(saveTimer); save(); });
    titleInput.addEventListener('input', scheduleSave);
    window.addEventListener('beforeunload', () => { if (saveTimer) { clearTimeout(saveTimer); save(); } });

    function setSaveStatus(cls, key) {
        if (!saveStatus) return;
        saveStatus.style.display = '';
        saveStatus.className = 'save-status ' + cls;
        saveStatus.textContent = L[key] || key;
        if (cls === 'saved') setTimeout(() => { if (saveStatus) saveStatus.style.display = 'none'; }, 2000);
    }

    // ── Joke popup ────────────────────────────────────────────
    const jokePopupOverlay = document.getElementById('joke-popup-overlay');
    const jokePopupClose   = document.getElementById('joke-popup-close');

    function openJokePopup(joke) {
        document.getElementById('joke-popup-cat').textContent   = joke.categoria || '—';
        document.getElementById('joke-popup-stars').textContent = joke.puntuacion != null ? '★'.repeat(joke.puntuacion) + '☆'.repeat(5 - joke.puntuacion) : '';
        const estadoEl = document.getElementById('joke-popup-estado');
        estadoEl.textContent = estadoLabel(joke.estado);
        estadoEl.className   = 'estado estado-' + joke.estado;
        document.getElementById('joke-popup-texto').textContent = joke.texto;
        const tagsEl = document.getElementById('joke-popup-tags');
        tagsEl.innerHTML = (joke.tags || []).map(t => '<span class="tag">' + escHtml(t) + '</span>').join('');
        const durEl = document.getElementById('joke-popup-dur');
        if (durEl) {
            const d = joke.duracion;
            durEl.textContent  = d ? durStrShort(d) : '';
            durEl.style.display = d ? '' : 'none';
        }
        const editLink = document.getElementById('joke-popup-edit');
        if (editLink) editLink.href = BASE_URL + '/chiste_form.php?id=' + joke.id;
        jokePopupOverlay.style.zIndex   = '600';
        jokePopupOverlay.style.display  = 'flex';
    }

    jokePopupClose.addEventListener('click', () => { jokePopupOverlay.style.display = 'none'; });
    jokePopupOverlay.addEventListener('click', e => { if (e.target === jokePopupOverlay) jokePopupOverlay.style.display = 'none'; });

    // ── Chart ─────────────────────────────────────────────────
    const chartPanel  = document.getElementById('chart-panel');
    const chartCanvas = document.getElementById('show-chart');
    const chartOverlay = document.getElementById('chart-overlay');

    function chartToggleFn() {
        chartOpen = !chartOpen;
        chartPanel.classList.toggle('open', chartOpen);
        if (chartOverlay) chartOverlay.classList.toggle('active', chartOpen);
        if (chartOpen) {
            chartPanel.style.height = Math.round(window.innerHeight * 0.5) + 'px';
            requestAnimationFrame(renderChart);
        } else {
            closeChart();
        }
    }

    function closeChart() {
        chartOpen = false;
        chartPanel.classList.remove('open');
        chartPanel.style.height = '';
        if (chartOverlay) chartOverlay.classList.remove('active');
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    }

    if (chartOverlay) chartOverlay.addEventListener('click', closeChart);

    const chartPanelClose = document.getElementById('chart-panel-close');
    if (chartPanelClose) {
        chartPanelClose.addEventListener('click', closeChart);
        chartPanelClose.addEventListener('touchend', e => { e.preventDefault(); closeChart(); });
    }

    const growBtn   = document.getElementById('chart-panel-grow');
    const shrinkBtn = document.getElementById('chart-panel-shrink');
    const STEP      = Math.round(window.innerHeight * 0.15);
    const minH = 160, maxH = () => Math.round(window.innerHeight * 0.92);
    function currentPanelHeight() { return chartPanel.offsetHeight || Math.round(window.innerHeight * 0.75); }
    function setPanelHeight(h) {
        chartPanel.style.height = Math.max(minH, Math.min(maxH(), h)) + 'px';
        if (chartInstance) chartInstance.resize();
    }
    if (growBtn)   growBtn.addEventListener('click',   () => setPanelHeight(currentPanelHeight() + STEP));
    if (shrinkBtn) shrinkBtn.addEventListener('click', () => setPanelHeight(currentPanelHeight() - STEP));

    function getStyle(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

    function renderChart() {
        const jokeBlocks = [], bloqueEndIndices = [];
        blocks.forEach(b => {
            if (b.type === 'joke' && b.jokeData) {
                jokeBlocks.push({ jokeData: b.jokeData, estrellas_reales: b.estrellas_reales ?? null });
            } else if (b.type === 'bloque' && b.bloqueData) {
                const start = jokeBlocks.length;
                (b.bloqueData.chistes || []).forEach(jokeId => {
                    const joke = allJokes.find(j => j.id === jokeId);
                    if (joke) jokeBlocks.push({ jokeData: joke, estrellas_reales: null });
                });
                if (jokeBlocks.length > start) bloqueEndIndices.push(jokeBlocks.length - 1);
            }
        });

        const separatorIndices = bloqueEndIndices.filter(idx => idx < jokeBlocks.length - 1);
        let _cum = 0;
        const cumTimes = jokeBlocks.map(item => { const t = _cum; _cum += item.jokeData.duracion || 0; return t; });
        const labels   = jokeBlocks.map((item, i) => {
            const sec = cumTimes[i], m = Math.floor(sec/60), s = sec%60;
            const raw = item.jokeData.texto.replace(/\*\*/g,'');
            return [m+':'+String(s).padStart(2,'0'), raw.length > 20 ? raw.slice(0,20)+'…' : raw];
        });
        const data     = jokeBlocks.map(item => item.jokeData.puntuacion ?? null);
        const dataReal = jokeBlocks.map(item => item.estrellas_reales ?? null);
        const hasReal  = dataReal.some(v => v != null);
        const accent = getStyle('--accent'), ok = getStyle('--ok'), textMuted = getStyle('--text-muted'), border = getStyle('--border');

        const bloqueSeparatorPlugin = {
            id: 'bloqueSeparators',
            afterDraw(chart) {
                if (!separatorIndices.length) return;
                const ctx = chart.ctx, xAxis = chart.scales.x, yAxis = chart.scales.y;
                ctx.save(); ctx.strokeStyle = textMuted; ctx.lineWidth = 1.5; ctx.setLineDash([5,4]);
                separatorIndices.forEach(idx => {
                    const x = (xAxis.getPixelForValue(idx) + xAxis.getPixelForValue(idx+1)) / 2;
                    ctx.beginPath(); ctx.moveTo(x, yAxis.top); ctx.lineTo(x, yAxis.bottom); ctx.stroke();
                });
                ctx.restore();
            },
        };

        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(chartCanvas, {
            type: 'line', plugins: [bloqueSeparatorPlugin],
            data: { labels, datasets: [
                { label: 'Esperado', data, spanGaps: false, borderColor: accent, backgroundColor: accent+'22', pointBackgroundColor: accent, pointRadius: 5, pointHoverRadius: 7, tension: 0.35, fill: true },
                { label: 'Real', data: dataReal, spanGaps: false, borderColor: ok, backgroundColor: ok+'22', pointBackgroundColor: ok, pointRadius: 5, pointHoverRadius: 7, tension: 0.35, fill: false, hidden: !hasReal },
            ]},
            options: {
                responsive: true, maintainAspectRatio: false,
                onClick: (e, elements) => { if (elements.length) { const joke = jokeBlocks[elements[0].index]?.jokeData; if (joke) openJokePopup(joke); } },
                onHover: (e, elements) => { chartCanvas.style.cursor = elements.length ? 'pointer' : 'default'; },
                plugins: {
                    legend: { display: true, labels: { color: textMuted, boxWidth: 12, font: { size: 11 } } },
                    tooltip: { callbacks: {
                        title: ctx => { const t = (jokeBlocks[ctx[0]?.dataIndex]?.jokeData?.texto||'').replace(/\*\*/g,''); return t.length > 45 ? t.slice(0,45)+'…' : t; },
                        label: ctx => ctx.raw != null ? '★'.repeat(ctx.raw)+'☆'.repeat(5-ctx.raw) : 'Sin puntuación',
                    }},
                },
                scales: {
                    y: { min: 0, max: 5.8, ticks: { display: false }, grid: { color: border } },
                    x: { ticks: { color: textMuted, maxRotation: 30 }, grid: { color: border } },
                },
            },
        });
    }

    // ── Diagram ───────────────────────────────────────────────
    const diagramOverlay   = document.getElementById('diagram-overlay');
    const diagramBody      = document.getElementById('diagram-body');
    const diagramShowTitle = document.getElementById('diagram-show-title');
    const diagramCloseBtn  = document.getElementById('diagram-close');
    const diagramPrintBtn  = document.getElementById('diagram-print');

    function openDiagram() {
        diagramShowTitle.textContent = titleInput?.value || '';
        diagramBody.innerHTML = buildDiagramHTML();
        diagramOverlay.classList.add('open');
    }
    function closeDiagram() { diagramOverlay.classList.remove('open'); }

    function buildDiagramHTML() {
        if (!blocks.length) return '<p style="color:var(--text-muted);padding:1rem 0">' + (L.player_no_jokes || 'No hay bloques') + '</p>';
        let html = '', cumSec = 0;
        blocks.forEach(block => {
            const timeStr = fmtTime(cumSec);
            if (block.type === 'joke') {
                const joke = block.jokeData; if (!joke) return;
                const dur = joke.duracion || 0;
                const prev = joke.texto.replace(/\*\*/g,'').replace(/\[PAUSA\]/g,'').slice(0, 120);
                html += row('joke', timeStr, '🎤',
                    '<span class="diagram-preview">' + escHtml(prev) + (joke.texto.length > 120 ? '…':'') + '</span>' +
                    (joke.categoria||joke.puntuacion ? '<div class="diagram-meta">' + escHtml(joke.categoria||'') + (joke.puntuacion ? ' · ' + starsHtml(joke.puntuacion) : '') + '</div>' : ''),
                    dur ? durStr(dur) : '');
                cumSec += dur;
            } else if (block.type === 'bloque') {
                const bloque = block.bloqueData; if (!bloque) return;
                let bloqueSec = 0, jokesHtml = '';
                (bloque.chistes || []).forEach(jid => {
                    const j = allJokes.find(x => x.id === jid); if (!j) return;
                    bloqueSec += j.duracion || 0;
                    const prev = j.texto.replace(/\*\*/g,'').replace(/\[PAUSA\]/g,'').slice(0, 80);
                    jokesHtml += '<li>' + escHtml(prev) + (j.texto.length > 80 ? '…':'') + (j.duracion ? ' <strong style="color:var(--accent);font-size:0.7rem">' + durStr(j.duracion) + '</strong>' : '') + '</li>';
                });
                html += row('bloque', timeStr, '📦',
                    '<span class="diagram-preview">' + escHtml(bloque.titulo) + '</span>' +
                    (bloque.descripcion ? '<div class="diagram-meta">' + escHtml(bloque.descripcion) + '</div>' : '') +
                    (jokesHtml ? '<ol class="diagram-bloque-jokes">' + jokesHtml + '</ol>' : ''),
                    bloqueSec ? durStr(bloqueSec) : '');
                cumSec += bloqueSec;
            } else if (block.type === 'text') {
                const raw = (block.content||'').replace(/<[^>]+>/g,'').slice(0,80); if (!raw.trim()) return;
                html += row('text', timeStr, '📝', '<span class="diagram-preview">' + escHtml(raw) + (raw.length >= 80 ? '…':'') + '</span>', '');
            } else if (block.type === 'video') {
                html += row('video', timeStr, '▶', '<span class="diagram-preview">' + escHtml(block.url || 'Video') + '</span>', '');
            }
        });
        return html + (cumSec ? '<div style="text-align:right;font-size:0.78rem;color:var(--text-muted);padding-top:0.6rem">Total: <strong style="color:var(--accent)">' + durStr(cumSec) + '</strong></div>' : '');
    }

    function row(type, time, icon, content, dur) {
        return '<div class="diagram-row diagram-row-'+type+'">' +
            '<span class="diagram-time">' + escHtml(time) + '</span>' +
            '<span class="diagram-icon">' + icon + '</span>' +
            '<div class="diagram-content">' + content + '</div>' +
            '<span class="diagram-dur">' + escHtml(dur) + '</span>' +
        '</div>';
    }
    function fmtTime(sec) { const m = Math.floor(sec/60), s = sec%60; return m+':'+String(s).padStart(2,'0'); }

    if (diagramCloseBtn) diagramCloseBtn.addEventListener('click', closeDiagram);
    if (diagramPrintBtn) diagramPrintBtn.addEventListener('click', () => {
        const w = window.open('', '_blank');
        const title = titleInput?.value || '';
        w.document.write('<html><head><title>' + title + '</title><style>' +
            'body{font-family:sans-serif;font-size:11pt;padding:1.5cm 2cm;max-width:700px;margin:0 auto}' +
            '.diagram-row{display:grid;grid-template-columns:3.2rem 1.4rem 1fr auto;gap:0 0.5rem;padding:0.45rem 0;border-bottom:1px solid #e0e0e0}' +
            '.diagram-row:last-child{border-bottom:none}' +
            '.diagram-time{font-size:9pt;color:#888;text-align:right;padding-top:2px}' +
            '.diagram-icon{text-align:center}.diagram-preview{font-size:10pt}' +
            '.diagram-row-bloque .diagram-preview{font-weight:700;text-transform:uppercase;letter-spacing:0.04em;font-size:9pt}' +
            '.diagram-meta{font-size:8pt;color:#888;margin-top:2px}' +
            '.diagram-bloque-jokes{margin:4px 0 0 4px;padding-left:14px;font-size:9pt;color:#555}' +
            '.diagram-bloque-jokes li{margin-bottom:2px}' +
            '.diagram-dur{font-size:9pt;font-weight:700;color:#555;white-space:nowrap;padding-top:2px}' +
            '.diagram-row-text .diagram-preview{font-style:italic;color:#888}' +
            '</style></head><body><h2 style="margin-bottom:1rem;font-size:14pt">' + title + '</h2>' +
            diagramBody.innerHTML + '</body></html>');
        w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
    });
    if (diagramOverlay) diagramOverlay.addEventListener('click', e => { if (e.target === diagramOverlay) closeDiagram(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && diagramOverlay?.classList.contains('open')) closeDiagram(); });

    // ── Player ────────────────────────────────────────────────
    const playerOverlay  = document.getElementById('player-overlay');
    const playerPosEl    = document.getElementById('player-pos');
    const playerCatEl    = document.getElementById('player-category');
    const playerDurEl    = document.getElementById('player-dur');
    const playerTextEl   = document.getElementById('player-text');
    const playerBar      = document.getElementById('player-progress-bar');
    const playerPrevBtn  = document.getElementById('player-prev');
    const playerNextBtn  = document.getElementById('player-next');
    const playerPlayBtn  = document.getElementById('player-playpause');
    const playerCloseBtn = document.getElementById('player-close');

    let playerJokes = [], playerIndex = 0, playerPlaying = false, playerRAF = null, playerStart = null, playerDurMs = null;

    function openPlayer() {
        playerJokes = getFlatJokeBlocks();
        if (!playerJokes.length) { alert(L.player_no_jokes || 'No jokes in this show'); return; }
        playerIndex = 0; playerPlaying = false;
        updatePlayBtn(); renderPlayerSlide();
        playerOverlay.classList.add('open');
    }
    function closePlayer() { stopProgress(); playerPlaying = false; playerOverlay.classList.remove('open'); }
    function renderPlayerSlide() {
        const item = playerJokes[playerIndex], joke = item.jokeData;
        playerPosEl.textContent  = (playerIndex+1) + ' / ' + playerJokes.length;
        playerCatEl.textContent  = joke.categoria || '';
        playerDurEl.textContent  = joke.duracion ? durStr(joke.duracion) : '';
        playerTextEl.innerHTML   = parseBold(joke.texto);
        playerBar.style.width    = '0%';
        playerBar.style.transition = 'none';
        playerPrevBtn.disabled   = playerIndex === 0;
        playerNextBtn.disabled   = playerIndex === playerJokes.length - 1;
    }
    function playerGoNext() { stopProgress(); if (playerIndex < playerJokes.length-1) { playerIndex++; renderPlayerSlide(); if (playerPlaying) startProgress(); } else { playerPlaying = false; updatePlayBtn(); } }
    function playerGoPrev() { stopProgress(); if (playerIndex > 0) { playerIndex--; renderPlayerSlide(); if (playerPlaying) startProgress(); } }
    function togglePlay() { playerPlaying = !playerPlaying; updatePlayBtn(); if (playerPlaying) startProgress(); else stopProgress(); }
    function updatePlayBtn() { playerPlayBtn.textContent = playerPlaying ? '⏸' : '▶'; }
    function startProgress() {
        const dur = playerJokes[playerIndex]?.jokeData?.duracion; if (!dur) return;
        playerDurMs = dur * 1000; playerStart = Date.now();
        function tick() {
            const pct = Math.min((Date.now()-playerStart)/playerDurMs*100, 100);
            playerBar.style.width = pct + '%';
            if (pct < 100) playerRAF = requestAnimationFrame(tick); else playerGoNext();
        }
        playerRAF = requestAnimationFrame(tick);
    }
    function stopProgress() { cancelAnimationFrame(playerRAF); playerRAF = null; }

    if (playerCloseBtn) playerCloseBtn.addEventListener('click', closePlayer);
    if (playerPrevBtn)  playerPrevBtn.addEventListener('click', playerGoPrev);
    if (playerNextBtn)  playerNextBtn.addEventListener('click', playerGoNext);
    if (playerPlayBtn)  playerPlayBtn.addEventListener('click', togglePlay);
    document.addEventListener('keydown', e => {
        if (!playerOverlay?.classList.contains('open')) return;
        if (e.key === 'Escape') closePlayer();
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') playerGoNext();
        else if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   playerGoPrev();
        else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    });

    // ── Export & Clone ────────────────────────────────────────
    function doExportText() {
        const titulo = titleInput.value.trim() || 'Show';
        const meta   = getMeta();
        const lines  = [titulo];
        if (meta.fecha_show || meta.sala || meta.ciudad) {
            lines.push([meta.fecha_show, meta.sala, meta.ciudad].filter(Boolean).join(' · '));
        }
        lines.push('');
        let totalSec = 0, jokeNum = 0;
        blocks.forEach(b => {
            if (b.type === 'text') {
                const txt = (b.content||'').replace(/<[^>]+>/g,'').trim(); if (txt) lines.push('--- ' + txt + ' ---');
            } else if (b.type === 'joke' && b.jokeData) {
                jokeNum++; const joke = b.jokeData, dur = joke.duracion;
                const ds = dur ? ' [' + Math.floor(dur/60) + 'min' + (dur%60 ? dur%60+'s':'') + ']' : '';
                totalSec += dur||0;
                const stars = joke.puntuacion != null ? ' (' + '★'.repeat(joke.puntuacion) + ')' : '';
                lines.push(jokeNum + '. ' + joke.texto.replace(/\*\*/g,'').slice(0,80) + (joke.texto.length>80?'…':'') + ds + stars);
            } else if (b.type === 'bloque' && b.bloqueData) {
                lines.push('--- ' + b.bloqueData.titulo + ' ---');
                (b.bloqueData.chistes||[]).forEach(jokeId => {
                    const joke = allJokes.find(j => j.id === jokeId); if (!joke) return;
                    jokeNum++; const dur = joke.duracion;
                    const ds = dur ? ' [' + Math.floor(dur/60) + 'min' + (dur%60 ? dur%60+'s':'') + ']' : '';
                    totalSec += dur||0;
                    const stars = joke.puntuacion != null ? ' (' + '★'.repeat(joke.puntuacion) + ')' : '';
                    lines.push(jokeNum + '. ' + joke.texto.replace(/\*\*/g,'').slice(0,80) + (joke.texto.length>80?'…':'') + ds + stars);
                });
            }
        });
        if (totalSec) { lines.push(''); lines.push('Total: ' + Math.floor(totalSec/60) + 'min' + (totalSec%60 ? ' '+totalSec%60+'s':'')); }
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = titulo.replace(/[^a-z0-9áéíóúñ ]/gi,'_') + '.txt'; a.click();
        URL.revokeObjectURL(url);
    }

    async function doClone() {
        if (!showId) return;
        try {
            const res  = await fetch(BASE_URL + '/api/shows.php?action=clone&id=' + showId, { method: 'POST' });
            const data = await res.json();
            if (data.id) window.open(BASE_URL + '/show_editor.php?id=' + data.id, '_blank');
        } catch(_) { alert('Error al clonar el show'); }
    }

    // ── Helpers ───────────────────────────────────────────────
    function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

    function durStr(sec) {
        if (!sec) return '';
        const m = Math.floor(sec/60), s = sec%60;
        return m + 'min' + (s ? s+'s' : '');
    }

    function durStrShort(sec) {
        if (!sec) return '';
        const m = Math.floor(sec/60), s = sec%60;
        return m + ':' + String(s).padStart(2, '0');
    }

    function escHtml(s) {
        if (s == null) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function starsHtml(n) {
        if (n == null) return '';
        let s = '';
        for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
        return s;
    }
    function parseBold(text) {
        return escHtml(text)
            .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
            .replace(/\n?\[PAUSA\]\n?/g, '<span class="pausa-tag">— PAUSA —</span>');
    }
    function estadoLabel(e) {
        const map = { borrador: L.status_draft||'Draft', desarrollo: L.status_dev||'In dev', probado: L.status_tested||'Tested', rotacion: L.status_rotation||'In rotation', retirado: L.status_retired||'Retired' };
        return map[e] || e;
    }
    function youtubeId(url) {
        if (!url) return null;
        for (const re of [/[?&]v=([a-zA-Z0-9_-]{11})/, /youtu\.be\/([a-zA-Z0-9_-]{11})/, /embed\/([a-zA-Z0-9_-]{11})/, /shorts\/([a-zA-Z0-9_-]{11})/]) {
            const m = url.match(re);
            if (m) return m[1];
        }
        return null;
    }

    init();
}());
