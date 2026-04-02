<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/Database.php';
require_login();

$id   = trim($_GET['id'] ?? '');
$show = null;

if ($id) {
    $gs   = new Database();
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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

<!-- ── Top bar ──────────────────────────────────────────── -->
<div class="se-topbar">
    <a href="<?= BASE_URL ?>/shows.php" class="se-back-btn" aria-label="<?= h(t('back_to_shows')) ?>">←</a>
    <div class="se-title-area">
        <input type="text" id="show-titulo" class="se-title-input"
               value="<?= $show ? h($show['titulo']) : '' ?>"
               placeholder="<?= h(t('show_title_input_ph')) ?>">
        <button id="se-subtitle-btn" class="se-subtitle-btn" aria-label="<?= h(t('venue_ph')) ?>">
            <span id="se-subtitle-text" class="se-subtitle-text"></span>
        </button>
    </div>
    <button id="se-menu-btn" class="se-menu-btn" aria-label="Más opciones">⋮</button>
    <button id="save-btn" class="btn btn-primary se-save-btn"><?= h(t('save')) ?></button>
    <span id="save-status" class="save-status" style="display:none"></span>
</div>

<!-- ── Progress bar ─────────────────────────────────────── -->
<div class="se-progress-wrap">
    <div class="se-progress-track">
        <div class="se-progress-fill" id="se-progress-fill"></div>
    </div>
    <span class="se-progress-label" id="se-progress-label">0:00 /30 min</span>
</div>

<!-- ── Hidden meta inputs ───────────────────────────────── -->
<div id="se-meta-inputs" style="display:none">
    <input type="date"   id="show-fecha"   value="<?= h($show['fecha_show'] ?? '') ?>">
    <input type="text"   id="show-sala"    value="<?= h($show['sala'] ?? '') ?>">
    <input type="text"   id="show-ciudad"  value="<?= h($show['ciudad'] ?? '') ?>">
    <input type="number" id="show-duracion-obj" value="30" min="1" max="300">
</div>

<!-- ── Main document ────────────────────────────────────── -->
<div id="document-blocks" class="se-doc-blocks">
    <div class="doc-empty-state" id="doc-empty">
        <p><?= h(t('drag_hint')) ?> <button class="link-btn" id="add-first-text"><?= h(t('drag_hint_link')) ?></button>.</p>
    </div>
</div>

<!-- ── Bottom bar ───────────────────────────────────────── -->
<div class="se-bottom-bar">
    <button id="se-add-joke-btn" class="se-add-joke-btn">+ <?= h(t('nav_jokes')) ?></button>
    <button id="se-notes-btn" class="se-notes-btn" title="<?= h(t('add_text')) ?>">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 13.5V15h1.5l8.13-8.13-1.5-1.5L3 13.5zM14.71 4.29a1 1 0 0 0 0-1.42l-1.08-1.08a1 1 0 0 0-1.42 0L11 3l2.5 2.5 1.21-1.21z" fill="currentColor"/>
        </svg>
    </button>
</div>

<!-- ── Add joke sheet ───────────────────────────────────── -->
<div id="se-add-overlay" class="ch-sheet-overlay"></div>
<div id="se-add-sheet" class="ch-sheet se-add-sheet" aria-hidden="true">
    <div class="ch-sheet-handle-wrap"><div class="ch-sheet-handle"></div></div>
    <div class="ch-sheet-hdr-sticky">
        <span class="ch-sheet-title"><?= h(t('nav_jokes')) ?></span>
        <button id="se-add-close" class="ch-sheet-clear-btn">✕</button>
    </div>
    <div class="sidebar-filters" style="margin-bottom:0.75rem">
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
    <div id="sidebar-jokes-list" class="sidebar-jokes-list" style="overflow-y:auto;max-height:55vh"></div>
    <!-- bloques tab (hidden by default, accessible via menu) -->
    <div id="sidebar-panel-bloques" style="display:none">
        <div id="sidebar-bloques-list" class="sidebar-jokes-list"></div>
    </div>
</div>

<!-- ── Meta edit sheet ──────────────────────────────────── -->
<div id="se-meta-overlay" class="ch-sheet-overlay"></div>
<div id="se-meta-sheet" class="ch-sheet" aria-hidden="true">
    <div class="ch-sheet-handle-wrap"><div class="ch-sheet-handle"></div></div>
    <div class="ch-sheet-hdr-sticky">
        <span class="ch-sheet-title">Detalles del show</span>
        <button id="se-meta-close" class="ch-sheet-clear-btn">✕</button>
    </div>
    <div class="se-meta-form">
        <label class="se-meta-label"><?= h(t('venue_ph')) ?></label>
        <input type="text" id="se-meta-sala" class="se-meta-input" placeholder="<?= h(t('venue_ph')) ?>">
        <label class="se-meta-label"><?= h(t('city_ph')) ?></label>
        <input type="text" id="se-meta-ciudad" class="se-meta-input" placeholder="<?= h(t('city_ph')) ?>">
        <label class="se-meta-label"><?= h(t('duration_label')) ?></label>
        <input type="date" id="se-meta-fecha" class="se-meta-input">
        <label class="se-meta-label">Duración objetivo (min)</label>
        <input type="number" id="se-meta-durobj" class="se-meta-input" min="1" max="300" value="30">
    </div>
    <button id="se-meta-save" class="ch-sheet-apply" style="margin-top:1rem">Guardar</button>
</div>

<!-- ── Menu sheet ───────────────────────────────────────── -->
<div id="se-menu-overlay" class="ch-sheet-overlay"></div>
<div id="se-menu-sheet" class="ch-sheet se-menu-sheet" aria-hidden="true">
    <div class="ch-sheet-handle-wrap"><div class="ch-sheet-handle"></div></div>
    <div class="se-menu-list">
        <button class="se-menu-item" id="menu-add-text">
            <span class="se-menu-icon">📝</span> <?= h(t('add_text')) ?>
        </button>
        <button class="se-menu-item" id="menu-add-video">
            <span class="se-menu-icon">▶</span> <?= h(t('add_video')) ?>
        </button>
        <button class="se-menu-item" id="menu-add-bloque">
            <span class="se-menu-icon">📦</span> <?= h(t('nav_bloques')) ?>
        </button>
        <div class="se-menu-sep"></div>
        <button class="se-menu-item" id="menu-player">
            <span class="se-menu-icon">▶</span> <?= h(t('player_btn')) ?>
        </button>
        <button class="se-menu-item" id="menu-diagram">
            <span class="se-menu-icon">◫</span> <?= h(t('diagram_btn')) ?>
        </button>
        <button class="se-menu-item" id="menu-chart">
            <span class="se-menu-icon">📈</span> <?= h(t('laughs')) ?>
        </button>
        <?php if ($id): ?>
        <div class="se-menu-sep"></div>
        <a href="<?= BASE_URL ?>/show_print.php?id=<?= h($id) ?>" target="_blank" class="se-menu-item">
            <span class="se-menu-icon">⎙</span> PDF
        </a>
        <button class="se-menu-item" id="menu-export">
            <span class="se-menu-icon">↗</span> <?= h(t('export_text')) ?>
        </button>
        <button class="se-menu-item" id="menu-clone">
            <span class="se-menu-icon">⎘</span> <?= h(t('clone_show')) ?>
        </button>
        <?php endif; ?>
    </div>
</div>

<!-- ── Joke popup ───────────────────────────────────────── -->
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

<!-- ── Diagram overlay ──────────────────────────────────── -->
<div id="diagram-overlay" class="diagram-overlay">
    <div class="diagram-box">
        <div class="diagram-header">
            <span class="diagram-title-label" id="diagram-show-title"></span>
            <div class="diagram-header-actions">
                <button class="btn btn-ghost btn-sm" id="diagram-print">⎙ <?= h(t('export_text')) ?></button>
                <button class="player-close-btn" id="diagram-close">✕</button>
            </div>
        </div>
        <div class="diagram-body" id="diagram-body"></div>
    </div>
</div>

<!-- ── Player overlay ───────────────────────────────────── -->
<div id="player-overlay" class="player-overlay">
    <div class="player-box">
        <div class="player-topbar">
            <span id="player-pos" class="player-pos"></span>
            <div class="player-meta">
                <span id="player-category" class="player-category"></span>
                <strong id="player-dur" class="player-dur"></strong>
            </div>
            <button id="player-close" class="player-close-btn">✕</button>
        </div>
        <div class="player-body">
            <div id="player-text" class="player-joke-text"></div>
        </div>
        <div class="player-progress-wrap">
            <div id="player-progress-bar" class="player-progress-bar"></div>
        </div>
        <div class="player-controls">
            <button class="player-btn" id="player-prev">←</button>
            <button class="player-btn player-btn-play" id="player-playpause">▶</button>
            <button class="player-btn" id="player-next">→</button>
        </div>
    </div>
</div>

<!-- ── Chart panel ──────────────────────────────────────── -->
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
const BASE_URL  = '<?= BASE_URL ?>';
const SHOW_ID   = '<?= h($id) ?>';
const SHOW_DATA = <?= ($show && $show['contenido']) ? json_encode($show['contenido']) : 'null' ?>;
const SHOW_META = <?= json_encode(['fecha_show' => $show['fecha_show'] ?? '', 'sala' => $show['sala'] ?? '', 'ciudad' => $show['ciudad'] ?? '']) ?>;
window.LANG     = <?= lang_js() ?>;
</script>
<script src="<?= BASE_URL ?>/assets/js/editor.js"></script>
</body>
</html>
