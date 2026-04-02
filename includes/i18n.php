<?php
$_LANG     = [];
$_LANG_KEY = '';

function get_lang(): string {
    static $lang = null;
    if ($lang !== null) return $lang;
    $allowed = ['es', 'en', 'de'];
    $sess = (isset($_SESSION) && isset($_SESSION['lang'])) ? $_SESSION['lang'] : 'es';
    $lang = in_array($sess, $allowed) ? $sess : 'es';
    return $lang;
}

function _ensure_lang(): void {
    global $_LANG, $_LANG_KEY;
    $lang = get_lang();
    if ($_LANG_KEY === $lang) return;
    $_LANG_KEY = $lang;
    $_LANG     = require __DIR__ . '/../lang/' . $lang . '.php';
}

function t(string $key, ...$args): string {
    global $_LANG;
    _ensure_lang();
    $str = $_LANG[$key] ?? $key;
    if ($args) return sprintf($str, ...$args);
    return $str;
}

/**
 * Returns a JSON-encoded object with all lang strings needed by JavaScript.
 * Call once per page in a <script> block.
 */
function lang_js(): string {
    _ensure_lang();
    global $_LANG;
    return json_encode($_LANG, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP);
}
