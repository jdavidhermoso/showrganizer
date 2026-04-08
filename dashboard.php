<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$gs      = new GoogleSheets();
$chistes = $gs->getAllChistes();
$shows   = $gs->getAllShows();
$cats    = $gs->getCategorias();

$total_chistes = count($chistes);
$total_shows   = count($shows);

$estados_map = [];
foreach ($chistes as $c) {
    $estados_map[$c['estado']] = ($estados_map[$c['estado']] ?? 0) + 1;
}

usort($chistes, fn($a, $b) => strcmp($b['fecha_creacion'], $a['fecha_creacion']));
usort($shows,   fn($a, $b) => strcmp($b['fecha_actualizacion'], $a['fecha_actualizacion']));
$ultimos_chistes = array_slice($chistes, 0, 10);
$ultimos_shows   = array_slice($shows, 0, 5);

$page_title = 'Dashboard';
include __DIR__ . '/includes/header.php';
?>

<div class="composer">
    <textarea id="composer-texto" placeholder="<?= h(t('dash_placeholder')) ?>" rows="3" autocomplete="off"></textarea>
    <div class="composer-meta">
        <select id="composer-cat" class="filter-select">
            <option value=""><?= h(t('no_category')) ?></option>
            <?php foreach ($cats as $cat): ?>
                <option value="<?= h($cat) ?>"><?= h($cat) ?></option>
            <?php endforeach; ?>
        </select>
        <select id="composer-estado" class="filter-select">
            <option value="borrador"><?= h(t('status_draft')) ?></option>
            <option value="desarrollo"><?= h(t('status_dev')) ?></option>
            <option value="probado"><?= h(t('status_tested')) ?></option>
            <option value="rotacion"><?= h(t('status_rotation')) ?></option>
            <option value="retirado"><?= h(t('status_retired')) ?></option>
        </select>
        <input type="number" id="composer-duracion" class="filter-select" min="0" step="0.5" placeholder="min" title="<?= h(t('dash_duration_hint')) ?>" style="width:70px">
    </div>
    <div class="composer-stars-row">
        <div class="composer-stars" id="dash-stars-input" data-value="0">
            <span class="star-btn">★</span><span class="star-btn">★</span><span class="star-btn">★</span><span class="star-btn">★</span><span class="star-btn">★</span>
            <span class="star-clear" title="<?= h(t('no_rating')) ?>">×</span>
        </div>
        <div class="tags-field" id="dash-tags-field" style="flex:1">
            <input type="text" id="dash-tags-input" placeholder="<?= h(t('dash_tags_ph')) ?>" autocomplete="off">
        </div>
    </div>
    <div class="composer-footer">
        <button id="composer-submit" class="btn btn-primary" onclick="quickPost()"><?= h(t('save')) ?></button>
    </div>
    <div id="composer-status" class="composer-status"></div>
</div>

<div class="stats-grid">
    <div class="stat-card">
        <span class="stat-number" id="stat-total"><?= $total_chistes ?></span>
        <span class="stat-label"><?= h(t('stat_jokes')) ?></span>
    </div>
    <div class="stat-card">
        <span class="stat-number"><?= $estados_map['probado'] ?? 0 ?></span>
        <span class="stat-label"><?= h(t('stat_tested')) ?></span>
    </div>
    <div class="stat-card">
        <span class="stat-number"><?= $estados_map['desarrollo'] ?? 0 ?></span>
        <span class="stat-label"><?= h(t('stat_dev')) ?></span>
    </div>
    <div class="stat-card">
        <span class="stat-number"><?= $total_shows ?></span>
        <span class="stat-label"><?= h(t('stat_shows')) ?></span>
    </div>
</div>

