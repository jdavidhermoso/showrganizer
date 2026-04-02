<?php
require_once __DIR__ . '/includes/auth.php';
session_start_safe();

$allowed = ['es', 'en', 'de'];
$lang    = $_POST['lang'] ?? 'es';
if (!in_array($lang, $allowed)) $lang = 'es';
$_SESSION['lang'] = $lang;

$ref = $_SERVER['HTTP_REFERER'] ?? '';
// Only redirect to same-origin URLs
if ($ref && parse_url($ref, PHP_URL_HOST) === ($_SERVER['HTTP_HOST'] ?? '')) {
    header('Location: ' . $ref);
} else {
    header('Location: /dashboard.php');
}
exit;
