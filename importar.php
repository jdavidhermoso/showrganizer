<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/lib/GoogleSheets.php';
require_login();

$gs         = new GoogleSheets();
$categorias = $gs->getCategorias();
$error      = '';
$paragraphs = [];
$step       = 'upload';

session_start_safe();
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf_token, $_POST['csrf_token'] ?? '')) {
        die(h(t('invalid_request')));
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['confirm'])) {
    $textos       = $_POST['textos'] ?? [];
    $categoria    = $_POST['categoria'] ?? '';
    $estado       = in_array($_POST['estado'] ?? '', ['borrador','desarrollo','probado','retirado'])
                    ? $_POST['estado'] : 'borrador';
    foreach ($textos as $texto) {
        $texto = trim($texto);
        if ($texto === '') continue;
        $gs->appendChiste(['texto' => $texto, 'categoria' => $categoria, 'estado' => $estado]);
    }
    redirect('/chistes.php');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['archivo'])) {
    $file = $_FILES['archivo'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $error = t('error_upload', $file['error']);
    } else {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($ext === 'docx')      $paragraphs = parse_docx($file['tmp_name']);
        elseif ($ext === 'txt')   $paragraphs = parse_txt($file['tmp_name']);
        else                      $error = t('error_unsupported');

        if (!$error && empty($paragraphs)) $error = t('error_no_paragraphs');
        if (!$error) $step = 'preview';
    }
}

function parse_docx(string $path): array {
    if (!class_exists('ZipArchive')) return [];
    $zip = new ZipArchive();
    if ($zip->open($path) !== true) return [];
    $xml = $zip->getFromName('word/document.xml');
    $zip->close();
    if (!$xml) return [];
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadXML($xml);
    libxml_clear_errors();
    $ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    $paras = $dom->getElementsByTagNameNS($ns, 'p');
    $result = []; $current = [];
    foreach ($paras as $p) {
        $runs = $p->getElementsByTagNameNS($ns, 't');
        $line = '';
        foreach ($runs as $t) $line .= $t->textContent;
        $line = trim($line);
        if ($line === '') { if ($current) { $result[] = implode("\n", $current); $current = []; } }
        else $current[] = $line;
    }
    if ($current) $result[] = implode("\n", $current);
    return $result;
}

function parse_txt(string $path): array {
    $content = file_get_contents($path);
    if ($content === false) return [];
    $content = str_replace(["\r\n", "\r"], "\n", $content);
    $blocks  = preg_split('/\n{2,}/', $content);
    return array_values(array_filter(array_map('trim', $blocks)));
}

$page_title = t('import_title');
include __DIR__ . '/includes/header.php';
?>

<div class="page-header">
    <h2><?= h(t('import_title')) ?></h2>
    <a href="chistes.php" class="btn btn-ghost"><?= h(t('back')) ?></a>
</div>

<?php if ($step === 'upload'): ?>
    <?php if ($error): ?><p class="alert alert-err"><?= h($error) ?></p><?php endif; ?>
    <div class="form-card" style="max-width:480px">
        <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1.25rem">
            <?= t('upload_hint') ?>
        </p>
        <form method="post" enctype="multipart/form-data">
            <input type="hidden" name="csrf_token" value="<?= h($csrf_token) ?>">
            <div class="form-group">
                <label for="archivo"><?= h(t('file_label')) ?></label>
                <input type="file" name="archivo" id="archivo" accept=".docx,.txt" required style="padding:0.4rem;cursor:pointer">
            </div>
            <div class="form-actions" style="margin-top:1rem">
                <button type="submit" class="btn btn-primary"><?= h(t('analyze_file')) ?></button>
            </div>
        </form>
    </div>

