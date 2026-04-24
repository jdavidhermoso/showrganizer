<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$gs      = new GoogleSheets();
$bloques = $gs->getAllBloques();
usort($bloques, fn($a, $b) => strcmp($b['fecha_actualizacion'], $a['fecha_actualizacion']));

// Build a map of joke ID → duration (seconds) for total duration display
$allChistes  = $gs->getAllChistes();
$durMap      = [];
foreach ($allChistes as $c) {
    if (isset($c['id']) && isset($c['duracion']) && $c['duracion'] !== null) {
        $durMap[$c['id']] = (int)$c['duracion'];
    }
}

function bloqueDurStr(array $chisteIds, array $durMap): string {
    $total = 0;
    foreach ($chisteIds as $id) {
        $total += $durMap[$id] ?? 0;
    }
    if (!$total) return '';
    $m = intdiv($total, 60);
    $s = $total % 60;
    return $m . 'min' . ($s ? $s . 's' : '');
}

$page_title = t('nav_bloques');
include __DIR__ . '/includes/header.php';
?>

<div class="page-header">
    <h2><?= h(t('nav_bloques')) ?></h2>
    <button onclick="nuevoBloque()" class="btn btn-primary">+ <?= h(t('new_bloque')) ?></button>
</div>

<div id="bloque-modal-overlay" class="modal-overlay" style="display:none">
    <div class="modal-box">
        <h3><?= h(t('new_bloque')) ?></h3>
        <input type="text" id="modal-titulo" placeholder="<?= h(t('bloque_title_ph')) ?>" maxlength="255" autocomplete="off" class="modal-text-input">
        <div class="modal-actions">
            <button class="btn btn-ghost" id="modal-cancel"><?= h(t('cancel')) ?></button>
            <button class="btn btn-primary" id="modal-confirm"><?= h(t('create')) ?></button>
        </div>
    </div>
</div>

<?php if (empty($bloques)): ?>
    <p class="empty-state large"><?= h(t('no_bloques_empty')) ?> <button class="link-btn" onclick="nuevoBloque()"><?= h(t('create_first')) ?></button>.</p>
<?php else: ?>
    <ul class="shows-list">
        <?php foreach ($bloques as $b): ?>
        <li class="shows-list-item">
            <a href="bloque_editor.php?id=<?= h($b['id']) ?>" class="show-title"><?= h($b['titulo']) ?></a>
            <div class="show-meta">
                <span><?= count($b['chistes']) ?> <?= h(t('jokes_count')) ?><?php $dur = bloqueDurStr($b['chistes'], $durMap); if ($dur): ?> · <strong class="chiste-dur"><?= h($dur) ?></strong><?php endif; ?></span>
                <span><?= h(t('modified')) ?> <?= h(substr($b['fecha_actualizacion'], 0, 10)) ?></span>
            </div>
            <div class="show-actions">
                <a href="bloque_editor.php?id=<?= h($b['id']) ?>" class="btn btn-ghost btn-sm"><?= h(t('edit')) ?></a>
                <button class="btn btn-danger btn-sm" onclick="deleteBloque('<?= h($b['id']) ?>', this)"><?= h(t('delete')) ?></button>
            </div>
        </li>
        <?php endforeach; ?>
    </ul>
<?php endif; ?>

<script>
const overlay    = document.getElementById('bloque-modal-overlay');
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

async function nuevoBloque() {
    const titulo = await openModal();
    if (titulo === null) return;
    const res  = await fetch(BASE_URL + '/api/bloques.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo || 'Bloque sin título' }),
    });
    const data = await res.json();
    if (data.id) window.location.href = BASE_URL + '/bloque_editor.php?id=' + data.id;
}

async function deleteBloque(id, btn) {
    if (!confirm(LANG.confirm_delete_bloque || '¿Eliminar este bloque?')) return;
    const res = await fetch(BASE_URL + '/api/bloques.php?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.ok) btn.closest('li').remove();
}
</script>
<?php include __DIR__ . '/includes/footer.php'; ?>
