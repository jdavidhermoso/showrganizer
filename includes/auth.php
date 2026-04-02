<?php
require_once __DIR__ . '/config.php';

function session_start_safe(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => SESSION_TIMEOUT,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function is_logged_in(): bool {
    session_start_safe();
    if (empty($_SESSION['google_email'])) {
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

function login_google_user(string $email, string $access_token, int $expires_at): void {
    session_start_safe();
    session_regenerate_id(true);
    $_SESSION['google_email']     = $email;
    $_SESSION['access_token']     = $access_token;
    $_SESSION['token_expires_at'] = $expires_at;
    $_SESSION['last_activity']    = time();
}

function logout(): void {
    session_start_safe();
    if (!empty($_SESSION['access_token'])) {
        require_once __DIR__ . '/../lib/oauth_helpers.php';
        revoke_token($_SESSION['access_token']);
    }
    session_unset();
    session_destroy();
}
