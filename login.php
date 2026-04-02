<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/lib/Database.php';

if (is_logged_in()) {
    redirect('/dashboard.php');
}

$error    = '';
$lang     = get_lang();
$html_lang = ['es' => 'es', 'en' => 'en', 'de' => 'de'][$lang] ?? 'es';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim($_POST['email']    ?? '');
    $password = trim($_POST['password'] ?? '');

    if ($email === '' || $password === '') {
        $error = t('login_empty_fields');
    } else {
        try {
            $pdo = Database::connect();
            $st  = $pdo->prepare('SELECT id, email, password FROM users WHERE email = ?');
            $st->execute([$email]);
            $user = $st->fetch();

            if ($user && password_verify($password, $user['password'])) {
                login_user((int)$user['id'], $user['email']);
                redirect('/dashboard.php');
            } else {
                $error = t('login_invalid');
            }
        } catch (PDOException $e) {
            $error = t('login_db_error');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="<?= $html_lang ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login · <?= APP_NAME ?></title>
    <link rel="stylesheet" href="assets/css/main.css">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#1a1d25">
    <link rel="apple-touch-icon" href="/assets/logo-192.png">
    <script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');</script>
</head>
<body class="auth-body">
<div class="auth-box">
    <img src="assets/logo.webp" alt="<?= APP_NAME ?>" class="login-logo">
    <h1><?= APP_NAME ?></h1>

    <?php if ($error): ?>
        <p class="login-error"><?= h($error) ?></p>
    <?php endif; ?>

    <form method="post" action="/login.php" class="login-form">
        <div class="form-group">
            <label for="email"><?= h(t('email')) ?></label>
            <input type="email" id="email" name="email"
                   value="<?= h($_POST['email'] ?? '') ?>"
                   required autocomplete="email" autofocus>
        </div>
        <div class="form-group">
            <label for="password"><?= h(t('password')) ?></label>
            <input type="password" id="password" name="password"
                   required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary btn-full"><?= h(t('login_btn')) ?></button>
    </form>

    <p class="login-register-link">
        <?= h(t('no_account')) ?>
        <a href="/register.php"><?= h(t('register_link')) ?></a>
    </p>

    <div class="login-links">
        <a href="/privacy.html"><?= h(t('privacy')) ?></a>
        <a href="/terms.html"><?= h(t('terms')) ?></a>
    </div>
    <div class="login-lang">
        <?php foreach (['es' => 'ES', 'en' => 'EN', 'de' => 'DE'] as $code => $label): ?>
        <form method="post" action="/setlang.php" style="display:inline">
            <button type="submit" name="lang" value="<?= $code ?>"
                    class="lang-btn<?= $lang === $code ? ' active' : '' ?>"><?= $label ?></button>
        </form>
        <?php endforeach; ?>
    </div>
</div>

<style>
.login-form { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.35rem; }
.form-group label { font-size: 0.85rem; color: var(--text-muted); }
.form-group input {
    padding: 0.6rem 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 0.95rem;
    font-family: var(--font);
}
.form-group input:focus { outline: none; border-color: var(--accent); }
.btn-full { width: 100%; }
.login-error {
    background: rgba(220,53,69,0.15);
    border: 1px solid rgba(220,53,69,0.4);
    color: #f77;
    border-radius: 6px;
    padding: 0.6rem 0.75rem;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}
.login-register-link {
    text-align: center;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-top: 0.5rem;
}
.login-register-link a { color: var(--accent); }
.login-links {
    display: flex;
    justify-content: center;
    gap: 1.25rem;
    margin-top: 1.25rem;
    font-size: 0.8rem;
}
.login-links a { color: var(--text-muted); }
.login-links a:hover { text-decoration: underline; }
.login-logo {
    display: block;
    margin: 0 auto 1rem;
    height: 72px;
    width: auto;
}
.login-lang {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    margin-top: 1rem;
}
</style>
</body>
</html>
