<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$id   = trim($_GET['id'] ?? '');
$show = null;

if ($id) {
    $gs   = new GoogleSheets();
    $show = $gs->getShowById($id);
    if (!$show) redirect('/shows.php');
}

$page_title = $show ? h($show['titulo']) : t('new_show');
$html_lang  = ['es' => 'es', 'en' => 'en', 'de' => 'de'][get_lang()] ?? 'es';
?>
<!DOCTYPE html>
<html lang="<?= $html_lang ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?> · <?= APP_NAME ?></title>
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/main.css">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#1a1d25">
    <link rel="apple-touch-icon" href="/assets/logo-192.png">
    <script>(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}());</script>
    <script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');</script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
</head>
<body class="editor-body">

<div class="editor-topbar">
    <a href="<?= BASE_URL ?>/shows.php" class="editor-back" aria-label="<?= h(t('back_to_shows')) ?>">←</a>
    <button class="sidebar-toggle" id="sidebar-toggle" aria-label="<?= h(t('open_jokes_sidebar')) ?>"><?= h(t('chistes_sidebar')) ?></button>
    <input type="text" id="show-titulo" class="editor-title-input"
           value="<?= $show ? h($show['titulo']) : '' ?>"
           placeholder="<?= h(t('show_title_input_ph')) ?>">
    <div class="editor-topbar-right">
        <span id="total-duration" class="total-duration" title="<?= h(t('duration_label')) ?>"></span>
        <span id="save-status" class="save-status"></span>
        <button id="save-btn" class="btn btn-primary"><?= h(t('save')) ?></button>
    </div>
</div>

<div id="show-meta-bar" class="show-meta-bar">
    <input type="date" id="show-fecha" class="meta-input" value="<?= h($show['fecha_show'] ?? '') ?>">
    <input type="text" id="show-sala" class="meta-input" placeholder="<?= h(t('venue_ph')) ?>" value="<?= h($show['sala'] ?? '') ?>">
    <input type="text" id="show-ciudad" class="meta-input" placeholder="<?= h(t('city_ph')) ?>" value="<?= h($show['ciudad'] ?? '') ?>">
</div>

<div class="editor-layout">
    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <aside class="editor-sidebar" id="editor-sidebar">
        <div class="sidebar-header"><span><?= h(t('sidebar_jokes_title')) ?></span></div>
        <div class="sidebar-filters">
            <input type="text" id="sidebar-search" placeholder="<?= h(t('search')) ?>" class="filter-input filter-input-sm">
            <select id="sidebar-estado" class="filter-select filter-select-sm">
                <option value=""><?= h(t('all_statuses_short')) ?></option>
                <option value="borrador"><?= h(t('status_draft')) ?></option>
                <option value="desarrollo"><?= h(t('status_dev')) ?></option>
                <option value="probado"><?= h(t('status_tested')) ?></option>
                <option value="rotacion"><?= h(t('status_rotation')) ?></option>
                <option value="retirado"><?= h(t('status_retired')) ?></option>
            </select>
        </div>
        <div id="sidebar-jokes-list" class="sidebar-jokes-list">
            <p class="sidebar-loading"><?= h(t('loading')) ?></p>
        </div>
    </aside>

    <section class="editor-document">
        <div class="doc-add-bar">
            <button class="btn btn-ghost btn-sm" id="add-text-bottom"><?= h(t('add_text')) ?></button>
            <button class="btn btn-ghost btn-sm" id="add-video-bottom"><?= h(t('add_video')) ?></button>
            <button id="chart-toggle" class="btn btn-ghost btn-sm" title="<?= h(t('expected_laughs')) ?>"><?= h(t('laughs')) ?></button>
            <?php if ($id): ?>
            <a href="<?= BASE_URL ?>/show_print.php?id=<?= h($id) ?>" target="_blank" class="btn btn-ghost btn-sm">PDF</a>
            <button id="export-text-btn" class="btn btn-ghost btn-sm" title="<?= h(t('export_text')) ?>"><?= h(t('export_text')) ?></button>
            <button id="clone-show-btn" class="btn btn-ghost btn-sm" title="<?= h(t('clone_show')) ?>"><?= h(t('clone_show')) ?></button>
            <?php endif; ?>
        </div>
        <div id="document-blocks" class="document-blocks">
            <div class="doc-empty-state" id="doc-empty">
                <p><?= h(t('drag_hint')) ?> <button class="link-btn" id="add-first-text"><?= h(t('drag_hint_link')) ?></button>.</p>
            </div>
        </div>
    </section>
</div>

<div id="joke-popup-overlay" class="modal-overlay" style="display:none">
    <div class="modal-box joke-popup-box">
        <div class="joke-popup-header">
            <span id="joke-popup-cat" class="joke-block-category"></span>
            <span id="joke-popup-stars" class="joke-block-rating"></span>
            <span id="joke-popup-estado" class="estado"></span>
            <span id="joke-popup-dur" class="chiste-dur"></span>
        </div>
        <p id="joke-popup-texto" class="joke-popup-texto"></p>
        <div id="joke-popup-tags" class="joke-block-tags"></div>
        <div class="modal-actions">
            <a id="joke-popup-edit" href="" target="_blank" class="btn btn-ghost btn-sm"><?= h(t('popup_edit')) ?></a>
            <button id="joke-popup-close" class="btn btn-ghost"><?= h(t('popup_close')) ?></button>
        </div>
    </div>
</div>

<div id="chart-overlay" class="chart-overlay"></div>
<div id="chart-panel" class="chart-panel">
    <div id="chart-resize-handle" class="chart-resize-handle"></div>
    <div class="chart-panel-inner">
        <div class="chart-panel-topbar">
            <span class="chart-panel-label"><?= h(t('expected_laughs')) ?></span>
            <div class="chart-panel-actions">
                <button id="chart-panel-shrink" class="btn btn-ghost btn-sm" title="<?= h(t('shrink')) ?>">↓</button>
                <button id="chart-panel-grow"   class="btn btn-ghost btn-sm" title="<?= h(t('enlarge')) ?>">↑</button>
                <button id="chart-panel-close"  class="btn btn-ghost btn-sm"><?= h(t('close')) ?></button>
            </div>
        </div>
        <canvas id="show-chart"></canvas>
    </div>
</div>

<script>
const sidebarToggle  = document.getElementById('sidebar-toggle');
const sidebarEl      = document.getElementById('editor-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
function openSidebar()  { sidebarEl.classList.add('open'); sidebarOverlay.classList.add('active'); }
function closeSidebar() { sidebarEl.classList.remove('open'); sidebarOverlay.classList.remove('active'); }
sidebarToggle.addEventListener('click', () => sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar());
sidebarOverlay.addEventListener('click', closeSidebar);

const BASE_URL  = '<?= BASE_URL ?>';
const SHOW_ID   = '<?= h($id) ?>';
const SHOW_DATA = <?= ($show && $show['contenido']) ? json_encode($show['contenido']) : 'null' ?>;
const SHOW_META = <?= json_encode(['fecha_show' => $show['fecha_show'] ?? '', 'sala' => $show['sala'] ?? '', 'ciudad' => $show['ciudad'] ?? '']) ?>;
window.LANG     = <?= lang_js() ?>;
</script>
<script src="<?= BASE_URL ?>/assets/js/editor.js"></script>
</body>
</html>
