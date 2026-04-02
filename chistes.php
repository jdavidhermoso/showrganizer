<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$gs   = new GoogleSheets();
$cats = $gs->getCategorias();

$page_title = 'Chistes';
include __DIR__ . '/includes/header.php';
?>

<div class="page-header">
    <h2>Chistes</h2>
    <a href="importar.php" class="btn btn-ghost">Importar</a>
    <a href="chiste_form.php" class="btn btn-primary">+ Nuevo chiste</a>
</div>

<div class="filters-bar">
    <input type="text" id="filter-text" placeholder="Buscar..." class="filter-input">
    <select id="filter-estado" class="filter-select">
        <option value="">Todos los estados</option>
        <option value="borrador">Borrador</option>
        <option value="desarrollo">En desarrollo</option>
        <option value="probado">Probado</option>
        <option value="retirado">Retirado</option>
    </select>
    <select id="filter-categoria" class="filter-select">
        <option value="">Todas las categorías</option>
        <?php foreach ($cats as $cat): ?>
            <option value="<?= h($cat) ?>"><?= h($cat) ?></option>
        <?php endforeach; ?>
    </select>
    <select id="filter-puntuacion" class="filter-select">
        <option value="">Cualquier puntuación</option>
        <option value="5">★★★★★</option>
        <option value="4">★★★★☆</option>
        <option value="3">★★★☆☆</option>
        <option value="2">★★☆☆☆</option>
        <option value="1">★☆☆☆☆</option>
        <option value="0">Sin puntuar</option>
    </select>
    <button id="filter-clear" class="btn btn-ghost">Limpiar</button>
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
            <a href="" class="btn btn-ghost btn-sm">Editar</a>
        </div>
    </article>
</template>

<script src="assets/js/chistes.js"></script>
<?php include __DIR__ . '/includes/footer.php'; ?>
