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

$page_title = $show ? h($show['titulo']) : 'Nuevo show';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?> · <?= APP_NAME ?></title>
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/main.css">
    <script>(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}());</script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
</head>
<body class="editor-body">

<div class="editor-topbar">
    <a href="<?= BASE_URL ?>/shows.php" class="editor-back">←</a>
    <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Abrir lista de chistes">☰ Chistes</button>
    <input type="text" id="show-titulo" class="editor-title-input"
           value="<?= $show ? h($show['titulo']) : '' ?>"
           placeholder="Título...">
    <button class="theme-toggle" id="theme-toggle-editor" aria-label="Cambiar tema">☀️</button>
    <div class="editor-topbar-right">
        <span id="save-status" class="save-status"></span>
        <button id="save-btn" class="btn btn-primary">Guardar</button>
    </div>
</div>

<div class="editor-layout">
    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <aside class="editor-sidebar" id="editor-sidebar">
        <div class="sidebar-header"><span>Chistes</span></div>
        <div class="sidebar-filters">
            <input type="text" id="sidebar-search" placeholder="Buscar..." class="filter-input filter-input-sm">
            <select id="sidebar-estado" class="filter-select filter-select-sm">
                <option value="">Todos</option>
                <option value="borrador">Borrador</option>
                <option value="desarrollo">En desarrollo</option>
                <option value="probado">Probado</option>
                <option value="retirado">Retirado</option>
            </select>
        </div>
        <div id="sidebar-jokes-list" class="sidebar-jokes-list">
            <p class="sidebar-loading">Cargando...</p>
        </div>
    </aside>

    <section class="editor-document">
        <div class="doc-add-bar">
            <button class="btn btn-ghost btn-sm" id="add-text-bottom">+ Texto</button>
            <button id="chart-toggle" class="btn btn-ghost btn-sm" title="Ver arco del show">Aplausos esperados</button>
            <?php if ($id): ?>
            <a href="<?= BASE_URL ?>/show_print.php?id=<?= h($id) ?>" target="_blank" class="btn btn-ghost btn-sm">PDF</a>
            <?php endif; ?>
        </div>
        <div id="document-blocks" class="document-blocks">
            <div class="doc-empty-state" id="doc-empty">
                <p>Arrastra chistes desde el panel o <button class="link-btn" id="add-first-text">escribe algo</button>.</p>
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
        </div>
        <p id="joke-popup-texto" class="joke-popup-texto"></p>
        <div id="joke-popup-tags" class="joke-block-tags"></div>
        <div class="modal-actions">
            <button id="joke-popup-close" class="btn btn-ghost">✕ Cerrar</button>
        </div>
    </div>
</div>

<div id="chart-overlay" class="chart-overlay"></div>
<div id="chart-panel" class="chart-panel">
    <div id="chart-resize-handle" class="chart-resize-handle"></div>
    <div class="chart-panel-inner">
        <div class="chart-panel-topbar">
            <span class="chart-panel-label">Aplausos esperados — puntuación por chiste</span>
            <button id="chart-panel-close" class="btn btn-ghost btn-sm">✕ Cerrar</button>
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

(function(){
    var btn = document.getElementById('theme-toggle-editor');
    function update(){ btn.textContent = document.documentElement.classList.contains('light') ? '🌙' : '☀️'; }
    update();
    btn.addEventListener('click', function(){
        var isLight = document.documentElement.classList.toggle('light');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        update();
    });
}());

const BASE_URL  = '<?= BASE_URL ?>';
const SHOW_ID   = '<?= h($id) ?>';
const SHOW_DATA = <?= ($show && $show['contenido']) ? json_encode($show['contenido']) : 'null' ?>;
</script>
<script src="<?= BASE_URL ?>/assets/js/editor.js"></script>
</body>
</html>
