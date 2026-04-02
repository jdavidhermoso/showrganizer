(function () {
    'use strict';

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

    const form     = document.getElementById('chiste-form');
    const statusEl = document.getElementById('form-status');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            texto:      document.getElementById('texto').value,
            categoria:  document.getElementById('categoria').value || '',
            estado:     document.getElementById('estado').value,
            puntuacion: punInput.value ? parseInt(punInput.value) : null,
            tags:       tags,
        };

        const id     = parseInt(form.dataset.id);
        const url    = BASE_URL + '/api/chistes.php' + (id ? '?id=' + id : '');
        const method = id ? 'PUT' : 'POST';

        statusEl.className = 'form-status';
        statusEl.textContent = 'Guardando...';

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
            statusEl.textContent = '✓ Guardado';
            setTimeout(() => { statusEl.textContent = ''; }, 2500);
        } catch (err) {
            statusEl.className   = 'form-status err';
            statusEl.textContent = err.message || 'Error al guardar';
        }
    });

    const delBtn = document.getElementById('delete-btn');
    if (delBtn) {
        delBtn.addEventListener('click', async () => {
            if (!confirm('¿Eliminar este chiste? Esta acción no se puede deshacer.')) return;
            const id  = parseInt(form.dataset.id);
            const res = await fetch(BASE_URL + '/api/chistes.php?id=' + id, { method: 'DELETE' });
            if (res.ok) window.location.href = BASE_URL + '/chistes.php';
        });
    }

    function escHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}());
