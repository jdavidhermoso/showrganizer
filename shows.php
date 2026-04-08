<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$gs    = new GoogleSheets();
$shows = $gs->getAllShows();
usort($shows, fn($a, $b) => strcmp($b['fecha_actualizacion'], $a['fecha_actualizacion']));

$page_title = 'Shows';
include __DIR__ . '/includes/header.php';
?>

<div class="page-header">
    <h2>Shows</h2>
    <button onclick="nuevoShow()" class="btn btn-primary">+ Nuevo show</button>
</div>

<div id="show-modal-overlay" class="modal-overlay" style="display:none">
    <div class="modal-box">
        <h3>Nuevo show</h3>
        <input type="text" id="modal-titulo" placeholder="Título del show..." maxlength="255" autocomplete="off" class="modal-text-input">
        <div class="modal-actions">
            <button class="btn btn-ghost" id="modal-cancel">Cancelar</button>
            <button class="btn btn-primary" id="modal-confirm">Crear</button>
        </div>
    </div>
</div>

<?php if (empty($shows)): ?>
    <p class="empty-state large">Aún no hay shows. <button class="link-btn" onclick="nuevoShow()">Crea el primero</button>.</p>
<?php else: ?>
    <ul class="shows-list">
        <?php foreach ($shows as $show): ?>
        <li class="shows-list-item">
            <a href="show_editor.php?id=<?= h($show['id']) ?>" class="show-title"><?= h($show['titulo']) ?></a>
            <div class="show-meta">
                <?php
                    $meta = array_filter([$show['fecha_show'] ?? '', $show['sala'] ?? '', $show['ciudad'] ?? '']);
                    echo $meta ? '<span>' . h(implode(' · ', $meta)) . '</span>' : '';
                ?>
                <span>Modificado: <?= h(substr($show['fecha_actualizacion'], 0, 10)) ?></span>
            </div>
            <div class="show-actions">
                <a href="show_editor.php?id=<?= h($show['id']) ?>" class="btn btn-ghost btn-sm">Editar</a>
                <button class="btn btn-ghost btn-sm" onclick="cloneShow('<?= h($show['id']) ?>')">Clonar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteShow('<?= h($show['id']) ?>', this)">Eliminar</button>
            </div>
        </li>
        <?php endforeach; ?>
    </ul>
<?php endif; ?>

<script>
const overlay    = document.getElementById('show-modal-overlay');
const modalInput = document.getElementById('modal-titulo');

function openModal() {
    return new Promise(resolve => {
        modalInput.value = '';
        overlay.style.display = 'flex';
        modalInput.focus();
        function cleanup() {
            overlay.style.display = 'none';
            modalInput.removeEventListener('keydown', onKey);
            document.getElementById('modal-confirm').onclick = null;
            document.getElementById('modal-cancel').onclick  = null;
        }
        function confirm() { cleanup(); resolve(modalInput.value.trim() || null); }
        function cancel()  { cleanup(); resolve(null); }
        function onKey(e)  { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel(); }
        document.getElementById('modal-confirm').onclick = confirm;
        document.getElementById('modal-cancel').onclick  = cancel;
        overlay.addEventListener('click', e => { if (e.target === overlay) cancel(); }, { once: true });
        modalInput.addEventListener('keydown', onKey);
    });
}

async function nuevoShow() {
    const titulo = await openModal();
    if (titulo === null) return;
    const res  = await fetch(BASE_URL + '/api/shows.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo || 'Show sin título' }),
    });
    const data = await res.json();
    if (data.id) window.location.href = BASE_URL + '/show_editor.php?id=' + data.id;
}

async function deleteShow(id, btn) {
    if (!confirm('¿Eliminar este show?')) return;
    const res = await fetch(BASE_URL + '/api/shows.php?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.ok) btn.closest('li').remove();
}

async function cloneShow(id) {
    const res  = await fetch(BASE_URL + '/api/shows.php?action=clone&id=' + encodeURIComponent(id), { method: 'POST' });
    const data = await res.json();
    if (data.id) window.location.href = BASE_URL + '/show_editor.php?id=' + data.id;
}
</script>
<?php include __DIR__ . '/includes/footer.php'; ?>
