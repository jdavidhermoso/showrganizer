<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$gs = new GoogleSheets();
$id = trim($_GET['id'] ?? '');
if (!$id) redirect('/bloques.php');

$bloque = $gs->getBloqueById($id);
if (!$bloque) redirect('/bloques.php');

$page_title = h($bloque['titulo']);
include __DIR__ . '/includes/header.php';
?>

<div class="page-header">
    <h2 id="bloque-titulo-display"><?= h($bloque['titulo']) ?></h2>
    <a href="bloques.php" class="btn btn-ghost"><?= h(t('back')) ?></a>
</div>

<div class="form-card" style="max-width:860px">
    <div class="form-group">
        <label for="titulo-input"><?= h(t('bloque_name_label')) ?></label>
        <input type="text" id="titulo-input" style="width:100%" value="<?= h($bloque['titulo']) ?>" maxlength="255" autocomplete="off">
    </div>
    <div class="form-group">
        <label for="desc-input"><?= h(t('bloque_desc_label')) ?></label>
        <input type="text" id="desc-input" style="width:100%" value="<?= h($bloque['descripcion']) ?>" maxlength="500" autocomplete="off" placeholder="<?= h(t('bloque_desc_ph')) ?>">
    </div>
    <div id="save-status" class="form-status" style="text-align:left;margin-bottom:0.5rem"></div>
</div>

<div class="section-header" style="margin-top:1.5rem">
    <h3><?= h(t('bloque_jokes_label')) ?> <span id="joke-count" class="text-muted" style="font-size:0.85rem;font-weight:400"></span><span id="bloque-total-dur" class="text-muted" style="font-size:0.85rem;font-weight:400;margin-left:0.5rem"></span></h3>
</div>

<div class="bloque-search-wrap">
    <input type="text" id="joke-search" placeholder="<?= h(t('search_joke_ph')) ?>" autocomplete="off" class="filter-input">
    <ul id="joke-suggestions" class="callbacks-suggestions"></ul>
</div>

<ul id="bloque-jokes-list" class="bloque-jokes-list">
    <li class="bloque-empty-hint" id="bloque-empty-hint" style="display:none"><?= h(t('bloque_empty_hint')) ?></li>
</ul>

<script>
const BLOQUE_ID = <?= json_encode($id) ?>;
const INITIAL_CHISTES = <?= json_encode($bloque['chistes']) ?>;
</script>
<script src="<?= BASE_URL ?>/assets/js/bloque_editor.js"></script>
<?php include __DIR__ . '/includes/footer.php'; ?>
