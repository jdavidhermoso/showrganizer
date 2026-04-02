<?php
require_once __DIR__ . '/config.php';

function session_start_safe(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => SESSION_TIMEOUT,
            'httponly' => true,
            'secure'   => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function is_logged_in(): bool {
    session_start_safe();
    if (empty($_SESSION['user_id'])) {
        return false;
    }
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > SESSION_TIMEOUT) {
        session_unset();
        session_destroy();
        return false;
    }
    $_SESSION['last_activity'] = time();
    return true;
}

function require_login(): void {
    if (!is_logged_in()) {
        header('Location: ' . BASE_URL . '/login.php');
        exit;
    }
}

function login_user(int $id, string $email): void {
    session_start_safe();
    session_regenerate_id(true);
    $_SESSION['user_id']      = $id;
    $_SESSION['user_email']   = $email;
    $_SESSION['last_activity'] = time();
}

function logout(): void {
    session_start_safe();
    session_unset();
    session_destroy();
}

function current_user_id(): int {
    session_start_safe();
    return (int)($_SESSION['user_id'] ?? 0);
}

function current_user_email(): string {
    session_start_safe();
    return $_SESSION['user_email'] ?? '';
}
