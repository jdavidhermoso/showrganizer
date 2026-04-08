<?php
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../lib/GoogleSheets.php';

if (!is_logged_in()) json_error('No autorizado', 401);

try {
    $gs = new GoogleSheets();
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$id     = trim($_GET['id'] ?? '');

if ($method === 'GET') {
    if ($id) {
        $chiste = $gs->getChisteById($id);
        if (!$chiste) json_error('No encontrado', 404);
        json_response($chiste);
    }

    $all = $gs->getAllChistes();

    if (!empty($_GET['estado'])) {
        $all = array_filter($all, fn($c) => $c['estado'] === $_GET['estado']);
    }
    if (!empty($_GET['categoria'])) {
        $all = array_filter($all, fn($c) => $c['categoria'] === $_GET['categoria']);
    }
    if (isset($_GET['puntuacion']) && $_GET['puntuacion'] !== '') {
        $p = $_GET['puntuacion'];
        $all = array_filter($all, fn($c) =>
            $p === '0' ? $c['puntuacion'] === null : (string)$c['puntuacion'] === $p
        );
    }
    if (!empty($_GET['q'])) {
        $q = mb_strtolower($_GET['q']);
        $all = array_filter($all, function($c) use ($q) {
            if (mb_strpos(mb_strtolower($c['texto']), $q) !== false) return true;
            if (mb_strpos(mb_strtolower($c['categoria']), $q) !== false) return true;
            foreach ($c['tags'] as $t) {
                if (mb_strpos(mb_strtolower($t), $q) !== false) return true;
            }
            return false;
        });
    }
    if (!empty($_GET['tag'])) {
        $tag = $_GET['tag'];
        $all = array_filter($all, fn($c) => in_array($tag, $c['tags'], true));
    }

    json_response(array_values($all));
}

try {
    if ($method === 'POST') {
        $data  = get_request_body();
        $texto = trim($data['texto'] ?? '');
        if ($texto === '') json_error('El texto es obligatorio');

        $id = $gs->appendChisteWithTags([
            'texto'      => $texto,
            'categoria'  => $data['categoria'] ?? '',
            'puntuacion' => $data['puntuacion'] ?? null,
            'estado'     => $data['estado']    ?? 'borrador',
            'tags'       => $data['tags']      ?? [],
            'duracion'   => $data['duracion']  ?? null,
            'callbacks'  => $data['callbacks'] ?? [],
        ]);
        json_response(['id' => $id], 201);
    }

    if ($method === 'PUT') {
        if (!$id) json_error('ID requerido');
        $data  = get_request_body();
        $texto = trim($data['texto'] ?? '');
        if ($texto === '') json_error('El texto es obligatorio');

        $gs->updateChisteWithTags($id, [
            'texto'      => $texto,
            'categoria'  => $data['categoria'] ?? '',
            'puntuacion' => $data['puntuacion'] ?? null,
            'estado'     => $data['estado']    ?? 'borrador',
            'tags'       => $data['tags']      ?? [],
            'duracion'   => $data['duracion']  ?? null,
            'callbacks'  => $data['callbacks'] ?? [],
        ]);
        json_response(['ok' => true]);
    }

    if ($method === 'DELETE') {
        if (!$id) json_error('ID requerido');
        $gs->deleteChiste($id);
        json_response(['ok' => true]);
    }
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 500);
}

json_error('Método no permitido', 405);
