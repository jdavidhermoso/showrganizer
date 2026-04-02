<?php
$title   = isset($page_title) ? $page_title . ' · ' . APP_NAME : APP_NAME;
$current = basename($_SERVER['PHP_SELF'], '.php');
$lang    = get_lang();
$html_lang = ['es' => 'es', 'en' => 'en', 'de' => 'de'][$lang] ?? 'es';
?>
<!DOCTYPE html>
<html lang="<?= $html_lang ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title><?= h($title) ?></title>
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/main.css">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#1a1d25">
    <link rel="apple-touch-icon" href="/assets/logo-192.png">
    <script>(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}());</script>
    <script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');</script>
</head>
<body>
<nav class="navbar">
    <button class="burger-btn" id="sidebar-toggle" aria-label="<?= h(t('open_menu')) ?>">
        <span></span><span></span><span></span>
    </button>
    <a href="<?= BASE_URL ?>/dashboard.php" class="navbar-brand">
        <img src="<?= BASE_URL ?>/assets/logo.webp" alt="<?= APP_NAME ?>" class="navbar-logo">
        <?= APP_NAME ?>
    </a>
    <div class="navbar-right">
        <a href="<?= BASE_URL ?>/logout.php" class="navbar-logout"><?= h(t('logout')) ?></a>
    </div>
</nav>

<div class="sidebar-overlay" id="sidebar-overlay"></div>
<aside class="sidebar" id="sidebar" aria-label="<?= h(t('nav_jokes')) ?>">
    <div class="sidebar-header">
        <a href="<?= BASE_URL ?>/dashboard.php" class="navbar-brand">
            <img src="<?= BASE_URL ?>/assets/logo.webp" alt="<?= APP_NAME ?>" class="navbar-logo">
            <?= APP_NAME ?>
        </a>
        <button class="sidebar-close" id="sidebar-close" aria-label="<?= h(t('close_menu')) ?>">×</button>
    </div>
    <nav class="sidebar-nav">
        <a href="<?= BASE_URL ?>/chistes.php" class="sidebar-link <?= $current === 'chistes' ? 'active' : '' ?>">
            <span class="sidebar-link-icon">📝</span> <?= h(t('nav_jokes')) ?>
        </a>
        <a href="<?= BASE_URL ?>/shows.php" class="sidebar-link <?= $current === 'shows' ? 'active' : '' ?>">
            <span class="sidebar-link-icon">🎤</span> <?= h(t('nav_shows')) ?>
        </a>
        <a href="<?= BASE_URL ?>/bloques.php" class="sidebar-link <?= in_array($current, ['bloques','bloque_editor']) ? 'active' : '' ?>">
            <span class="sidebar-link-icon">📦</span> <?= h(t('nav_bloques')) ?>
        </a>
        <hr class="sidebar-sep">
        <button class="sidebar-link sidebar-theme-toggle" id="theme-toggle" aria-label="<?= h(t('dark_theme')) ?>">
            <span class="sidebar-link-icon" id="theme-icon">🌙</span>
            <span id="theme-label"><?= h(t('dark_theme')) ?></span>
        </button>
        <hr class="sidebar-sep">
        <div class="sidebar-lang-row">
            <span class="sidebar-lang-label"><?= h(t('language')) ?></span>
            <div class="sidebar-lang-btns">
                <?php foreach (['es' => 'ES', 'en' => 'EN', 'de' => 'DE'] as $code => $label): ?>
                <form method="post" action="<?= BASE_URL ?>/setlang.php" style="display:inline">
                    <button type="submit" name="lang" value="<?= $code ?>"
                            class="lang-btn<?= $lang === $code ? ' active' : '' ?>"><?= $label ?></button>
                </form>
                <?php endforeach; ?>
            </div>
        </div>
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

    var DARK_LABEL  = <?= json_encode(t('dark_theme'))  ?>;
    var LIGHT_LABEL = <?= json_encode(t('light_theme')) ?>;

    function updateTheme(){
        var light = document.documentElement.classList.contains('light');
        themeIcon.textContent  = light ? '🌙' : '☀️';
        themeLabel.textContent = light ? DARK_LABEL : LIGHT_LABEL;
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
<button id="global-fab" class="global-fab" aria-label="<?= h(t('new_joke')) ?>">+</button>

<div id="global-composer-overlay" class="modal-overlay" style="display:none">
    <div class="modal-box composer-modal">
        <div class="composer-modal-header">
            <h3><?= h(t('new_joke_modal_title')) ?></h3>
            <button id="global-composer-close" class="modal-close-btn">×</button>
        </div>
        <textarea id="global-composer-texto" placeholder="<?= h(t('composer_ph')) ?>" rows="4" autocomplete="off"></textarea>
        <div class="composer-meta">
            <select id="global-composer-cat" class="filter-select">
                <option value=""><?= h(t('no_category')) ?></option>
            </select>
            <select id="global-composer-estado" class="filter-select">
                <option value="borrador"><?= h(t('status_draft')) ?></option>
                <option value="desarrollo"><?= h(t('status_dev')) ?></option>
                <option value="probado"><?= h(t('status_tested')) ?></option>
                <option value="rotacion"><?= h(t('status_rotation')) ?></option>
                <option value="retirado"><?= h(t('status_retired')) ?></option>
            </select>
        </div>
        <div class="composer-stars" id="global-composer-stars-input" data-value="0">
            <span class="star-btn">★</span>
            <span class="star-btn">★</span>
            <span class="star-btn">★</span>
            <span class="star-btn">★</span>
            <span class="star-btn">★</span>
            <span class="star-clear" title="<?= h(t('no_rating')) ?>">×</span>
        </div>
        <input type="hidden" id="global-composer-puntuacion" value="">
        <div class="tags-field" id="global-composer-tags-field">
            <input type="text" id="global-composer-tags-input" placeholder="<?= h(t('tags_ph')) ?>" autocomplete="off">
        </div>
        <div class="composer-footer">
            <button id="global-composer-submit" class="btn btn-primary"><?= h(t('save')) ?></button>
        </div>
        <div id="global-composer-status" class="composer-status"></div>
    </div>
</div>

<script>
const BASE_URL = '<?= BASE_URL ?>';
window.LANG = <?= lang_js() ?>;
</script>
<script src="<?= BASE_URL ?>/assets/js/composer.js"></script>

<main class="main-content">
