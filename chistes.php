<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$gs   = new GoogleSheets();
$cats = $gs->getCategorias();

$page_title = t('nav_jokes');
include __DIR__ . '/includes/header.php';
?>

<div class="page-header">
    <h2><?= h(t('nav_jokes')) ?></h2>
    <a href="importar.php" class="btn btn-ghost"><?= h(t('import')) ?></a>
    <a href="chiste_form.php" class="btn btn-primary">+ <?= h(t('new_joke')) ?></a>
</div>

<div class="drive-banner" id="drive-banner">
    <span class="drive-banner-icon">☁️</span>
    <span class="drive-banner-text"><?= t('drive_banner') ?></span>
    <button class="drive-banner-close" onclick="closeDriveBanner()" aria-label="<?= h(t('drive_banner_close')) ?>">×</button>
</div>

<div class="filters-bar">
    <input type="text" id="filter-text" placeholder="<?= h(t('search')) ?>" class="filter-input">
    <select id="filter-estado" class="filter-select">
        <option value=""><?= h(t('all_statuses')) ?></option>
        <option value="borrador"><?= h(t('status_draft')) ?></option>
        <option value="desarrollo"><?= h(t('status_dev')) ?></option>
        <option value="probado"><?= h(t('status_tested')) ?></option>
        <option value="rotacion"><?= h(t('status_rotation')) ?></option>
        <option value="retirado"><?= h(t('status_retired')) ?></option>
    </select>
    <select id="filter-categoria" class="filter-select">
        <option value=""><?= h(t('filter_all_cats')) ?></option>
        <?php foreach ($cats as $cat): ?>
            <option value="<?= h($cat) ?>"><?= h($cat) ?></option>
        <?php endforeach; ?>
    </select>
    <select id="filter-puntuacion" class="filter-select">
        <option value=""><?= h(t('filter_any_rating')) ?></option>
        <option value="5">★★★★★</option>
        <option value="4">★★★★☆</option>
        <option value="3">★★★☆☆</option>
        <option value="2">★★☆☆☆</option>
        <option value="1">★☆☆☆☆</option>
        <option value="0"><?= h(t('no_rating')) ?></option>
    </select>
    <select id="filter-sort" class="filter-select">
        <option value="reciente"><?= h(t('sort_recent')) ?></option>
        <option value="antiguos"><?= h(t('sort_oldest')) ?></option>
        <option value="puntuacion-desc"><?= h(t('sort_rating_desc')) ?></option>
        <option value="puntuacion-asc"><?= h(t('sort_rating_asc')) ?></option>
        <option value="duracion-desc"><?= h(t('sort_dur_desc')) ?></option>
        <option value="duracion-asc"><?= h(t('sort_dur_asc')) ?></option>
        <option value="az"><?= h(t('sort_az')) ?></option>
    </select>
    <button id="filter-clear" class="btn btn-ghost"><?= h(t('filter_clear')) ?></button>
</div>

<div id="chistes-count" class="results-count"></div>
<div id="chistes-list" class="chistes-grid"></div>

<template id="chiste-card-tpl">
    <article class="chiste-card">
        <div class="chiste-card-header">
            <span class="chiste-categoria"></span>
            <span class="chiste-stars"></span>
        </div>
        <p class="chiste-texto"></p>
        <div class="chiste-tags"></div>
        <div class="chiste-card-footer">
            <span class="estado"></span>
            <div class="card-actions">
                <button class="btn btn-ghost btn-sm share-btn" title="Compartir">↗</button>
                <a href="" class="btn btn-ghost btn-sm"><?= h(t('edit')) ?></a>
            </div>
        </div>
    </article>
</template>

<script src="assets/js/chistes.js"></script>
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
<?php include __DIR__ . '/includes/footer.php'; ?>
