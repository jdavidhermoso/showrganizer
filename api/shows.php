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
$action = trim($_GET['action'] ?? '');

if ($method === 'GET') {
    if ($action === 'historial' && $id) {
        json_response($gs->getShowsByJokeId($id));
    }
    if ($id) {
        $show = $gs->getShowById($id);
        if (!$show) json_error('No encontrado', 404);
        json_response($show);
    }
    json_response($gs->getAllShows());
}

try {
    if ($method === 'POST') {
        if ($action === 'clone' && $id) {
            $newId = $gs->cloneShow($id);
            json_response(['id' => $newId], 201);
        }
        $data   = get_request_body();
        $titulo = trim($data['titulo'] ?? '') ?: 'Show sin título';
        $newId  = $gs->appendShow([
            'titulo'    => $titulo,
            'contenido' => $data['contenido'] ?? null,
            'fecha_show'=> $data['fecha_show'] ?? '',
            'sala'      => $data['sala']       ?? '',
            'ciudad'    => $data['ciudad']     ?? '',
        ]);
        json_response(['id' => $newId], 201);
    }

    if ($method === 'PUT') {
        if (!$id) json_error('ID requerido');
        $data   = get_request_body();
        $titulo = trim($data['titulo'] ?? '') ?: 'Show sin título';
        $gs->updateShow($id, [
            'titulo'    => $titulo,
            'contenido' => $data['contenido'] ?? null,
            'fecha_show'=> $data['fecha_show'] ?? null,
            'sala'      => $data['sala']       ?? null,
            'ciudad'    => $data['ciudad']     ?? null,
        ]);
        json_response(['ok' => true]);
    }

    if ($method === 'DELETE') {
        if (!$id) json_error('ID requerido');
        $gs->deleteShow($id);
        json_response(['ok' => true]);
    }
} catch (RuntimeException $e) {
    json_error($e->getMessage(), 500);
}

json_error('Método no permitido', 405);
