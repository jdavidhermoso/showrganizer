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

<?php if (empty($shows)): ?>
    <p class="empty-state large">Aún no hay shows. <button class="link-btn" onclick="nuevoShow()">Crea el primero</button>.</p>
<?php else: ?>
    <ul class="shows-list">
        <?php foreach ($shows as $show): ?>
        <li class="shows-list-item">
            <a href="show_editor.php?id=<?= h($show['id']) ?>" class="show-title"><?= h($show['titulo']) ?></a>
            <div class="show-meta">
                <span>Modificado: <?= h(substr($show['fecha_actualizacion'], 0, 10)) ?></span>
            </div>
            <div class="show-actions">
                <a href="show_editor.php?id=<?= h($show['id']) ?>" class="btn btn-ghost btn-sm">Editar</a>
                <button class="btn btn-danger btn-sm" onclick="deleteShow('<?= h($show['id']) ?>', this)">Eliminar</button>
            </div>
        </li>
        <?php endforeach; ?>
    </ul>
<?php endif; ?>

<script>
async function nuevoShow() {
    const titulo = prompt('Título del show:');
    if (titulo === null) return;
    const res  = await fetch(BASE_URL + '/api/shows.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim() || 'Show sin título' }),
    });
    const data = await res.json();
    if (data.id) window.location.href = BASE_URL + '/show_editor.php?id=' + data.id;
}

async function deleteShow(id, btn) {
    if (!confirm('¿Eliminar este show?')) return;
    const res = await fetch(BASE_URL + '/api/shows.php?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.ok) btn.closest('li').remove();
}
</script>
<?php include __DIR__ . '/includes/footer.php'; ?>
