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
    <a href="<?= BASE_URL ?>/dashboard.php" class="navbar-brand"><?= APP_NAME ?></a>
    <ul class="navbar-nav">
        <li><a href="<?= BASE_URL ?>/chistes.php" class="<?= $current === 'chistes' ? 'active' : '' ?>">Chistes</a></li>
        <li><a href="<?= BASE_URL ?>/shows.php" class="<?= $current === 'shows' ? 'active' : '' ?>">Shows</a></li>
    </ul>
    <div class="navbar-right">
        <button class="theme-toggle" id="theme-toggle" aria-label="Cambiar tema" title="Cambiar tema">☀️</button>
        <a href="<?= BASE_URL ?>/logout.php" class="navbar-logout">Salir</a>
    </div>
</nav>
<script>
(function(){
    var btn = document.getElementById('theme-toggle');
    function update(){
        var light = document.documentElement.classList.contains('light');
        btn.textContent = light ? '🌙' : '☀️';
    }
    update();
    btn.addEventListener('click', function(){
        var isLight = document.documentElement.classList.toggle('light');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        update();
    });
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
        <div class="composer-footer">
            <div class="composer-meta">
                <select id="global-composer-cat" class="filter-select">
                    <option value="">Sin categoría</option>
                </select>
                <select id="global-composer-estado" class="filter-select">
                    <option value="borrador">Borrador</option>
                    <option value="desarrollo">En desarrollo</option>
                    <option value="probado">Probado</option>
                </select>
            </div>
            <button id="global-composer-submit" class="btn btn-primary">Guardar</button>
        </div>
        <div id="global-composer-status" class="composer-status"></div>
    </div>
</div>

<script>const BASE_URL = '<?= BASE_URL ?>';</script>
<script src="<?= BASE_URL ?>/assets/js/composer.js"></script>

<main class="main-content">
