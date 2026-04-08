<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$gs  = new GoogleSheets();
$id  = trim($_GET['id'] ?? '');
$chiste      = null;
$chiste_tags = [];

if ($id) {
    $chiste = $gs->getChisteById($id);
    if (!$chiste) redirect('/chistes.php');
    $chiste_tags = $chiste['tags'] ?? [];
}

$categorias = $gs->getCategorias();
$page_title = $id ? 'Editar chiste' : 'Nuevo chiste';
include __DIR__ . '/includes/header.php';
?>

<div class="page-header">
    <h2><?= $id ? 'Editar chiste' : 'Nuevo chiste' ?></h2>
    <a href="chistes.php" class="btn btn-ghost">← Volver</a>
</div>

<form id="chiste-form" class="form-card" data-id="<?= h($id) ?>">
    <div class="form-group">
        <label for="texto">Texto del chiste</label>
        <textarea id="texto" name="texto" rows="8" required placeholder="Escribe tu chiste aquí..."><?= $chiste ? h($chiste['texto']) : '' ?></textarea>
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="categoria">Categoría</label>
            <select id="categoria" name="categoria">
                <option value="">Sin categoría</option>
                <?php foreach ($categorias as $cat): ?>
                    <option value="<?= h($cat) ?>" <?= ($chiste && $chiste['categoria'] === $cat) ? 'selected' : '' ?>>
                        <?= h($cat) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="form-group">
            <label for="estado">Estado</label>
            <select id="estado" name="estado">
                <option value="borrador"   <?= ($chiste && $chiste['estado'] === 'borrador')   ? 'selected' : '' ?>>Borrador</option>
                <option value="desarrollo" <?= ($chiste && $chiste['estado'] === 'desarrollo')  ? 'selected' : '' ?>>En desarrollo</option>
                <option value="probado"    <?= ($chiste && $chiste['estado'] === 'probado')     ? 'selected' : '' ?>>Probado</option>
                <option value="rotacion"   <?= ($chiste && $chiste['estado'] === 'rotacion')    ? 'selected' : '' ?>>En rotación</option>
                <option value="retirado"   <?= ($chiste && $chiste['estado'] === 'retirado')    ? 'selected' : '' ?>>Retirado</option>
            </select>
        </div>

        <div class="form-group">
            <label>Puntuación</label>
            <div class="stars-input" id="stars-input" data-value="<?= $chiste ? (int)($chiste['puntuacion'] ?? 0) : 0 ?>">
                <?php for ($i = 1; $i <= 5; $i++): ?>
                    <span class="star-btn" data-val="<?= $i ?>">★</span>
                <?php endfor; ?>
                <span class="star-clear" title="Sin puntuar">×</span>
            </div>
            <input type="hidden" id="puntuacion" name="puntuacion" value="<?= $chiste ? (int)($chiste['puntuacion'] ?? 0) : '' ?>">
        </div>

        <div class="form-group">
            <label for="duracion">Duración (min)</label>
            <?php
                $durSec = $chiste ? ($chiste['duracion'] ?? null) : null;
                $durMin = $durSec !== null ? round($durSec / 60, 1) : '';
            ?>
            <input type="number" id="duracion" name="duracion" min="0" step="0.5"
                   placeholder="ej. 3.5" value="<?= h((string)$durMin) ?>" class="form-input-short">
        </div>
    </div>

    <div class="form-group">
        <label for="tags-input">Tags</label>
        <div class="tags-field" id="tags-field">
            <?php foreach ($chiste_tags as $tag): ?>
                <span class="tag-chip"><?= h($tag) ?><button type="button" class="tag-remove" data-tag="<?= h($tag) ?>">×</button></span>
            <?php endforeach; ?>
            <input type="text" id="tags-input" placeholder="Añadir tag y pulsar Enter..." autocomplete="off">
        </div>
        <input type="hidden" id="tags-hidden" name="tags" value="<?= h(implode(',', $chiste_tags)) ?>">
    </div>

    <div class="form-group">
        <label>Callbacks <span class="label-hint">(chistes que este referencia)</span></label>
        <div class="callbacks-field" id="callbacks-field">
            <div class="callbacks-chips" id="callbacks-chips"></div>
            <div class="callbacks-search-wrap">
                <input type="text" id="callbacks-search" placeholder="Buscar chiste..." autocomplete="off">
                <ul id="callbacks-suggestions" class="callbacks-suggestions"></ul>
            </div>
        </div>
        <input type="hidden" id="callbacks-hidden" name="callbacks"
               value="<?= h(json_encode($chiste ? ($chiste['callbacks'] ?? []) : [])) ?>">
    </div>

    <div class="form-actions">
        <?php if ($id): ?>
            <button type="button" id="delete-btn" class="btn btn-danger">Eliminar</button>
        <?php endif; ?>
        <button type="submit" class="btn btn-primary">Guardar</button>
    </div>
    <div id="form-status" class="form-status"></div>
</form>

<?php if ($id): ?>
<section class="form-card historial-section">
    <h3 class="historial-title">Historial de shows</h3>
    <div id="historial-content"><p class="text-muted">Cargando...</p></div>
</section>
<?php endif; ?>

<script>
const CHISTE_ID = '<?= h($id) ?>';
</script>
<script src="assets/js/chiste_form.js"></script>
<?php include __DIR__ . '/includes/footer.php'; ?>
