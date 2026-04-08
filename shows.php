<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$gs    = new GoogleSheets();
$shows = $gs->getAllShows();
usort($shows, fn($a, $b) => strcmp($b['fecha_actualizacion'], $a['fecha_actualizacion']));

$page_title = t('nav_shows');
include __DIR__ . '/includes/header.php';
?>

<div class="page-header">
    <h2><?= h(t('nav_shows')) ?></h2>
    <button onclick="nuevoShow()" class="btn btn-primary">+ <?= h(t('new_show')) ?></button>
</div>

<div class="drive-banner" id="drive-banner">
    <span class="drive-banner-icon">☁️</span>
    <span class="drive-banner-text"><?= t('drive_banner') ?></span>
    <button class="drive-banner-close" onclick="closeDriveBanner()" aria-label="<?= h(t('drive_banner_close')) ?>">×</button>
</div>

<div id="show-modal-overlay" class="modal-overlay" style="display:none">
    <div class="modal-box">
        <h3><?= h(t('new_show')) ?></h3>
        <input type="text" id="modal-titulo" placeholder="<?= h(t('show_title_ph')) ?>" maxlength="255" autocomplete="off" class="modal-text-input">
        <div class="modal-actions">
            <button class="btn btn-ghost" id="modal-cancel"><?= h(t('cancel')) ?></button>
            <button class="btn btn-primary" id="modal-confirm"><?= h(t('create')) ?></button>
        </div>
    </div>
</div>

<?php if (empty($shows)): ?>
    <p class="empty-state large"><?= h(t('no_shows_empty')) ?> <button class="link-btn" onclick="nuevoShow()"><?= h(t('create_first')) ?></button>.</p>
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
                <span><?= h(t('modified')) ?> <?= h(substr($show['fecha_actualizacion'], 0, 10)) ?></span>
            </div>
            <div class="show-actions">
                <a href="show_editor.php?id=<?= h($show['id']) ?>" class="btn btn-ghost btn-sm"><?= h(t('edit')) ?></a>
                <button class="btn btn-ghost btn-sm" onclick="cloneShow('<?= h($show['id']) ?>')"><?= h(t('clone')) ?></button>
                <button class="btn btn-danger btn-sm" onclick="deleteShow('<?= h($show['id']) ?>', this)"><?= h(t('delete')) ?></button>
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
    if (!confirm(LANG.confirm_delete_show)) return;
    const res = await fetch(BASE_URL + '/api/shows.php?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.ok) btn.closest('li').remove();
}

async function cloneShow(id) {
    const res  = await fetch(BASE_URL + '/api/shows.php?action=clone&id=' + encodeURIComponent(id), { method: 'POST' });
    const data = await res.json();
    if (data.id) window.location.href = BASE_URL + '/show_editor.php?id=' + data.id;
}
</script>
<script>
(function(){
    var KEY = 'showrganizer_drive_banner_seen';
    var banner = document.getElementById('drive-banner');
    if (localStorage.getItem(KEY)) { banner.style.display = 'none'; }
    window.closeDriveBanner = function() {
        banner.style.maxHeight = banner.scrollHeight + 'px';
        requestAnimationFrame(function(){ banner.style.maxHeight = '0'; banner.style.opacity = '0'; banner.style.marginBottom = '0'; });
        setTimeout(function(){ banner.style.display = 'none'; }, 350);
        localStorage.setItem(KEY, '1');
    };
}());
</script>
<script>
window.TUTORIAL_CONFIG = {
    key: 'showrganizer_tutorial_shows',
    steps: [
        { selector: null,                    title: <?= json_encode(t('tut_s1_title')) ?>, text: <?= json_encode(t('tut_s1_text')) ?>, position: 'center' },
        { selector: '.page-header .btn-primary', title: <?= json_encode(t('tut_s2_title')) ?>, text: <?= json_encode(t('tut_s2_text')) ?>, position: 'bottom' },
        { selector: '.shows-list',           title: <?= json_encode(t('tut_s3_title')) ?>, text: <?= json_encode(t('tut_s3_text')) ?>, position: 'bottom' },
        { selector: '.show-actions',         title: <?= json_encode(t('tut_s4_title')) ?>, text: <?= json_encode(t('tut_s4_text')) ?>, position: 'top'    },
    ],
    skip:   <?= json_encode(t('tut_skip'))   ?>,
    next:   <?= json_encode(t('tut_next'))   ?>,
    prev:   <?= json_encode(t('tut_prev'))   ?>,
    finish: <?= json_encode(t('tut_finish')) ?>,
    of:     <?= json_encode(t('tut_of'))     ?>,
};
</script>
<script src="<?= BASE_URL ?>/assets/js/tutorial.js"></script>
<?php include __DIR__ . '/includes/footer.php'; ?>
