(function () {
    'use strict';

    var L = window.LANG || {};

    var overlay    = document.getElementById('global-composer-overlay');
    var textarea   = document.getElementById('global-composer-texto');
    var catSel     = document.getElementById('global-composer-cat');
    var estSel     = document.getElementById('global-composer-estado');
    var submitBtn  = document.getElementById('global-composer-submit');
    var status     = document.getElementById('global-composer-status');
    var fab        = document.getElementById('global-fab');
    var closeBtn   = document.getElementById('global-composer-close');

    var starsWrap  = document.getElementById('global-composer-stars-input');
    var punInput   = document.getElementById('global-composer-puntuacion');
    var starBtns   = starsWrap.querySelectorAll('.star-btn');
    var starClear  = starsWrap.querySelector('.star-clear');

    var tagsField  = document.getElementById('global-composer-tags-field');
    var tagsInput  = document.getElementById('global-composer-tags-input');

    var catsLoaded = false;
    var currentStars = 0;
    var tags = [];

    function renderStars(val) {
        starBtns.forEach(function(btn, i) {
            btn.classList.toggle('active', i < val);
        });
        punInput.value = val > 0 ? val : '';
    }

    starBtns.forEach(function(btn, i) {
        btn.addEventListener('click', function() { currentStars = i + 1; renderStars(currentStars); });
        btn.addEventListener('mouseover', function() { renderStars(i + 1); });
        btn.addEventListener('mouseout',  function() { renderStars(currentStars); });
    });
    starClear.addEventListener('click', function() { currentStars = 0; renderStars(0); });

    function renderTagChips() {
        tagsField.querySelectorAll('.tag-chip').forEach(function(c) { c.remove(); });
        tags.forEach(function(tag) {
            var chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = escHtml(tag) + '<button type="button" class="tag-remove" data-tag="' + escHtml(tag) + '">×</button>';
            chip.querySelector('.tag-remove').addEventListener('click', function() {
                tags = tags.filter(function(t) { return t !== tag; });
                renderTagChips();
            });
            tagsField.insertBefore(chip, tagsInput);
        });
    }

    tagsInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            var val = tagsInput.value.trim().replace(/,/g, '');
            if (val && tags.indexOf(val) === -1) { tags.push(val); renderTagChips(); }
            tagsInput.value = '';
        } else if (e.key === 'Backspace' && tagsInput.value === '' && tags.length) {
            tags.pop();
            renderTagChips();
        }
    });
    tagsField.addEventListener('click', function() { tagsInput.focus(); });

    function openComposer() {
        overlay.style.display = 'flex';
        textarea.focus();
        if (!catsLoaded) loadCats();
    }

    function closeComposer() {
        overlay.style.display = 'none';
        textarea.value = '';
        status.textContent = '';
        status.className = 'composer-status';
        currentStars = 0;
        renderStars(0);
        tags = [];
        renderTagChips();
        tagsInput.value = '';
    }

    function loadCats() {
        fetch(BASE_URL + '/api/categorias.php')
            .then(function(r){ return r.json(); })
            .then(function(cats){
                catsLoaded = true;
                catSel.innerHTML = '<option value="">' + (L.no_category || '—') + '</option>';
                cats.forEach(function(c){
                    var opt = document.createElement('option');
                    opt.value = c.nombre;
                    opt.textContent = c.nombre;
                    catSel.appendChild(opt);
                });
            });
    }

    async function submit() {
        var texto = textarea.value.trim();
        if (!texto) { flash(L.composer_write_first || 'Write something first.', 'err'); return; }
        submitBtn.disabled = true;
        try {
            var res = await fetch(BASE_URL + '/api/chistes.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    texto:      texto,
                    categoria:  catSel.value,
                    estado:     estSel.value,
                    puntuacion: punInput.value ? parseInt(punInput.value) : null,
                    tags:       tags,
                    duracion:   null,
                    callbacks:  [],
                }),
            });
            var data = await res.json();
            if (!res.ok) { flash(data.error || 'Error', 'err'); return; }
            flash(L.composer_saved || '✓ Saved', 'ok');
            setTimeout(closeComposer, 900);
        } catch(e) {
            flash(L.network_error || 'Network error', 'err');
        } finally {
            submitBtn.disabled = false;
        }
    }

    function flash(msg, type) {
        status.textContent = msg;
        status.className = 'composer-status ' + type;
    }

    function escHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    fab.addEventListener('click', openComposer);
    closeBtn.addEventListener('click', closeComposer);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeComposer(); });
    submitBtn.addEventListener('click', submit);
    textarea.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        if (e.key === 'Escape') closeComposer();
    });
}());
