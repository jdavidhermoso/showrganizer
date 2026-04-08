
<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/lib/oauth_helpers.php';

if (is_logged_in()) {
    redirect('/dashboard.php');
}

$auth_url = generate_oauth_url();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login · <?= APP_NAME ?></title>
    <link rel="stylesheet" href="assets/css/main.css">
</head>
<body class="auth-body">
<div class="auth-box">
    <img src="assets/logo.webp" alt="<?= APP_NAME ?>" class="login-logo">
    <h1><?= APP_NAME ?></h1>
    <a href="<?= h($auth_url) ?>" class="btn-google">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Entrar con Google
    </a>
    <div class="login-links">
        <a href="/privacy.html">Política de privacidad</a>
        <a href="/terms.html">Términos y condiciones</a>
    </div>
</div>

<style>
.btn-google {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.7rem 1rem;
    background: #fff;
    color: #3c4043;
    border: 1px solid #dadce0;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    text-decoration: none;
    transition: background 0.15s, box-shadow 0.15s;
    font-family: var(--font);
}
.btn-google:hover {
    background: #f8f9fa;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    text-decoration: none;
}
.login-links {
    display: flex;
    justify-content: center;
    gap: 1.25rem;
    margin-top: 1.25rem;
    font-size: 0.8rem;
}
.login-links a {
    color: var(--text-muted);
}
.login-links a:hover { text-decoration: underline; }
.login-logo {
    display: block;
    margin: 0 auto 1rem;
    height: 72px;
    width: auto;
}
</style>
</body>
</html>