<div class="dashboard-cols">
    <section class="dashboard-col">
        <div class="section-header">
            <h3><?= h(t('latest_jokes')) ?></h3>
            <a href="chistes.php"><?= h(t('see_all')) ?></a>
        </div>
        <ul class="item-list" id="feed-list">
            <?php if (empty($ultimos_chistes)): ?>
                <li><p class="empty-state"><?= h(t('first_joke_hint')) ?></p></li>
            <?php else: ?>
                <?php foreach ($ultimos_chistes as $c): ?>
                <li class="item-list-row">
                    <div class="item-main">
                        <a href="chiste_form.php?id=<?= h($c['id']) ?>" class="item-text"><?= h(mb_substr($c['texto'], 0, 100)) ?><?= mb_strlen($c['texto']) > 100 ? '…' : '' ?></a>
                        <span class="item-meta"><?= h($c['categoria'] ?: '—') ?></span>
                    </div>
                    <div class="item-aside">
                        <span class="estado estado-<?= h($c['estado']) ?>"><?= estado_label($c['estado']) ?></span>
                    </div>
                </li>
                <?php endforeach; ?>
            <?php endif; ?>
        </ul>
    </section>

    <section class="dashboard-col">
        <div class="section-header">
            <h3><?= h(t('nav_shows')) ?></h3>
            <a href="shows.php"><?= h(t('see_all')) ?></a>
        </div>
        <?php if (empty($ultimos_shows)): ?>
            <p class="empty-state"><?= h(t('no_shows_yet')) ?></p>
        <?php else: ?>
            <ul class="item-list">
                <?php foreach ($ultimos_shows as $s): ?>
                <li class="item-list-row">
                    <a href="show_editor.php?id=<?= h($s['id']) ?>" class="item-text"><?= h($s['titulo']) ?></a>
                    <span class="item-meta"><?= h(substr($s['fecha_actualizacion'], 0, 10)) ?></span>
                </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
        <div style="margin-top:0.75rem">
            <button onclick="nuevoShow()" class="btn btn-ghost btn-sm">+ <?= h(t('new_show')) ?></button>
        </div>
    </section>
</div>

<div id="show-modal-overlay" class="modal-overlay" style="display:none">
    <div class="modal-box">
        <h3><?= h(t('new_show')) ?></h3>
        <input type="text" id="modal-input" placeholder="<?= h(t('show_title_ph')) ?>" maxlength="255" autocomplete="off">
        <div class="modal-actions">
            <button class="btn btn-ghost" id="modal-cancel"><?= h(t('cancel')) ?></button>
            <button class="btn btn-primary" id="modal-confirm"><?= h(t('create')) ?></button>
        </div>
    </div>
</div>

<script>
(function() {
    const starsWrap = document.getElementById('dash-stars-input');
    const starBtns  = starsWrap.querySelectorAll('.star-btn');
    let currentStars = 0;

    function renderStars(val) {
        starBtns.forEach((b, i) => b.classList.toggle('active', i < val));
    }
    starBtns.forEach((b, i) => {
        b.addEventListener('click',     () => { currentStars = i + 1; renderStars(currentStars); });
        b.addEventListener('mouseover', () => renderStars(i + 1));
        b.addEventListener('mouseout',  () => renderStars(currentStars));
    });
    starsWrap.querySelector('.star-clear').addEventListener('click', () => { currentStars = 0; renderStars(0); });

    const tagsField = document.getElementById('dash-tags-field');
    const tagsInput = document.getElementById('dash-tags-input');
    let tags = [];

    function renderTagChips() {
        tagsField.querySelectorAll('.tag-chip').forEach(c => c.remove());
        tags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = escHtml(tag) + '<button type="button" class="tag-remove">×</button>';
            chip.querySelector('.tag-remove').addEventListener('click', () => { tags = tags.filter(t => t !== tag); renderTagChips(); });
            tagsField.insertBefore(chip, tagsInput);
        });
    }
    tagsInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = tagsInput.value.trim().replace(/,/g, '');
            if (val && !tags.includes(val)) { tags.push(val); renderTagChips(); }
            tagsInput.value = '';
        } else if (e.key === 'Backspace' && tagsInput.value === '' && tags.length) {
            tags.pop(); renderTagChips();
        }
    });
    tagsField.addEventListener('click', () => tagsInput.focus());

    window.quickPost = async function() {
        const texto = document.getElementById('composer-texto').value.trim();
        if (!texto) { flashStatus(LANG.composer_write_first, 'err'); return; }
        const btn    = document.getElementById('composer-submit');
        btn.disabled = true;
        const cat    = document.getElementById('composer-cat').value;
        const est    = document.getElementById('composer-estado').value;
        const durMin = parseFloat(document.getElementById('composer-duracion').value || '');
        const res = await fetch(BASE_URL + '/api/chistes.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                texto,
                categoria:  cat,
                estado:     est,
                puntuacion: currentStars > 0 ? currentStars : null,
                tags,
                duracion:   !isNaN(durMin) && durMin >= 0 ? Math.round(durMin * 60) : null,
                callbacks:  [],
            }),
        });
        const data = await res.json();
        btn.disabled = false;
        if (!res.ok) { flashStatus(data.error || 'Error', 'err'); return; }

        document.getElementById('composer-texto').value     = '';
        document.getElementById('composer-cat').value       = '';
        document.getElementById('composer-duracion').value  = '';
        currentStars = 0; renderStars(0);
        tags = []; renderTagChips();

        const list = document.getElementById('feed-list');
        const li   = document.createElement('li');
        li.className = 'item-list-row';
        li.innerHTML =
            '<div class="item-main"><a href="' + BASE_URL + '/chiste_form.php?id=' + data.id + '" class="item-text">' +
            escHtml(texto.slice(0,100)) + (texto.length > 100 ? '…' : '') +
            '</a><span class="item-meta">' + escHtml(cat || '—') + '</span></div>' +
            '<div class="item-aside"><span class="estado estado-' + est + '">' + estadoLabel(est) + '</span></div>';
        list.querySelector('.empty-state')?.closest('li')?.remove();
        list.prepend(li);
        document.getElementById('stat-total').textContent = parseInt(document.getElementById('stat-total').textContent) + 1;
        flashStatus(LANG.composer_saved, 'ok');
    };
}());

