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

if ($method === 'GET') {
    $cats = $gs->getCategorias();
    json_response(array_map(fn($n) => ['nombre' => $n], $cats));
}

if ($method === 'POST') {
    $data   = get_request_body();
    $nombre = trim($data['nombre'] ?? '');
    if (!$nombre) json_error('El nombre es obligatorio');
    $gs->appendCategoria($nombre);
    json_response(['nombre' => $nombre], 201);
}

json_error('Método no permitido', 405);