<?php elseif ($step === 'preview'): ?>
    <form method="post">
        <input type="hidden" name="confirm" value="1">
        <input type="hidden" name="csrf_token" value="<?= h($csrf_token) ?>">
        <div class="import-toolbar">
            <span class="import-count" id="import-count"><?= h(t('paragraphs_found', count($paragraphs))) ?></span>
            <div class="import-bulk">
                <select name="categoria" class="filter-select">
                    <option value=""><?= h(t('no_category')) ?></option>
                    <?php foreach ($categorias as $cat): ?>
                        <option value="<?= h($cat) ?>"><?= h($cat) ?></option>
                    <?php endforeach; ?>
                </select>
                <select name="estado" class="filter-select">
                    <option value="borrador"><?= h(t('status_draft')) ?></option>
                    <option value="desarrollo"><?= h(t('status_dev')) ?></option>
                    <option value="probado"><?= h(t('status_tested')) ?></option>
                    <option value="retirado"><?= h(t('status_retired')) ?></option>
                </select>
            </div>
            <div style="display:flex;gap:0.5rem;align-items:center">
                <button type="button" class="btn btn-ghost btn-sm" onclick="toggleAll(true)"><?= h(t('select_all')) ?></button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="toggleAll(false)"><?= h(t('deselect_all')) ?></button>
                <button type="submit" class="btn btn-primary" id="import-btn"><?= h(t('import_btn', count($paragraphs))) ?></button>
            </div>
        </div>

        <div class="import-list" id="import-list">
            <?php foreach ($paragraphs as $i => $texto): ?>
            <label class="import-item">
                <input type="checkbox" name="textos[]" value="<?= h($texto) ?>" checked onchange="updateCount()">
                <span class="import-item-text"><?= h($texto) ?></span>
            </label>
            <?php if ($i < count($paragraphs) - 1): ?>
            <div class="merge-bar">
                <button type="button" class="merge-btn" onclick="mergeWithNext(this)"><?= h(t('merge_next')) ?></button>
            </div>
            <?php endif; ?>
            <?php endforeach; ?>
        </div>
    </form>

    <style>
        .import-toolbar { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; margin-bottom:1rem; padding:.75rem 1rem; background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); }
        .import-count { font-size:.88rem; color:var(--text-muted); margin-right:auto; }
        .import-bulk  { display:flex; gap:.5rem; }
        .import-list  { display:flex; flex-direction:column; gap:.5rem; }
        .import-item  { display:flex; align-items:flex-start; gap:.75rem; padding:.75rem 1rem; background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); cursor:pointer; transition:border-color .1s, opacity .1s; }
        .import-item:has(input:not(:checked)) { opacity:.45; }
        .import-item input[type=checkbox] { width:auto; margin-top:.2rem; flex-shrink:0; accent-color:var(--accent); }
        .import-item-text { font-family:var(--font-mono); font-size:.9rem; line-height:1.55; white-space:pre-wrap; word-break:break-word; }
        .merge-bar { display:flex; justify-content:center; margin:-.15rem 0; }
        .merge-btn { background:none; border:1px dashed var(--border); border-radius:100px; color:var(--text-muted); font-size:.75rem; padding:.15rem .8rem; cursor:pointer; transition:color .1s, border-color .1s, background .1s; }
        .merge-btn:hover { color:var(--accent); border-color:var(--accent); background:rgba(240,160,48,.06); }
    </style>
    <script>
        var IMPORT_TPL_COUNT  = <?= json_encode(t('paragraphs_found', 0)) ?>;
        var IMPORT_TPL_BTN    = <?= json_encode(t('import_btn', 0)) ?>;
        function updateCount() {
            const n = document.querySelectorAll('#import-list input:checked').length;
            document.getElementById('import-count').textContent = IMPORT_TPL_COUNT.replace('0', n);
            document.getElementById('import-btn').textContent   = IMPORT_TPL_BTN.replace('0', n);
        }
        function toggleAll(state) { document.querySelectorAll('#import-list input[type=checkbox]').forEach(cb => cb.checked = state); updateCount(); }
        function mergeWithNext(btn) {
            const bar = btn.closest('.merge-bar');
            const itemA = bar.previousElementSibling;
            const itemB = bar.nextElementSibling?.classList.contains('import-item') ? bar.nextElementSibling : bar.nextElementSibling?.nextElementSibling;
            if (!itemB?.classList.contains('import-item')) return;
            const cbA = itemA.querySelector('input[type=checkbox]'), cbB = itemB.querySelector('input[type=checkbox]');
            const newText = cbA.value + '\n' + cbB.value;
            cbA.value = newText; itemA.querySelector('.import-item-text').textContent = newText;
            const nextBar = itemB.nextElementSibling;
            itemB.remove(); bar.remove();
            const list = document.getElementById('import-list');
            if (list.lastElementChild?.classList.contains('merge-bar')) list.lastElementChild.remove();
            updateCount();
        }
    </script>
<?php endif; ?>

<?php include __DIR__ . '/includes/footer.php'; ?>
