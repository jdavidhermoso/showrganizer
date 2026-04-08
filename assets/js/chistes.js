(function () {
    'use strict';

    let allJokes = [];

    const list    = document.getElementById('chistes-list');
    const count   = document.getElementById('chistes-count');
    const tpl     = document.getElementById('chiste-card-tpl');
    const fText   = document.getElementById('filter-text');
    const fEstado = document.getElementById('filter-estado');
    const fCat    = document.getElementById('filter-categoria');
    const fPun    = document.getElementById('filter-puntuacion');
    const fSort   = document.getElementById('filter-sort');
    const btnClr  = document.getElementById('filter-clear');

    async function load() {
        list.innerHTML = '<p style="color:var(--text-muted);padding:1rem">Cargando...</p>';
        try {
            const res  = await fetch(BASE_URL + '/api/chistes.php');
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (_) {
                list.innerHTML = '<p style="color:var(--danger)">Error del servidor:<br><pre style="font-size:0.75rem;overflow:auto;max-height:200px">' + text.replace(/</g,'&lt;') + '</pre></p>';
                return;
            }
            if (!res.ok) {
                list.innerHTML = '<p style="color:var(--danger)">Error ' + res.status + ': ' + (data.error || 'desconocido') + '</p>';
                return;
            }
            allJokes = Array.isArray(data) ? data : [];
            renderList(allJokes);
        } catch (e) {
            list.innerHTML = '<p style="color:var(--danger)">Error de red: ' + e.message + '</p>';
        }
    }

    function renderList(jokes) {
        list.innerHTML = '';
        count.textContent = jokes.length === 1 ? '1 chiste' : jokes.length + ' chistes';
        if (jokes.length === 0) {
            list.innerHTML = '<p class="empty-state">No hay chistes con esos filtros.</p>';
            return;
        }
        const frag = document.createDocumentFragment();
        jokes.forEach(j => frag.appendChild(makeCard(j)));
        list.appendChild(frag);
    }

    function makeCard(j) {
        const node = tpl.content.cloneNode(true);
        const card = node.querySelector('.chiste-card');
        card.dataset.id         = j.id;
        card.dataset.estado     = j.estado;
        card.dataset.categoria  = j.categoria_id || '';
        card.dataset.puntuacion = j.puntuacion || '';
        card.dataset.texto      = j.texto.toLowerCase();

        node.querySelector('.chiste-categoria').textContent = j.categoria || '—';
        node.querySelector('.chiste-stars').innerHTML = starsHtml(j.puntuacion) + (j.duracion ? ' <span class="chiste-dur">' + durStr(j.duracion) + '</span>' : '');
        node.querySelector('.chiste-texto').textContent = j.texto;

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

    function applyFilters() {
        const q      = fText.value.trim().toLowerCase();
        const estado = fEstado.value;
        const cat    = fCat.value;
        const pun    = fPun.value;
        const sort   = fSort ? fSort.value : 'reciente';

        let filtered = allJokes.filter(j => {
            if (q && !j.texto.toLowerCase().includes(q) &&
                !(j.categoria || '').toLowerCase().includes(q) &&
                !(j.tags || []).some(t => t.toLowerCase().includes(q))) return false;
            if (estado && j.estado !== estado) return false;
            if (cat && String(j.categoria_id) !== cat) return false;
            if (pun !== '') {
                if (pun === '0' && j.puntuacion != null) return false;
                if (pun !== '0' && String(j.puntuacion) !== pun) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            switch (sort) {
                case 'antiguos':        return (a.fecha_creacion || '') > (b.fecha_creacion || '') ? 1 : -1;
                case 'puntuacion-desc': return (b.puntuacion ?? -1) - (a.puntuacion ?? -1);
                case 'puntuacion-asc':  return (a.puntuacion ?? 99) - (b.puntuacion ?? 99);
                case 'duracion-desc':   return (b.duracion ?? -1) - (a.duracion ?? -1);
                case 'duracion-asc':    return (a.duracion ?? 99999) - (b.duracion ?? 99999);
                case 'az':              return a.texto.localeCompare(b.texto, 'es');
                default:                return (a.fecha_creacion || '') < (b.fecha_creacion || '') ? 1 : -1;
            }
        });

        renderList(filtered);
    }

    fText.addEventListener('input', applyFilters);
    fEstado.addEventListener('change', applyFilters);
    fCat.addEventListener('change', applyFilters);
    fPun.addEventListener('change', applyFilters);
    if (fSort) fSort.addEventListener('change', applyFilters);
    btnClr.addEventListener('click', () => {
        fText.value = ''; fEstado.value = ''; fCat.value = ''; fPun.value = '';
        if (fSort) fSort.value = 'reciente';
        renderList(allJokes);
    });

    function shareJoke(texto) {
        if (navigator.share) {
            navigator.share({ text: texto }).catch(() => {});
        } else {
            window.open('https://www.threads.net/intent/post?text=' + encodeURIComponent(texto), '_blank');
        }
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
        return { borrador: 'Borrador', desarrollo: 'En desarrollo', probado: 'Probado', rotacion: 'En rotación', retirado: 'Retirado' }[e] || e;
    }

    load();
}());
