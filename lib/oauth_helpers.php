<?php
require_once __DIR__ . '/../includes/config.php';

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
];

function generate_oauth_url(): string {
    return GOOGLE_AUTH_URL . '?' . http_build_query([
        'client_id'     => GOOGLE_CLIENT_ID,
        'redirect_uri'  => GOOGLE_REDIRECT_URI,
        'response_type' => 'code',
        'scope'         => implode(' ', GOOGLE_SCOPES),
        'access_type'   => 'offline',
        'prompt'        => 'consent',
    ]);
}

function exchange_code_for_tokens(string $code): array {
    $response = google_http_post(GOOGLE_TOKEN_URL, [
        'code'          => $code,
        'client_id'     => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri'  => GOOGLE_REDIRECT_URI,
        'grant_type'    => 'authorization_code',
    ], false);

    if (empty($response['access_token'])) {
        throw new RuntimeException('No se recibió access_token: ' . json_encode($response));
    }
    return $response;
}

function refresh_access_token(string $refresh_token): array {
    $response = google_http_post(GOOGLE_TOKEN_URL, [
        'refresh_token' => $refresh_token,
        'client_id'     => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'grant_type'    => 'refresh_token',
    ], false);

    if (empty($response['access_token'])) {
        throw new RuntimeException('Refresh fallido: ' . json_encode($response));
    }
    return $response;
}

function get_google_user_info(string $access_token): array {
    $ch = curl_init(GOOGLE_USERINFO_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $access_token],
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    return json_decode($body, true) ?? [];
}

function revoke_token(string $token): void {
    $ch = curl_init(GOOGLE_REVOKE_URL . '?token=' . urlencode($token));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true]);
    curl_exec($ch);
    curl_close($ch);
}

function user_dir(string $email): string {
    return USERS_DIR . '/' . md5($email);
}

function ensure_user_dir(string $email): void {
    $dir = user_dir($email);
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
    }
}

function save_tokens(array $tokens, string $email): void {
    ensure_user_dir($email);
    $file = user_dir($email) . '/tokens.json';
    $data = [];
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true) ?? [];
    }
    if (!empty($tokens['refresh_token'])) {
        $data['refresh_token'] = $tokens['refresh_token'];
    }
    $data['saved_at'] = time();
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

function load_tokens(string $email): array {
    $file = user_dir($email) . '/tokens.json';
    if (!file_exists($file)) return [];
    return json_decode(file_get_contents($file), true) ?? [];
}

function save_drive_config(array $config, string $email): void {
    ensure_user_dir($email);
    file_put_contents(user_dir($email) . '/drive_config.json', json_encode($config, JSON_PRETTY_PRINT));
}

function load_drive_config(string $email): array {
    $file = user_dir($email) . '/drive_config.json';
    if (!file_exists($file)) return [];
    return json_decode(file_get_contents($file), true) ?? [];
}

function google_http_post(string $url, array $params, bool $json = true): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $json ? json_encode($params) : http_build_query($params),
        CURLOPT_HTTPHEADER     => $json
            ? ['Content-Type: application/json']
            : ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    return json_decode($body, true) ?? [];
}

function ensure_data_dir(): void {
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0750, true);
    }
}
