(function () {
    'use strict';

    let blocks    = [];
    let allJokes  = [];
    let showId    = SHOW_ID;
    let saveTimer = null;
    let chartInstance = null;
    let chartOpen = false;

    const docBlocks     = document.getElementById('document-blocks');
    const docEmpty      = document.getElementById('doc-empty');
    const addFirstText  = document.getElementById('add-first-text');
    const addTextBottom = document.getElementById('add-text-bottom');
    const saveBtn       = document.getElementById('save-btn');
    const saveStatus    = document.getElementById('save-status');
    const titleInput    = document.getElementById('show-titulo');
    const sidebarList   = document.getElementById('sidebar-jokes-list');
    const sidebarSearch = document.getElementById('sidebar-search');
    const sidebarEstado = document.getElementById('sidebar-estado');

    async function init() {
        await loadJokes();
        if (SHOW_DATA && SHOW_DATA.blocks) {
            blocks = SHOW_DATA.blocks.map(b => {
                if (b.type === 'joke') {
                    b.jokeData = allJokes.find(j => j.id === b.joke_id) || null;
                    b.notas    = b.notas || '';
                }
                return b;
            });
        }
        renderDocument();
        renderSidebar(allJokes);
    }

    async function loadJokes() {
        try {
            const res = await fetch(BASE_URL + '/api/chistes.php');
            allJokes  = await res.json();
        } catch (e) {
            sidebarList.innerHTML = '<p class="sidebar-loading" style="color:var(--danger)">Error al cargar chistes.</p>';
        }
    }

    function renderSidebar(jokes) {
        sidebarList.innerHTML = '';
        if (jokes.length === 0) {
            sidebarList.innerHTML = '<p class="sidebar-no-results">Sin resultados.</p>';
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
            if (!window.matchMedia('(max-width: 768px)').matches) return;
            addJokeBlock(j);
            if (typeof closeSidebar === 'function') closeSidebar();
        });

        return div;
    }

    function addJokeBlock(joke) {
        blocks.push({ id: genId(), type: 'joke', joke_id: joke.id, jokeData: joke });
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

    sidebarSearch.addEventListener('input', filterSidebar);
    sidebarEstado.addEventListener('change', filterSidebar);

    function renderDocument() {
        const focusedId = document.activeElement?.closest?.('[data-block-id]')?.dataset.blockId;

        Array.from(docBlocks.children).forEach(el => {
            if (el.id !== 'doc-empty') el.remove();
        });

        if (blocks.length === 0) {
            docEmpty.style.display = '';
            return;
        }
        docEmpty.style.display = 'none';

        blocks.forEach((block, index) => {
            const el = makeBlockElement(block, index);
            docBlocks.appendChild(el);
        });

        if (chartOpen) renderChart();
        updateTotalDuration();

        if (focusedId) {
            const el = docBlocks.querySelector('[data-block-id="' + focusedId + '"] .text-block-content');
            if (el) el.focus();
        }
    }

    function makeBlockElement(block, index) {
        const div = document.createElement('div');
        div.className = 'block block-' + block.type;
        div.dataset.blockId = block.id;
        div.dataset.index   = String(index);

        const handle = document.createElement('div');
        handle.className = 'block-handle';
        handle.textContent = '⠿';
        handle.title = 'Arrastrar';

        const inner = document.createElement('div');
        inner.className = 'block-inner';

        if (block.type === 'text') {
            const ed = document.createElement('div');
            ed.className      = 'text-block-content';
            ed.contentEditable = 'true';
            ed.setAttribute('data-placeholder', 'Escribe aquí...');
            ed.innerHTML = block.content || '';

            ed.addEventListener('input', () => {
                block.content = ed.innerHTML;
                scheduleSave();
            });
            ed.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addTextBlock(index);
                }
            });
            inner.appendChild(ed);
        } else if (block.type === 'joke') {
            const joke = block.jokeData;
            const jDiv = document.createElement('div');
            jDiv.className = 'joke-block-content';

            if (joke) {
                jDiv.innerHTML =
                    '<div class="joke-block-header">' +
                        '<span class="joke-block-category">' + escHtml(joke.categoria || 'Sin categoría') + '</span>' +
                        '<span class="joke-block-rating">' + starsHtml(joke.puntuacion) + '</span>' +
                        '<span class="joke-block-estado estado estado-' + joke.estado + '">' + estadoLabel(joke.estado) + '</span>' +
                    '</div>' +
                    '<div class="joke-block-text">' + escHtml(joke.texto) + '</div>' +
                    (joke.tags && joke.tags.length
                        ? '<div class="joke-block-tags">' + joke.tags.map(t => '<span class="tag">' + escHtml(t) + '</span>').join('') + '</div>'
                        : '');

                const realRow = document.createElement('div');
                realRow.className = 'joke-block-real-row';
                const realLabel = document.createElement('span');
                realLabel.className = 'real-rating-label';
                realLabel.textContent = 'Real:';
                realRow.appendChild(realLabel);

                for (let i = 1; i <= 5; i++) {
                    const star = document.createElement('span');
                    star.className = 'real-star';
                    star.dataset.val = i;
                    star.textContent = (block.estrellas_reales != null && i <= block.estrellas_reales) ? '★' : '☆';
                    star.addEventListener('click', () => {
                        block.estrellas_reales = block.estrellas_reales === i ? null : i;
                        syncRealStars(realRow, block.estrellas_reales);
                        scheduleSave();
                        if (chartOpen) renderChart();
                    });
                    realRow.appendChild(star);
                }

                jDiv.appendChild(realRow);

                const notasWrap = document.createElement('div');
                notasWrap.className = 'joke-block-notas-wrap';
                const notasTA = document.createElement('textarea');
                notasTA.className   = 'joke-block-notas';
                notasTA.placeholder = 'Notas post-show...';
                notasTA.value       = block.notas || '';
                notasTA.rows        = 2;
                notasTA.addEventListener('input', () => { block.notas = notasTA.value; scheduleSave(); });
                notasWrap.appendChild(notasTA);
                jDiv.appendChild(notasWrap);
            } else {
                jDiv.innerHTML = '<em style="color:var(--text-muted)">Chiste #' + block.joke_id + ' (no encontrado)</em>';
            }
            inner.appendChild(jDiv);
        } else if (block.type === 'video') {
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
                changeBtn.addEventListener('click', () => {
                    block.url = '';
                    renderDocument();
                });
                urlRow.appendChild(urlSpan);
                urlRow.appendChild(changeBtn);
                vDiv.appendChild(urlRow);
            } else {
                const urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.className = 'video-url-input';
                urlInput.placeholder = 'Pega la URL de YouTube...';
                urlInput.value = block.url;
                urlInput.addEventListener('input', () => {
                    block.url = urlInput.value.trim();
                    scheduleSave();
                });
                urlInput.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        if (youtubeId(block.url)) renderDocument();
                    }
                });
                urlInput.addEventListener('paste', e => {
                    setTimeout(() => {
                        block.url = urlInput.value.trim();
                        if (youtubeId(block.url)) renderDocument();
                        scheduleSave();
                    }, 0);
                });
                vDiv.appendChild(urlInput);
            }

            inner.appendChild(vDiv);
        }

        const actions = document.createElement('div');
        actions.className = 'block-actions';

        const upBtn = document.createElement('button');
        upBtn.className = 'block-move-btn';
        upBtn.innerHTML = '↑';
        upBtn.title = 'Subir';
        upBtn.disabled = index === 0;
        upBtn.addEventListener('click', () => {
            if (index === 0) return;
            const b = blocks.splice(index, 1)[0];
            blocks.splice(index - 1, 0, b);
            renderDocument();
            scheduleSave();
        });
        actions.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.className = 'block-move-btn';
        downBtn.innerHTML = '↓';
        downBtn.title = 'Bajar';
        downBtn.disabled = index >= blocks.length - 1;
        downBtn.addEventListener('click', () => {
            if (index >= blocks.length - 1) return;
            const b = blocks.splice(index, 1)[0];
            blocks.splice(index + 1, 0, b);
            renderDocument();
            scheduleSave();
        });
        actions.appendChild(downBtn);

        if (block.type === 'joke') {
            const editBtn = document.createElement('button');
            editBtn.className = 'block-edit-btn';
            editBtn.innerHTML = '✏';
            editBtn.title = 'Editar chiste';
            editBtn.addEventListener('click', () => {
                window.open(BASE_URL + '/chiste_form.php?id=' + block.joke_id, '_blank');
            });
            actions.appendChild(editBtn);
        }

        const addBtn = document.createElement('button');
        addBtn.className = 'block-add-below';
        addBtn.innerHTML = '+';
        addBtn.title = 'Añadir texto debajo';
        addBtn.addEventListener('click', () => addTextBlock(index));
        actions.appendChild(addBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'block-delete-btn';
        delBtn.innerHTML = '×';
        delBtn.title = 'Eliminar bloque';
        delBtn.addEventListener('click', () => {
            if (block.type === 'joke' && !confirm('¿Eliminar este chiste del show?')) return;
            blocks.splice(index, 1);
            renderDocument();
            scheduleSave();
        });
        actions.appendChild(delBtn);

        div.appendChild(handle);
        div.appendChild(inner);
        div.appendChild(actions);

        div.draggable = true;

        let dragFromHandle = false;
        handle.addEventListener('mousedown', () => { dragFromHandle = true; });
        div.addEventListener('dragend',   () => { dragFromHandle = false; });

        div.addEventListener('dragstart', e => {
            if (!dragFromHandle) {
                e.preventDefault();
                return;
            }
            dragFromHandle = false;
            e.dataTransfer.setData('text/block-source', 'document');
            e.dataTransfer.setData('text/block-id', block.id);
            div.classList.add('dragging');
        });
        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            clearDropIndicators();
        });

        div.addEventListener('dragover', e => {
            const source = e.dataTransfer.types.includes('text/block-source');
            if (!source) return;
            e.preventDefault();
            clearDropIndicators();
            const rect  = div.getBoundingClientRect();
            const above = e.clientY < rect.top + rect.height / 2;
            div.classList.add(above ? 'drop-above' : 'drop-below');
        });
        div.addEventListener('dragleave', () => clearDropIndicators());

        div.addEventListener('drop', e => {
            e.preventDefault();
            const above  = div.classList.contains('drop-above');
            clearDropIndicators();

            const source = e.dataTransfer.getData('text/block-source');

            if (source === 'document') {
                const draggedId    = e.dataTransfer.getData('text/block-id');
                const draggedIdx   = blocks.findIndex(b => b.id === draggedId);
                if (draggedIdx === -1) return;
                const [removed]    = blocks.splice(draggedIdx, 1);
                const targetIdx    = blocks.findIndex(b => b.id === block.id);
                const insertAt     = above ? targetIdx : targetIdx + 1;
                blocks.splice(insertAt, 0, removed);
            } else if (source === 'sidebar') {
                const jokeId   = e.dataTransfer.getData('text/joke-id');
                const joke     = allJokes.find(j => j.id === jokeId);
                const newBlock = { id: genId(), type: 'joke', joke_id: jokeId, jokeData: joke || null };
                const targetIdx = blocks.findIndex(b => b.id === block.id);
                const insertAt  = above ? targetIdx : targetIdx + 1;
                blocks.splice(insertAt, 0, newBlock);
            }

            renderDocument();
            scheduleSave();
        });

        return div;
    }

    function clearDropIndicators() {
        docBlocks.querySelectorAll('.drop-above, .drop-below').forEach(el => {
            el.classList.remove('drop-above', 'drop-below');
        });
    }

    docBlocks.addEventListener('dragover', e => {
        if (blocks.length > 0) return;
        e.preventDefault();
        docEmpty.style.borderColor = 'var(--accent)';
    });
    docBlocks.addEventListener('dragleave', () => {
        docEmpty.style.borderColor = '';
    });
    docBlocks.addEventListener('drop', e => {
        if (blocks.length > 0) return;
        e.preventDefault();
        docEmpty.style.borderColor = '';
        const source = e.dataTransfer.getData('text/block-source');
        if (source === 'sidebar') {
            const jokeId = e.dataTransfer.getData('text/joke-id');
            const joke   = allJokes.find(j => j.id === jokeId);
            blocks.push({ id: genId(), type: 'joke', joke_id: jokeId, jokeData: joke || null });
            renderDocument();
            scheduleSave();
        }
    });

    function addVideoBlock(afterIndex) {
        const block = { id: genId(), type: 'video', url: '', titulo: '' };
        if (afterIndex === undefined || afterIndex >= blocks.length - 1) {
            blocks.push(block);
        } else {
            blocks.splice(afterIndex + 1, 0, block);
        }
        renderDocument();
        scheduleSave();
        requestAnimationFrame(() => {
            const el = docBlocks.querySelector('[data-block-id="' + block.id + '"] .video-url-input');
            if (el) el.focus();
        });
    }

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

    addFirstText?.addEventListener('click', () => addTextBlock());
    addTextBottom.addEventListener('click', () => addTextBlock());
    document.getElementById('add-video-bottom')?.addEventListener('click', () => addVideoBlock());

    function scheduleSave() {
        if (saveTimer) clearTimeout(saveTimer);
        setSaveStatus('saving', 'Guardando...');
        saveTimer = setTimeout(save, 1500);
    }

    const totalDurationEl = document.getElementById('total-duration');
    const metaFecha  = document.getElementById('show-fecha');
    const metaSala   = document.getElementById('show-sala');
    const metaCiudad = document.getElementById('show-ciudad');

    function updateTotalDuration() {
        if (!totalDurationEl) return;
        const total = blocks.reduce((sum, b) => {
            if (b.type !== 'joke' || !b.jokeData) return sum;
            return sum + (b.jokeData.duracion || 0);
        }, 0);
        if (total === 0) { totalDurationEl.textContent = ''; return; }
        const m = Math.floor(total / 60);
        const s = total % 60;
        totalDurationEl.textContent = m + 'min' + (s ? ' ' + s + 's' : '');
    }

    function getMeta() {
        return {
            fecha_show: metaFecha  ? metaFecha.value  : '',
            sala:       metaSala   ? metaSala.value   : '',
            ciudad:     metaCiudad ? metaCiudad.value : '',
        };
    }

    [metaFecha, metaSala, metaCiudad].forEach(el => {
        if (el) el.addEventListener('input', scheduleSave);
    });

    async function save() {
        const titulo    = titleInput.value.trim() || 'Show sin título';
        const contenido = { blocks: blocks.map(serializeBlock) };
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
                    setSaveStatus('saved', '✓ Guardado');
                    return;
                }
            }
            if (!res.ok) throw new Error('Error ' + res.status);
            setSaveStatus('saved', '✓ Guardado');
        } catch (e) {
            setSaveStatus('error', 'Error al guardar');
        }
    }

    function serializeBlock(b) {
        if (b.type === 'text')  return { id: b.id, type: 'text',  content: b.content || '' };
        if (b.type === 'joke')  return { id: b.id, type: 'joke',  joke_id: b.joke_id, estrellas_reales: b.estrellas_reales ?? null, notas: b.notas || '' };
        if (b.type === 'video') return { id: b.id, type: 'video', url: b.url || '' };
        return b;
    }

    function youtubeId(url) {
        if (!url) return null;
        const patterns = [
            /[?&]v=([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /embed\/([a-zA-Z0-9_-]{11})/,
            /shorts\/([a-zA-Z0-9_-]{11})/,
        ];
        for (const re of patterns) {
            const m = url.match(re);
            if (m) return m[1];
        }
        return null;
    }

    function syncRealStars(container, val) {
        container.querySelectorAll('.real-star').forEach((s, i) => {
            s.textContent = (val != null && i + 1 <= val) ? '★' : '☆';
        });
    }

    function setSaveStatus(cls, text) {
        saveStatus.className = 'save-status ' + cls;
        saveStatus.textContent = text;
    }

    saveBtn.addEventListener('click', () => {
        if (saveTimer) clearTimeout(saveTimer);
        save();
    });

    const cloneBtn = document.getElementById('clone-show-btn');
    if (cloneBtn) {
        cloneBtn.addEventListener('click', async () => {
            if (!showId) return;
            cloneBtn.disabled = true;
            try {
                const res  = await fetch(BASE_URL + '/api/shows.php?action=clone&id=' + showId, { method: 'POST' });
                const data = await res.json();
                if (data.id) window.open(BASE_URL + '/show_editor.php?id=' + data.id, '_blank');
            } catch(_) {
                alert('Error al clonar el show');
            } finally {
                cloneBtn.disabled = false;
            }
        });
    }

    const exportTextBtn = document.getElementById('export-text-btn');
    if (exportTextBtn) {
        exportTextBtn.addEventListener('click', () => {
            const titulo = titleInput.value.trim() || 'Show';
            const meta   = getMeta();
            const lines  = [titulo];
            if (meta.fecha_show || meta.sala || meta.ciudad) {
                lines.push([meta.fecha_show, meta.sala, meta.ciudad].filter(Boolean).join(' · '));
            }
            lines.push('');

            let totalSec = 0;
            blocks.forEach((b, i) => {
                if (b.type === 'text') {
                    const txt = b.content.replace(/<[^>]+>/g, '').trim();
                    if (txt) lines.push('--- ' + txt + ' ---');
                } else if (b.type === 'joke' && b.jokeData) {
                    const dur = b.jokeData.duracion;
                    const durStr = dur ? ' [' + Math.floor(dur/60) + 'min' + (dur%60 ? dur%60+'s' : '') + ']' : '';
                    totalSec += dur || 0;
                    const stars = b.jokeData.puntuacion != null ? ' (' + '★'.repeat(b.jokeData.puntuacion) + ')' : '';
                    lines.push((i + 1) + '. ' + b.jokeData.texto.slice(0, 80) + (b.jokeData.texto.length > 80 ? '…' : '') + durStr + stars);
                }
            });

            if (totalSec) {
                lines.push('');
                lines.push('Total: ' + Math.floor(totalSec/60) + 'min' + (totalSec%60 ? ' ' + totalSec%60 + 's' : ''));
            }

            const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = titulo.replace(/[^a-z0-9áéíóúñ ]/gi, '_') + '.txt';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    titleInput.addEventListener('input', scheduleSave);

    window.addEventListener('beforeunload', () => {
        if (saveTimer) { clearTimeout(saveTimer); save(); }
    });

    function genId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function escHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function starsHtml(n) {
        if (n == null) return '';
        let s = '';
        for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
        return s;
    }

    function estadoLabel(e) {
        return { borrador: 'Borrador', desarrollo: 'En desarrollo', probado: 'Probado', rotacion: 'En rotación', retirado: 'Retirado' }[e] || e;
    }

    const chartPanel  = document.getElementById('chart-panel');
    const chartCanvas = document.getElementById('show-chart');
    const chartToggle = document.getElementById('chart-toggle');

    const jokePopupOverlay = document.getElementById('joke-popup-overlay');
    const jokePopupClose   = document.getElementById('joke-popup-close');

    function openJokePopup(joke) {
        document.getElementById('joke-popup-cat').textContent    = joke.categoria || '—';
        document.getElementById('joke-popup-stars').textContent  = joke.puntuacion != null ? '★'.repeat(joke.puntuacion) + '☆'.repeat(5 - joke.puntuacion) : '';
        const estadoEl = document.getElementById('joke-popup-estado');
        estadoEl.textContent  = estadoLabel(joke.estado);
        estadoEl.className    = 'estado estado-' + joke.estado;
        document.getElementById('joke-popup-texto').textContent  = joke.texto;
        const tagsEl = document.getElementById('joke-popup-tags');
        tagsEl.innerHTML = (joke.tags || []).map(t => '<span class="tag">' + escHtml(t) + '</span>').join('');
        const durEl = document.getElementById('joke-popup-dur');
        if (durEl) {
            const d = joke.duracion;
            durEl.textContent = d ? Math.floor(d/60) + 'min' + (d%60 ? ' ' + d%60 + 's' : '') : '';
            durEl.style.display = d ? '' : 'none';
        }
        const editLink = document.getElementById('joke-popup-edit');
        if (editLink) editLink.href = BASE_URL + '/chiste_form.php?id=' + joke.id;
        jokePopupOverlay.style.zIndex = '600';
        jokePopupOverlay.style.display = 'flex';
    }

    jokePopupClose.addEventListener('click', () => { jokePopupOverlay.style.display = 'none'; });
    jokePopupOverlay.addEventListener('click', e => { if (e.target === jokePopupOverlay) jokePopupOverlay.style.display = 'none'; });

    function getStyle(v) {
        return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    }

    function renderChart() {
        const jokeBlocks = blocks.filter(b => b.type === 'joke' && b.jokeData);
        const labels = jokeBlocks.map(b => {
            const t = b.jokeData.texto || '';
            return t.length > 22 ? t.slice(0, 22) + '…' : t;
        });
        const data = jokeBlocks.map(b =>
            b.jokeData.puntuacion != null ? b.jokeData.puntuacion : null
        );

        const accent    = getStyle('--accent');
        const ok        = getStyle('--ok');
        const textMuted = getStyle('--text-muted');
        const border    = getStyle('--border');

        const dataReal = jokeBlocks.map(b => b.estrellas_reales != null ? b.estrellas_reales : null);
        const hasReal  = dataReal.some(v => v != null);

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Esperado',
                        data,
                        spanGaps: false,
                        borderColor: accent,
                        backgroundColor: accent + '22',
                        pointBackgroundColor: accent,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.35,
                        fill: true,
                    },
                    {
                        label: 'Real',
                        data: dataReal,
                        spanGaps: false,
                        borderColor: ok,
                        backgroundColor: ok + '22',
                        pointBackgroundColor: ok,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        tension: 0.35,
                        fill: false,
                        hidden: !hasReal,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (e, elements) => {
                    if (!elements.length) return;
                    const idx  = elements[0].index;
                    const joke = jokeBlocks[idx]?.jokeData;
                    if (joke) openJokePopup(joke);
                },
                onHover: (e, elements) => {
                    chartCanvas.style.cursor = elements.length ? 'pointer' : 'default';
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: textMuted, boxWidth: 12, font: { size: 11 } },
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.raw != null ? '★'.repeat(ctx.raw) + '☆'.repeat(5 - ctx.raw) : 'Sin puntuación',
                        },
                    },
                },
                scales: {
                    y: {
                        min: 0, max: 5.8,
                        ticks: { display: false },
                        grid: { color: border },
                    },
                    x: {
                        ticks: { color: textMuted, maxRotation: 30 },
                        grid: { color: border },
                    },
                },
            },
        });
    }

    const chartOverlay = document.getElementById('chart-overlay');

    function closeChart() {
        chartOpen = false;
        chartPanel.classList.remove('open');
        chartToggle.classList.remove('active');
        chartPanel.style.height = '';
        if (chartOverlay) chartOverlay.classList.remove('active');
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    }

    chartToggle.addEventListener('click', () => {
        chartOpen = !chartOpen;
        chartPanel.classList.toggle('open', chartOpen);
        chartToggle.classList.toggle('active', chartOpen);
        if (chartOverlay) chartOverlay.classList.toggle('active', chartOpen);
        if (chartOpen) {
            chartPanel.style.height = Math.round(window.innerHeight * 0.5) + 'px';
            requestAnimationFrame(renderChart);
        } else {
            closeChart();
        }
    });

    if (chartOverlay) chartOverlay.addEventListener('click', closeChart);

    const chartPanelClose = document.getElementById('chart-panel-close');
    if (chartPanelClose) {
        chartPanelClose.addEventListener('click', closeChart);
        chartPanelClose.addEventListener('touchend', function(e) {
            e.preventDefault();
            closeChart();
        });
    }

    const STEP = Math.round(window.innerHeight * 0.15);
    const minH = 160;
    const maxH = () => Math.round(window.innerHeight * 0.92);

    function currentPanelHeight() {
        return chartPanel.offsetHeight || Math.round(window.innerHeight * 0.75);
    }

    function setPanelHeight(h) {
        const clamped = Math.max(minH, Math.min(maxH(), h));
        chartPanel.style.height = clamped + 'px';
        if (chartInstance) chartInstance.resize();
    }

    const growBtn   = document.getElementById('chart-panel-grow');
    const shrinkBtn = document.getElementById('chart-panel-shrink');
    if (growBtn)   growBtn.addEventListener('click',   () => setPanelHeight(currentPanelHeight() + STEP));
    if (shrinkBtn) shrinkBtn.addEventListener('click', () => setPanelHeight(currentPanelHeight() - STEP));

    init();
}());
