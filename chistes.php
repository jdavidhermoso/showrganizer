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

<div class="ch-header">
    <h2 class="ch-title"><?= h(t('nav_jokes')) ?></h2>
    <a href="importar.php" class="btn btn-ghost ch-btn-import"><?= h(t('import')) ?></a>
    <a href="chiste_form.php" class="btn btn-primary ch-btn-new">+ <?= h(t('new_joke')) ?></a>
</div>

<div class="drive-banner" id="drive-banner">
    <span class="drive-banner-icon">☁️</span>
    <span class="drive-banner-text"><?= t('drive_banner') ?></span>
    <button class="drive-banner-close" onclick="closeDriveBanner()" aria-label="<?= h(t('drive_banner_close')) ?>">×</button>
</div>

<div class="ch-search-row">
    <div class="ch-search-wrap">
        <svg class="ch-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input type="text" id="filter-text" placeholder="<?= h(t('search_joke_ph')) ?>" class="ch-search-input" autocomplete="off">
        <button id="ch-search-clear" class="ch-search-clear" aria-label="Limpiar" style="display:none">×</button>
    </div>
    <button id="ch-filter-btn" class="ch-filter-btn" aria-label="Filtros">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2.5 4.5h13M4.5 9h9M6.5 13.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <span id="ch-filter-badge" class="ch-filter-badge" style="display:none">0</span>
    </button>
</div>

<div id="ch-pills-row" class="ch-pills-row" style="display:none"></div>

<div class="ch-meta-bar">
    <span id="chistes-count" class="ch-count-text"></span>
    <button id="estimate-all-btn" class="ch-estimate-btn" title="<?= h(t('estimate_all_hint')) ?>">
        ⏱ <?= h(t('estimate_all_btn')) ?>
    </button>
</div>
<span id="estimate-all-status" class="text-muted" style="font-size:0.85rem;display:block;padding:0 1rem;margin-bottom:0.5rem"></span>

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

<!-- Filter bottom sheet -->
<div id="ch-sheet-overlay" class="ch-sheet-overlay"></div>
<div id="ch-sheet" class="ch-sheet" aria-hidden="true">
    <div class="ch-sheet-handle-wrap">
        <div class="ch-sheet-handle"></div>
    </div>
    <div class="ch-sheet-hdr-sticky">
        <span class="ch-sheet-title">Filtros</span>
        <button id="ch-sheet-clear" class="ch-sheet-clear-btn"><?= h(t('filter_clear')) ?></button>
    </div>

    <div class="ch-filter-section">
        <div class="ch-filter-label"><?= mb_strtoupper(h(t('status_label'))) ?></div>
        <div class="ch-chips-row" id="chips-estado">
            <button class="ch-chip" data-key="estado" data-val=""><?= h(t('all_statuses_short')) ?></button>
            <button class="ch-chip" data-key="estado" data-val="borrador"><?= h(t('status_draft')) ?></button>
            <button class="ch-chip" data-key="estado" data-val="desarrollo"><?= h(t('status_dev')) ?></button>
            <button class="ch-chip" data-key="estado" data-val="probado"><?= h(t('status_tested')) ?></button>
            <button class="ch-chip" data-key="estado" data-val="rotacion"><?= h(t('status_rotation')) ?></button>
            <button class="ch-chip" data-key="estado" data-val="retirado"><?= h(t('status_retired')) ?></button>
        </div>
    </div>

    <div class="ch-filter-section">
        <div class="ch-filter-label"><?= mb_strtoupper(h(t('category_label'))) ?></div>
        <div class="ch-chips-row" id="chips-cat">
            <button class="ch-chip" data-key="cat" data-val=""><?= h(t('filter_all_cats')) ?></button>
            <?php foreach ($cats as $cat): ?>
            <button class="ch-chip" data-key="cat" data-val="<?= h($cat) ?>"><?= h($cat) ?></button>
            <?php endforeach; ?>
        </div>
    </div>

    <div class="ch-filter-section">
        <div class="ch-filter-label"><?= mb_strtoupper(h(t('rating_label'))) ?></div>
        <div class="ch-chips-row" id="chips-punt">
            <button class="ch-chip" data-key="punt" data-val=""><?= h(t('filter_any_rating')) ?></button>
            <button class="ch-chip" data-key="punt" data-val="1">★+</button>
            <button class="ch-chip" data-key="punt" data-val="2">★★+</button>
            <button class="ch-chip" data-key="punt" data-val="3">★★★+</button>
            <button class="ch-chip" data-key="punt" data-val="4">★★★★+</button>
            <button class="ch-chip" data-key="punt" data-val="5">★★★★★</button>
        </div>
    </div>

    <div class="ch-filter-section">
        <div class="ch-filter-label">ORDENAR</div>
        <div class="ch-chips-row" id="chips-sort">
            <button class="ch-chip" data-key="sort" data-val="reciente"><?= h(t('sort_recent')) ?></button>
            <button class="ch-chip" data-key="sort" data-val="antiguos"><?= h(t('sort_oldest')) ?></button>
            <button class="ch-chip" data-key="sort" data-val="puntuacion-desc"><?= h(t('sort_rating_desc')) ?></button>
            <button class="ch-chip" data-key="sort" data-val="duracion-asc"><?= h(t('sort_dur_asc')) ?></button>
        </div>
    </div>

    <button id="ch-sheet-apply" class="ch-sheet-apply">
        Ver <span id="ch-sheet-count">0</span> resultados
    </button>
</div>

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
