<?php

function h(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400): void {
    json_response(['error' => $message], $status);
}

function get_request_body(): array {
    $body = file_get_contents('php://input');
    return json_decode($body, true) ?? [];
}

function stars_html($puntuacion): string {
    if ($puntuacion === null) return '<span class="stars empty">—</span>';
    $html = '<span class="stars">';
    for ($i = 1; $i <= 5; $i++) {
        $html .= $i <= $puntuacion ? '★' : '☆';
    }
    $html .= '</span>';
    return $html;
}

function estado_label(string $estado): string {
    $labels = [
        'borrador'   => 'Borrador',
        'desarrollo' => 'En desarrollo',
        'probado'    => 'Probado',
        'retirado'   => 'Retirado',
    ];
    return $labels[$estado] ?? $estado;
}

function redirect(string $path): void {
    header('Location: ' . BASE_URL . $path);
    exit;
}
