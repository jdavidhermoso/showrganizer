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
        $bloque = $gs->getBloqueById($id);
        if (!$bloque) json_error('No encontrado', 404);
        json_response($bloque);
    }
    json_response($gs->getAllBloques());
}

try {
    if ($method === 'POST') {
        $data   = get_request_body();
        $titulo = trim($data['titulo'] ?? '') ?: 'Bloque sin título';
        $newId  = $gs->appendBloque([
            'titulo'      => $titulo,
            'descripcion' => $data['descripcion'] ?? '',
            'chistes'     => $data['chistes']     ?? [],
        ]);
        json_response(['id' => $newId], 201);
    }

    if ($method === 'PUT') {
        if (!$id) json_error('ID requerido');
        $data = get_request_body();
        $gs->updateBloque($id, [
            'titulo'      => trim($data['titulo'] ?? '') ?: null,
            'descripcion' => $data['descripcion'] ?? '',
            'chistes'     => $data['chistes']     ?? [],
        ]);
        json_response(['ok' => true]);
    }

    if ($method === 'DELETE') {
        if (!$id) json_error('ID requerido');
        $gs->deleteBloque($id);
        json_response(['ok' => true]);
    }
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 500);
}

json_error('Método no permitido', 405);
