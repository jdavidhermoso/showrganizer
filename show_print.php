<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$id = trim($_GET['id'] ?? '');
if (!$id) redirect('/shows.php');

$gs   = new GoogleSheets();
$show = $gs->getShowById($id);
if (!$show) redirect('/shows.php');

$blocks = $show['contenido']['blocks'] ?? [];

// Build a map of all jokes (needed for both individual jokes and bloque expansion)
$all_chistes = $gs->getAllChistes();
$jokes_map   = [];
foreach ($all_chistes as $c) {
    $jokes_map[$c['id']] = $c['texto'];
}

// Build a map of bloques id → bloque data (titulo + ordered chiste IDs)
$bloques_map = [];
foreach ($gs->getAllBloques() as $b) {
    $bloques_map[$b['id']] = $b;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title><?= h($show['titulo']) ?></title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 12pt; line-height: 1.2; color: #111; background: #fff; padding: 2.5cm 3cm; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 22pt; font-weight: bold; margin-bottom: 0.5rem; border-bottom: 2px solid #111; padding-bottom: 0.4rem; }
        .show-date { font-size: 9pt; color: #666; margin-bottom: 2rem; }
        .block-text { margin-bottom: 1rem; white-space: pre-wrap; font-style: italic; color: #444; }
        .block-joke { margin-bottom: 1.4rem; padding-left: 1rem; border-left: 3px solid #111; white-space: pre-wrap; }
        .block-bloque-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin: 2rem 0 0.75rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
        .pausa-tag { display: block; text-align: center; font-size: 8pt; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: #888; margin: 0.6em 0; padding: 0.3em 0; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; }
        .no-print { position: fixed; top: 1.5rem; right: 1.5rem; display: flex; gap: 0.5rem; }
        .no-print button { padding: 0.5rem 1.2rem; background: #111; color: #fff; border: none; border-radius: 5px; font-size: 10pt; cursor: pointer; }
        .no-print button:hover { background: #333; }
        .no-print .btn-close { background: transparent; color: #555; border: 1px solid #ccc; }
        .no-print .btn-close:hover { background: #f0f0f0; }
        .block-bloque-section { break-inside: auto; }
        @media print {
            .no-print { display: none; }
            body { padding: 0; }
            .block-bloque-title { break-after: avoid; page-break-after: avoid; }
        }
    </style>
</head>
<body>
<div class="no-print">
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
    <button class="btn-close" onclick="window.close()">Cerrar</button>
</div>
<h1><?= h($show['titulo']) ?></h1>
<p class="show-date"><?= h(substr($show['fecha_creacion'], 0, 10)) ?></p>

<?php foreach ($blocks as $block): ?>
    <?php if ($block['type'] === 'text' && trim(strip_tags($block['content'] ?? '')) !== ''): ?>
        <div class="block-text"><?= nl2br(h(html_entity_decode(strip_tags($block['content']), ENT_QUOTES, 'UTF-8'))) ?></div>

    <?php elseif ($block['type'] === 'joke' && isset($jokes_map[$block['joke_id']])): ?>
        <div class="block-joke"><?= nl2br(render_bold(h($jokes_map[$block['joke_id']]))) ?></div>

    <?php elseif ($block['type'] === 'bloque' && isset($bloques_map[$block['bloque_id']])): ?>
        <?php $bloque = $bloques_map[$block['bloque_id']]; ?>
        <div class="block-bloque-section">
            <div class="block-bloque-title">📦 <?= h($bloque['titulo']) ?></div>
            <?php foreach ($bloque['chistes'] as $joke_id): ?>
                <?php if (isset($jokes_map[$joke_id])): ?>
                    <div class="block-joke"><?= nl2br(render_bold(h($jokes_map[$joke_id]))) ?></div>
                <?php endif; ?>
            <?php endforeach; ?>
        </div>

    <?php endif; ?>
<?php endforeach; ?>

<script>window.addEventListener('load', () => window.print());</script>
</body>
</html>
