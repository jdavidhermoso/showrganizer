(function () {
    'use strict';

    let blocks    = [];
    let allJokes  = [];
    let showId    = SHOW_ID;
    let saveTimer = null;

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
            } else {
                jDiv.innerHTML = '<em style="color:var(--text-muted)">Chiste #' + block.joke_id + ' (no encontrado)</em>';
            }
            inner.appendChild(jDiv);
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
            blocks.splice(index, 1);
            renderDocument();
            scheduleSave();
        });
        actions.appendChild(delBtn);

        div.appendChild(handle);
        div.appendChild(inner);
        div.appendChild(actions);

        div.draggable = true;

        div.addEventListener('dragstart', e => {
            if (!e.target.classList.contains('block-handle')) {
                e.preventDefault();
                return;
            }
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

    function scheduleSave() {
        if (saveTimer) clearTimeout(saveTimer);
        setSaveStatus('saving', 'Guardando...');
        saveTimer = setTimeout(save, 1500);
    }

    async function save() {
        const titulo = titleInput.value.trim() || 'Show sin título';
        const contenido = { blocks: blocks.map(serializeBlock) };

        try {
            let res;
            if (showId) {
                res = await fetch(BASE_URL + '/api/shows.php?id=' + showId, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, contenido }),
                });
            } else {
                res = await fetch(BASE_URL + '/api/shows.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, contenido }),
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
        if (b.type === 'text')  return { id: b.id, type: 'text', content: b.content || '' };
        if (b.type === 'joke')  return { id: b.id, type: 'joke', joke_id: b.joke_id };
        return b;
    }

    function setSaveStatus(cls, text) {
        saveStatus.className = 'save-status ' + cls;
        saveStatus.textContent = text;
    }

    saveBtn.addEventListener('click', () => {
        if (saveTimer) clearTimeout(saveTimer);
        save();
    });

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
        return { borrador: 'Borrador', desarrollo: 'En desarrollo', probado: 'Probado', retirado: 'Retirado' }[e] || e;
    }

    init();
}());
