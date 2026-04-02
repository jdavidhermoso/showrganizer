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
        $show = $gs->getShowById($id);
        if (!$show) json_error('No encontrado', 404);
        json_response($show);
    }
    json_response($gs->getAllShows());
}

if ($method === 'POST') {
    $data   = get_request_body();
    $titulo = trim($data['titulo'] ?? '') ?: 'Show sin título';
    $id     = $gs->appendShow(['titulo' => $titulo, 'contenido' => $data['contenido'] ?? null]);
    json_response(['id' => $id], 201);
}

if ($method === 'PUT') {
    if (!$id) json_error('ID requerido');
    $data   = get_request_body();
    $titulo = trim($data['titulo'] ?? '') ?: 'Show sin título';
    $gs->updateShow($id, ['titulo' => $titulo, 'contenido' => $data['contenido'] ?? null]);
    json_response(['ok' => true]);
}

if ($method === 'DELETE') {
    if (!$id) json_error('ID requerido');
    $gs->deleteShow($id);
    json_response(['ok' => true]);
}

json_error('Método no permitido', 405);
