<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/lib/oauth_helpers.php';

session_start_safe();

$code = $_GET['code'] ?? '';
if (!$code) {
    $error = $_GET['error'] ?? 'desconocido';
    die('Error de Google: ' . h($error) . '. <a href="login.php">Volver al login</a>');
}

try {
    $tokens = exchange_code_for_tokens($code);
} catch (RuntimeException $e) {
    die('Error al obtener tokens: ' . h($e->getMessage()));
}

$user_info = get_google_user_info($tokens['access_token']);
$email     = $user_info['email'] ?? '';

save_tokens($tokens, $email);

$expires_at = time() + (int)($tokens['expires_in'] ?? 3600);
login_google_user($email, $tokens['access_token'], $expires_at);

$config = load_drive_config($email);
if (empty($config['spreadsheet_id'])) {
    require_once __DIR__ . '/lib/GoogleSheets.php';
    try {
        $spreadsheet_id = GoogleSheets::createSpreadsheet($tokens['access_token']);
        save_drive_config([
            'spreadsheet_id' => $spreadsheet_id,
            'created_at'     => date('c'),
        ], $email);
    } catch (RuntimeException $e) {
        error_log('No se pudo crear el spreadsheet: ' . $e->getMessage());
    }
}

redirect('/dashboard.php');