function flashStatus(msg, type) {
    const el = document.getElementById('composer-status');
    el.textContent = msg; el.className = 'composer-status ' + type;
    setTimeout(() => { el.textContent = ''; el.className = 'composer-status'; }, 2000);
}
document.getElementById('composer-texto').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) quickPost();
});
const overlay    = document.getElementById('show-modal-overlay');
const modalInput = document.getElementById('modal-input');
function openModal() {
    return new Promise(resolve => {
        modalInput.value = ''; overlay.style.display = 'flex'; modalInput.focus();
        function cleanup() { overlay.style.display = 'none'; modalInput.removeEventListener('keydown', onKey); document.getElementById('modal-confirm').onclick = null; document.getElementById('modal-cancel').onclick = null; }
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
    if (!titulo) return;
    const res  = await fetch(BASE_URL + '/api/shows.php', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({titulo}) });
    const data = await res.json();
    if (data.id) window.location.href = BASE_URL + '/show_editor.php?id=' + data.id;
}
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function estadoLabel(e) {
    const map = { borrador: LANG.status_draft, desarrollo: LANG.status_dev, probado: LANG.status_tested, rotacion: LANG.status_rotation, retirado: LANG.status_retired };
    return map[e] || e;
}
</script>
<script>
window.TUTORIAL_CONFIG = {
    key: 'showrganizer_tutorial_dashboard',
    steps: [
        { selector: null, title: <?= json_encode(t('tut_d1_title')) ?>, text: <?= json_encode(t('tut_d1_text')) ?>, position: 'center' },
        { selector: '.composer',      title: <?= json_encode(t('tut_d2_title')) ?>, text: <?= json_encode(t('tut_d2_text')) ?>, position: 'bottom' },
        { selector: '.stats-grid',    title: <?= json_encode(t('tut_d3_title')) ?>, text: <?= json_encode(t('tut_d3_text')) ?>, position: 'bottom' },
        { selector: '.dashboard-cols',title: <?= json_encode(t('tut_d4_title')) ?>, text: <?= json_encode(t('tut_d4_text')) ?>, position: 'top'    },
        { selector: '#global-fab',    title: <?= json_encode(t('tut_d5_title')) ?>, text: <?= json_encode(t('tut_d5_text')) ?>, position: 'top'    },
        { selector: '.burger-btn',    title: <?= json_encode(t('tut_d6_title')) ?>, text: <?= json_encode(t('tut_d6_text')) ?>, position: 'bottom' },
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
