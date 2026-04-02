<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/lib/Database.php';

if (is_logged_in()) {
    redirect('/dashboard.php');
}

$error    = '';
$success  = false;
$lang     = get_lang();
$html_lang = ['es' => 'es', 'en' => 'en', 'de' => 'de'][$lang] ?? 'es';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim($_POST['email']     ?? '');
    $password = trim($_POST['password']  ?? '');
    $confirm  = trim($_POST['confirm']   ?? '');

    if ($email === '' || $password === '' || $confirm === '') {
        $error = t('register_empty');
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = t('register_invalid_email');
    } elseif (strlen($password) < 8) {
        $error = t('register_password_short');
    } elseif ($password !== $confirm) {
        $error = t('register_password_mismatch');
    } else {
        try {
            $pdo  = Database::connect();
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $st   = $pdo->prepare('INSERT INTO users (email, password) VALUES (?, ?)');
            $st->execute([$email, $hash]);
            $userId = (int)$pdo->lastInsertId();

            $defaults = ['Observacional','Autoparodia','Política','Relaciones',
                         'Trabajo','Familia','Absurdo','Negro','Cotidiano'];
            $stCat = $pdo->prepare('INSERT IGNORE INTO categorias (user_id, nombre) VALUES (?, ?)');
            foreach ($defaults as $cat) {
                $stCat->execute([$userId, $cat]);
            }

            login_user($userId, $email);
            redirect('/dashboard.php');
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                $error = t('register_email_taken');
            } else {
                $error = t('login_db_error');
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="<?= $html_lang ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= h(t('register_title')) ?> · <?= APP_NAME ?></title>
    <link rel="stylesheet" href="assets/css/main.css">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#1a1d25">
    <link rel="apple-touch-icon" href="/assets/logo-192.png">
</head>
<body class="auth-body">
<div class="auth-box">
    <img src="assets/logo.webp" alt="<?= APP_NAME ?>" class="login-logo">
    <h1><?= h(t('register_title')) ?></h1>

    <?php if ($error): ?>
        <p class="login-error"><?= h($error) ?></p>
    <?php endif; ?>

    <form method="post" action="/register.php" class="login-form">
        <div class="form-group">
            <label for="email"><?= h(t('email')) ?></label>
            <input type="email" id="email" name="email"
                   value="<?= h($_POST['email'] ?? '') ?>"
                   required autocomplete="email" autofocus>
        </div>
        <div class="form-group">
            <label for="password"><?= h(t('password')) ?></label>
            <input type="password" id="password" name="password"
                   required autocomplete="new-password" minlength="8">
        </div>
        <div class="form-group">
            <label for="confirm"><?= h(t('confirm_password')) ?></label>
            <input type="password" id="confirm" name="confirm"
                   required autocomplete="new-password" minlength="8">
        </div>
        <button type="submit" class="btn btn-primary btn-full"><?= h(t('register_btn')) ?></button>
    </form>

    <p class="login-register-link">
        <?= h(t('have_account')) ?>
        <a href="/login.php"><?= h(t('login_link')) ?></a>
    </p>

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
