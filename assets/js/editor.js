(function () {
    'use strict';

    var L = window.LANG || {};

    let blocks    = [];
    let allJokes  = [];
    let allBloques = [];
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
    const sidebarList      = document.getElementById('sidebar-jokes-list');
    const sidebarSearch    = document.getElementById('sidebar-search');
    const sidebarEstado    = document.getElementById('sidebar-estado');
    const sidebarBloques   = document.getElementById('sidebar-bloques-list');
    const panelChistes     = document.getElementById('sidebar-panel-chistes');
    const panelBloques     = document.getElementById('sidebar-panel-bloques');

    async function init() {
        await Promise.all([loadJokes(), loadBloques()]);
        if (SHOW_DATA && SHOW_DATA.blocks) {
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
        renderDocument();
        renderSidebar(allJokes);
        renderBloquesSidebar();
        initTabs();
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

    function initTabs() {
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const which = tab.dataset.tab;
                panelChistes.style.display = which === 'chistes' ? '' : 'none';
                panelBloques.style.display = which === 'bloques' ? '' : 'none';
            });
        });
    }

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
            if (typeof closeSidebar === 'function') closeSidebar();
        });

        return div;
    }

    function addBloqueBlock(bloque, insertAt) {
        const newBlock = { id: genId(), type: 'bloque', bloque_id: bloque.id, bloqueData: bloque };
        if (insertAt === undefined || insertAt >= blocks.length) {
            blocks.push(newBlock);
        } else {
            blocks.splice(insertAt, 0, newBlock);
        }
        renderDocument();
        scheduleSave();
    }

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
                        '<span class="joke-block-category">' + escHtml(joke.categoria || (L.no_category || '—')) + '</span>' +
                        '<span class="joke-block-rating">' + starsHtml(joke.puntuacion) + '</span>' +
                        '<span class="joke-block-estado estado estado-' + joke.estado + '">' + estadoLabel(joke.estado) + '</span>' +
                        (joke.duracion ? '<strong class="chiste-dur">' + durStr(joke.duracion) + '</strong>' : '') +
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
                jDiv.innerHTML = '<em style="color:var(--text-muted)">#' + block.joke_id + ' (' + (L.not_in_shows || 'not found') + ')</em>';
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
        } else if (block.type === 'bloque') {
            const bloque = block.bloqueData;
            const bDiv = document.createElement('div');
            bDiv.className = 'bloque-block-content';

            if (bloque) {
                const header = document.createElement('div');
                header.className = 'bloque-block-header';
                const bloqueTotalSec = (bloque.chistes || []).reduce((sum, jid) => {
                    const j = allJokes.find(x => x.id === jid);
                    return sum + (j && j.duracion ? j.duracion : 0);
                }, 0);
                header.innerHTML =
                    '<span class="bloque-block-icon">📦</span>' +
                    '<span class="bloque-block-title">' + escHtml(bloque.titulo) + '</span>' +
                    (bloqueTotalSec ? '<strong class="chiste-dur">' + durStr(bloqueTotalSec) + '</strong>' : '') +
                    (bloque.descripcion ? '<span class="bloque-block-desc">' + escHtml(bloque.descripcion) + '</span>' : '') +
                    '<a class="btn btn-ghost btn-sm bloque-block-edit-link" href="' + BASE_URL + '/bloque_editor.php?id=' + escHtml(bloque.id) + '" target="_blank">' + (L.edit || 'Editar') + ' ↗</a>';
                bDiv.appendChild(header);

                const list = document.createElement('ol');
                list.className = 'bloque-block-joke-list';
                (bloque.chistes || []).forEach(jokeId => {
                    const joke = allJokes.find(j => j.id === jokeId);
                    const li   = document.createElement('li');
                    li.className = 'bloque-block-joke-item';
                    li.innerHTML = joke
                        ? parseBold(joke.texto.length > 90 ? joke.texto.slice(0, 90) + '…' : joke.texto)
                        : '<em style="color:var(--text-muted)">' + escHtml(jokeId) + '</em>';
                    list.appendChild(li);
                });
                bDiv.appendChild(list);
            } else {
                bDiv.innerHTML = '<em style="color:var(--text-muted)">' + (L.bloque_not_found || 'Bloque eliminado') + '</em>';
            }
            inner.appendChild(bDiv);
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
            if (block.type === 'joke' && !confirm(L.confirm_del_from_show || 'Remove this joke from the show?')) return;
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
            } else if (source === 'bloque') {
                const bloqueId = e.dataTransfer.getData('text/bloque-id');
                const bloque   = allBloques.find(b => b.id === bloqueId);
                if (bloque) {
                    const targetIdx = blocks.findIndex(b => b.id === block.id);
                    const insertAt  = above ? targetIdx : targetIdx + 1;
                    addBloqueBlock(bloque, insertAt);
                    return;
                }
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
        } else if (source === 'bloque') {
            const bloqueId = e.dataTransfer.getData('text/bloque-id');
            const bloque   = allBloques.find(b => b.id === bloqueId);
            if (bloque) addBloqueBlock(bloque);
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
        setSaveStatus('saving', 'composer_saving');
        saveTimer = setTimeout(save, 1500);
    }

    const totalDurationEl = document.getElementById('total-duration');
    const metaFecha  = document.getElementById('show-fecha');
    const metaSala   = document.getElementById('show-sala');
    const metaCiudad = document.getElementById('show-ciudad');

    function updateTotalDuration() {
        if (!totalDurationEl) return;
        const total = getFlatJokeBlocks().reduce((sum, item) => sum + (item.jokeData.duracion || 0), 0);
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

    // Returns a flat list of {jokeData, estrellas_reales} for all joke-producing blocks
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

    function setSaveStatus(cls, key) {
        saveStatus.className = 'save-status ' + cls;
        saveStatus.textContent = L[key] || key;
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
            let jokeNum  = 0;
            blocks.forEach(b => {
                if (b.type === 'text') {
                    const txt = b.content.replace(/<[^>]+>/g, '').trim();
                    if (txt) lines.push('--- ' + txt + ' ---');
                } else if (b.type === 'joke' && b.jokeData) {
                    jokeNum++;
                    const joke = b.jokeData;
                    const dur = joke.duracion;
                    const durStr = dur ? ' [' + Math.floor(dur/60) + 'min' + (dur%60 ? dur%60+'s' : '') + ']' : '';
                    totalSec += dur || 0;
                    const stars = joke.puntuacion != null ? ' (' + '★'.repeat(joke.puntuacion) + ')' : '';
                    lines.push(jokeNum + '. ' + joke.texto.replace(/\*\*/g,'').slice(0, 80) + (joke.texto.length > 80 ? '…' : '') + durStr + stars);
                } else if (b.type === 'bloque' && b.bloqueData) {
                    lines.push('--- ' + b.bloqueData.titulo + ' ---');
                    (b.bloqueData.chistes || []).forEach(jokeId => {
                        const joke = allJokes.find(j => j.id === jokeId);
                        if (!joke) return;
                        jokeNum++;
                        const dur = joke.duracion;
                        const durStr = dur ? ' [' + Math.floor(dur/60) + 'min' + (dur%60 ? dur%60+'s' : '') + ']' : '';
                        totalSec += dur || 0;
                        const stars = joke.puntuacion != null ? ' (' + '★'.repeat(joke.puntuacion) + ')' : '';
                        lines.push(jokeNum + '. ' + joke.texto.replace(/\*\*/g,'').slice(0, 80) + (joke.texto.length > 80 ? '…' : '') + durStr + stars);
                    });
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

    function durStr(sec) {
        if (!sec) return '';
        const m = Math.floor(sec / 60), s = sec % 60;
        return m + 'min' + (s ? s + 's' : '');
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

    function parseBold(text) {
        return escHtml(text)
            .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
            .replace(/\n?\[PAUSA\]\n?/g, '<span class="pausa-tag">— PAUSA —</span>');
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
        // Build flat joke list AND track bloque boundary indices in one pass
        const jokeBlocks       = [];
        const bloqueEndIndices = []; // index of the last joke of each non-final bloque

        blocks.forEach(b => {
            if (b.type === 'joke' && b.jokeData) {
                jokeBlocks.push({ jokeData: b.jokeData, estrellas_reales: b.estrellas_reales ?? null });
            } else if (b.type === 'bloque' && b.bloqueData) {
                const start = jokeBlocks.length;
                (b.bloqueData.chistes || []).forEach(jokeId => {
                    const joke = allJokes.find(j => j.id === jokeId);
                    if (joke) jokeBlocks.push({ jokeData: joke, estrellas_reales: null });
                });
                if (jokeBlocks.length > start) {
                    bloqueEndIndices.push(jokeBlocks.length - 1);
                }
            }
        });

        // Don't draw a separator after the very last joke — nothing to separate
        const separatorIndices = bloqueEndIndices.filter(idx => idx < jokeBlocks.length - 1);

        // Cumulative start time for each joke (seconds)
        let _cum = 0;
        const cumTimes = jokeBlocks.map(item => {
            const t = _cum;
            _cum += item.jokeData.duracion || 0;
            return t;
        });

        const labels = jokeBlocks.map((item, i) => {
            const sec   = cumTimes[i];
            const m     = Math.floor(sec / 60);
            const s     = sec % 60;
            const time  = m + ':' + String(s).padStart(2, '0');
            const raw   = item.jokeData.texto.replace(/\*\*/g, '');
            const short = raw.length > 20 ? raw.slice(0, 20) + '…' : raw;
            return [time, short];
        });
        const data     = jokeBlocks.map(item =>
            item.jokeData.puntuacion != null ? item.jokeData.puntuacion : null
        );
        const dataReal = jokeBlocks.map(item =>
            item.estrellas_reales != null ? item.estrellas_reales : null
        );
        const hasReal  = dataReal.some(v => v != null);

        const accent    = getStyle('--accent');
        const ok        = getStyle('--ok');
        const textMuted = getStyle('--text-muted');
        const border    = getStyle('--border');

        // Inline plugin: dashed vertical lines between bloques
        const bloqueSeparatorPlugin = {
            id: 'bloqueSeparators',
            afterDraw(chart) {
                if (!separatorIndices.length) return;
                const ctx   = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                ctx.save();
                ctx.strokeStyle = textMuted || 'rgba(150,150,150,0.7)';
                ctx.lineWidth   = 1.5;
                ctx.setLineDash([5, 4]);
                separatorIndices.forEach(idx => {
                    const x1 = xAxis.getPixelForValue(idx);
                    const x2 = xAxis.getPixelForValue(idx + 1);
                    const x  = (x1 + x2) / 2;
                    ctx.beginPath();
                    ctx.moveTo(x, yAxis.top);
                    ctx.lineTo(x, yAxis.bottom);
                    ctx.stroke();
                });
                ctx.restore();
            },
        };

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(chartCanvas, {
            type: 'line',
            plugins: [bloqueSeparatorPlugin],
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
                            title: ctx => {
                                const item = jokeBlocks[ctx[0]?.dataIndex];
                                const t = (item?.jokeData?.texto || '').replace(/\*\*/g, '');
                                return t.length > 45 ? t.slice(0, 45) + '…' : t;
                            },
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

    // ── Show Diagram ──────────────────────────────────────────
    const diagramOverlay   = document.getElementById('diagram-overlay');
    const diagramBody      = document.getElementById('diagram-body');
    const diagramShowTitle = document.getElementById('diagram-show-title');
    const diagramOpenBtn   = document.getElementById('diagram-btn');
    const diagramCloseBtn  = document.getElementById('diagram-close');
    const diagramPrintBtn  = document.getElementById('diagram-print');

    function openDiagram() {
        diagramShowTitle.textContent = document.getElementById('show-titulo')?.value || '';
        diagramBody.innerHTML = buildDiagramHTML();
        diagramOverlay.classList.add('open');
    }

    function closeDiagram() {
        diagramOverlay.classList.remove('open');
    }

    function buildDiagramHTML() {
        if (!blocks.length) return '<p style="color:var(--text-muted);padding:1rem 0">' + (L.player_no_jokes || 'No hay bloques') + '</p>';

        let html    = '';
        let cumSec  = 0;

        blocks.forEach(block => {
            const timeStr = fmtTime(cumSec);

            if (block.type === 'joke') {
                const joke = block.jokeData;
                if (!joke) return;
                const dur  = joke.duracion || 0;
                const prev = joke.texto.replace(/\*\*/g, '').replace(/\[PAUSA\]/g, '').slice(0, 120);
                const meta = [joke.categoria, starsHtml(joke.puntuacion)].filter(Boolean).join(' · ');
                html += row('joke', timeStr,
                    '🎤',
                    '<span class="diagram-preview">' + escHtml(prev) + (joke.texto.length > 120 ? '…' : '') + '</span>' +
                    (meta ? '<div class="diagram-meta">' + escHtml(joke.categoria || '') + (joke.puntuacion ? ' · ' + starsHtml(joke.puntuacion) : '') + '</div>' : ''),
                    dur ? durStr(dur) : '');
                cumSec += dur;

            } else if (block.type === 'bloque') {
                const bloque = block.bloqueData;
                if (!bloque) return;
                let bloqueSec = 0;
                let jokesHtml = '';
                (bloque.chistes || []).forEach(jid => {
                    const j = allJokes.find(x => x.id === jid);
                    if (!j) return;
                    bloqueSec += j.duracion || 0;
                    const prev = j.texto.replace(/\*\*/g, '').replace(/\[PAUSA\]/g, '').slice(0, 80);
                    jokesHtml += '<li>' + escHtml(prev) + (j.texto.length > 80 ? '…' : '') +
                        (j.duracion ? ' <strong style="color:var(--accent);font-size:0.7rem">' + durStr(j.duracion) + '</strong>' : '') + '</li>';
                });
                html += row('bloque', timeStr,
                    '📦',
                    '<span class="diagram-preview">' + escHtml(bloque.titulo) + '</span>' +
                    (bloque.descripcion ? '<div class="diagram-meta">' + escHtml(bloque.descripcion) + '</div>' : '') +
                    (jokesHtml ? '<ol class="diagram-bloque-jokes">' + jokesHtml + '</ol>' : ''),
                    bloqueSec ? durStr(bloqueSec) : '');
                cumSec += bloqueSec;

            } else if (block.type === 'text') {
                const raw = (block.content || '').replace(/<[^>]+>/g, '').slice(0, 80);
                if (!raw.trim()) return;
                html += row('text', timeStr, '📝', '<span class="diagram-preview">' + escHtml(raw) + (raw.length >= 80 ? '…' : '') + '</span>', '');

            } else if (block.type === 'video') {
                html += row('video', timeStr, '▶', '<span class="diagram-preview">' + escHtml(block.url || 'Video') + '</span>', '');
            }
        });

        const totalHtml = cumSec
            ? '<div style="text-align:right;font-size:0.78rem;color:var(--text-muted);padding-top:0.6rem">Total: <strong style="color:var(--accent)">' + durStr(cumSec) + '</strong></div>'
            : '';
        return html + totalHtml;
    }

    function row(type, time, icon, content, dur) {
        return '<div class="diagram-row diagram-row-' + type + '">' +
            '<span class="diagram-time">' + escHtml(time) + '</span>' +
            '<span class="diagram-icon">' + icon + '</span>' +
            '<div class="diagram-content">' + content + '</div>' +
            '<span class="diagram-dur">' + escHtml(dur) + '</span>' +
        '</div>';
    }

    function fmtTime(sec) {
        const m = Math.floor(sec / 60), s = sec % 60;
        return m + ':' + String(s).padStart(2, '0');
    }

    if (diagramOpenBtn)  diagramOpenBtn.addEventListener('click', openDiagram);
    if (diagramCloseBtn) diagramCloseBtn.addEventListener('click', closeDiagram);
    if (diagramPrintBtn) diagramPrintBtn.addEventListener('click', () => {
        const w = window.open('', '_blank');
        const title = document.getElementById('show-titulo')?.value || '';
        w.document.write('<html><head><title>' + title + '</title><style>' +
            'body{font-family:sans-serif;font-size:11pt;padding:1.5cm 2cm;max-width:700px;margin:0 auto}' +
            '.diagram-row{display:grid;grid-template-columns:3.2rem 1.4rem 1fr auto;gap:0 0.5rem;padding:0.45rem 0;border-bottom:1px solid #e0e0e0}' +
            '.diagram-row:last-child{border-bottom:none}' +
            '.diagram-time{font-size:9pt;color:#888;text-align:right;padding-top:2px}' +
            '.diagram-icon{text-align:center}' +
            '.diagram-preview{font-size:10pt}' +
            '.diagram-row-bloque .diagram-preview{font-weight:700;text-transform:uppercase;letter-spacing:0.04em;font-size:9pt}' +
            '.diagram-meta{font-size:8pt;color:#888;margin-top:2px}' +
            '.diagram-bloque-jokes{margin:4px 0 0 4px;padding-left:14px;font-size:9pt;color:#555}' +
            '.diagram-bloque-jokes li{margin-bottom:2px}' +
            '.diagram-dur{font-size:9pt;font-weight:700;color:#555;white-space:nowrap;padding-top:2px}' +
            '.diagram-row-text .diagram-preview{font-style:italic;color:#888}' +
            '</style></head><body>' +
            '<h2 style="margin-bottom:1rem;font-size:14pt">' + title + '</h2>' +
            diagramBody.innerHTML +
            '</body></html>');
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 400);
    });
    diagramOverlay.addEventListener('click', e => { if (e.target === diagramOverlay) closeDiagram(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && diagramOverlay?.classList.contains('open')) closeDiagram();
    });
    // ─────────────────────────────────────────────────────────

    // ── Joke Player ───────────────────────────────────────────
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
    const playerOpenBtn  = document.getElementById('player-btn');

    let playerJokes   = [];
    let playerIndex   = 0;
    let playerPlaying = false;
    let playerRAF     = null;
    let playerStart   = null;
    let playerDurMs   = null;

    function openPlayer() {
        playerJokes = getFlatJokeBlocks();
        if (!playerJokes.length) {
            alert(L.player_no_jokes || 'No jokes in this show');
            return;
        }
        playerIndex   = 0;
        playerPlaying = false;
        updatePlayBtn();
        renderPlayerSlide();
        playerOverlay.classList.add('open');
    }

    function closePlayer() {
        stopProgress();
        playerPlaying = false;
        playerOverlay.classList.remove('open');
    }

    function renderPlayerSlide() {
        const item = playerJokes[playerIndex];
        const joke = item.jokeData;

        playerPosEl.textContent  = (playerIndex + 1) + ' / ' + playerJokes.length;
        playerCatEl.textContent  = joke.categoria || '';
        playerDurEl.textContent  = joke.duracion ? durStr(joke.duracion) : '';
        playerTextEl.innerHTML   = parseBold(joke.texto);
        playerBar.style.width    = '0%';
        playerBar.style.transition = 'none';

        playerPrevBtn.disabled = playerIndex === 0;
        playerNextBtn.disabled = playerIndex === playerJokes.length - 1;
    }

    function playerGoNext() {
        stopProgress();
        if (playerIndex < playerJokes.length - 1) {
            playerIndex++;
            renderPlayerSlide();
            if (playerPlaying) startProgress();
        } else {
            playerPlaying = false;
            updatePlayBtn();
        }
    }

    function playerGoPrev() {
        stopProgress();
        if (playerIndex > 0) {
            playerIndex--;
            renderPlayerSlide();
            if (playerPlaying) startProgress();
        }
    }

    function togglePlay() {
        playerPlaying = !playerPlaying;
        updatePlayBtn();
        if (playerPlaying) {
            startProgress();
        } else {
            stopProgress();
        }
    }

    function updatePlayBtn() {
        playerPlayBtn.textContent = playerPlaying ? '⏸' : '▶';
    }

    function startProgress() {
        const dur = playerJokes[playerIndex]?.jokeData?.duracion;
        if (!dur) return; // no duration — stay on slide until manual advance
        playerDurMs = dur * 1000;
        playerStart = Date.now();

        function tick() {
            const pct = Math.min((Date.now() - playerStart) / playerDurMs * 100, 100);
            playerBar.style.width = pct + '%';
            if (pct < 100) {
                playerRAF = requestAnimationFrame(tick);
            } else {
                playerGoNext();
            }
        }
        playerRAF = requestAnimationFrame(tick);
    }

    function stopProgress() {
        cancelAnimationFrame(playerRAF);
        playerRAF = null;
    }

    if (playerOpenBtn)  playerOpenBtn.addEventListener('click', openPlayer);
    if (playerCloseBtn) playerCloseBtn.addEventListener('click', closePlayer);
    if (playerPrevBtn)  playerPrevBtn.addEventListener('click', playerGoPrev);
    if (playerNextBtn)  playerNextBtn.addEventListener('click', playerGoNext);
    if (playerPlayBtn)  playerPlayBtn.addEventListener('click', togglePlay);

    document.addEventListener('keydown', e => {
        if (!playerOverlay?.classList.contains('open')) return;
        if (e.key === 'Escape')                          { closePlayer(); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { playerGoNext(); }
        else if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { playerGoPrev(); }
        else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    });
    // ─────────────────────────────────────────────────────────

    init();
}());
