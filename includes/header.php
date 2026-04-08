<?php
$title = isset($page_title) ? $page_title . ' · ' . APP_NAME : APP_NAME;
$current = basename($_SERVER['PHP_SELF'], '.php');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= h($title) ?></title>
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/main.css">
    <script>(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}());</script>
</head>
<body>
<nav class="navbar">
    <button class="burger-btn" id="sidebar-toggle" aria-label="Abrir menú">
        <span></span><span></span><span></span>
    </button>
    <a href="<?= BASE_URL ?>/dashboard.php" class="navbar-brand">
        <img src="<?= BASE_URL ?>/assets/logo.webp" alt="<?= APP_NAME ?>" class="navbar-logo">
        <?= APP_NAME ?>
    </a>
    <div class="navbar-right">
        <a href="<?= BASE_URL ?>/logout.php" class="navbar-logout">Salir</a>
    </div>
</nav>

<div class="sidebar-overlay" id="sidebar-overlay"></div>
<aside class="sidebar" id="sidebar" aria-label="Navegación">
    <div class="sidebar-header">
        <a href="<?= BASE_URL ?>/dashboard.php" class="navbar-brand">
            <img src="<?= BASE_URL ?>/assets/logo.webp" alt="<?= APP_NAME ?>" class="navbar-logo">
            <?= APP_NAME ?>
        </a>
        <button class="sidebar-close" id="sidebar-close" aria-label="Cerrar menú">×</button>
    </div>
    <nav class="sidebar-nav">
        <a href="<?= BASE_URL ?>/chistes.php" class="sidebar-link <?= $current === 'chistes' ? 'active' : '' ?>">
            <span class="sidebar-link-icon">📝</span> Chistes
        </a>
        <a href="<?= BASE_URL ?>/shows.php" class="sidebar-link <?= $current === 'shows' ? 'active' : '' ?>">
            <span class="sidebar-link-icon">🎤</span> Shows
        </a>
        <hr class="sidebar-sep">
        <button class="sidebar-link sidebar-theme-toggle" id="theme-toggle" aria-label="Cambiar tema">
            <span class="sidebar-link-icon" id="theme-icon">🌙</span>
            <span id="theme-label">Tema oscuro</span>
        </button>
    </nav>
</aside>

<script>
(function(){
    var themeBtn   = document.getElementById('theme-toggle');
    var themeIcon  = document.getElementById('theme-icon');
    var themeLabel = document.getElementById('theme-label');
    var toggle     = document.getElementById('sidebar-toggle');
    var sidebar    = document.getElementById('sidebar');
    var overlay    = document.getElementById('sidebar-overlay');
    var close      = document.getElementById('sidebar-close');

    function updateTheme(){
        var light = document.documentElement.classList.contains('light');
        themeIcon.textContent  = light ? '🌙' : '☀️';
        themeLabel.textContent = light ? 'Tema oscuro' : 'Tema claro';
    }
    updateTheme();
    themeBtn.addEventListener('click', function(){
        var isLight = document.documentElement.classList.toggle('light');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        updateTheme();
    });

    function openSidebar(){
        sidebar.classList.add('open');
        overlay.classList.add('open');
        document.body.classList.add('sidebar-open');
        toggle.setAttribute('aria-expanded', 'true');
    }
    function closeSidebar(){
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function(e){
        e.stopPropagation();
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    close.addEventListener('click', closeSidebar);
    document.addEventListener('click', function(e){
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
            closeSidebar();
        }
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeSidebar(); });
}());
</script>
<button id="global-fab" class="global-fab" aria-label="Nuevo chiste">+</button>

<div id="global-composer-overlay" class="modal-overlay" style="display:none">
    <div class="modal-box composer-modal">
        <div class="composer-modal-header">
            <h3>Nuevo chiste</h3>
            <button id="global-composer-close" class="modal-close-btn">×</button>
        </div>
        <textarea id="global-composer-texto" placeholder="¿De qué va el chiste?" rows="4" autocomplete="off"></textarea>
        <div class="composer-meta">
            <select id="global-composer-cat" class="filter-select">
                <option value="">Sin categoría</option>
            </select>
            <select id="global-composer-estado" class="filter-select">
                <option value="borrador">Borrador</option>
                <option value="desarrollo">En desarrollo</option>
                <option value="probado">Probado</option>
                <option value="rotacion">En rotación</option>
                <option value="retirado">Retirado</option>
            </select>
        </div>
        <div class="composer-stars" id="global-composer-stars-input" data-value="0">
            <span class="star-btn">★</span>
            <span class="star-btn">★</span>
            <span class="star-btn">★</span>
            <span class="star-btn">★</span>
            <span class="star-btn">★</span>
            <span class="star-clear" title="Sin puntuar">×</span>
        </div>
        <input type="hidden" id="global-composer-puntuacion" value="">
        <div class="tags-field" id="global-composer-tags-field">
            <input type="text" id="global-composer-tags-input" placeholder="Tags (Enter para añadir)..." autocomplete="off">
        </div>
        <div class="composer-footer">
            <button id="global-composer-submit" class="btn btn-primary">Guardar</button>
        </div>
        <div id="global-composer-status" class="composer-status"></div>
    </div>
</div>

<script>const BASE_URL = '<?= BASE_URL ?>';</script>
<script src="<?= BASE_URL ?>/assets/js/composer.js"></script>

<main class="main-content">
