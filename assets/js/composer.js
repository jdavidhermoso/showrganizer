(function () {
    'use strict';

    var overlay  = document.getElementById('global-composer-overlay');
    var textarea = document.getElementById('global-composer-texto');
    var catSel   = document.getElementById('global-composer-cat');
    var estSel   = document.getElementById('global-composer-estado');
    var submitBtn= document.getElementById('global-composer-submit');
    var status   = document.getElementById('global-composer-status');
    var fab      = document.getElementById('global-fab');
    var closeBtn = document.getElementById('global-composer-close');

    var catsLoaded = false;

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
    }

    function loadCats() {
        fetch(BASE_URL + '/api/categorias.php')
            .then(function(r){ return r.json(); })
            .then(function(cats){
                catsLoaded = true;
                catSel.innerHTML = '<option value="">Sin categoría</option>';
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
        if (!texto) { flash('Escribe algo primero.', 'err'); return; }
        submitBtn.disabled = true;
        try {
            var res = await fetch(BASE_URL + '/api/chistes.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    texto:     texto,
                    categoria: catSel.value,
                    estado:    estSel.value,
                }),
            });
            var data = await res.json();
            if (!res.ok) { flash(data.error || 'Error', 'err'); return; }
            flash('✓ Guardado', 'ok');
            textarea.value = '';
            setTimeout(closeComposer, 900);
        } catch(e) {
            flash('Error de red', 'err');
        } finally {
            submitBtn.disabled = false;
        }
    }

    function flash(msg, type) {
        status.textContent = msg;
        status.className = 'composer-status ' + type;
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
