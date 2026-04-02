<?php
require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/oauth_helpers.php';

class GoogleSheets {

    private string $spreadsheetId;
    private string $accessToken;

    const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
    const DRIVE_BASE  = 'https://www.googleapis.com/drive/v3';

    const COL_CHISTE = ['id','texto','categoria','puntuacion','estado','tags','fecha_creacion','fecha_actualizacion'];
    const COL_SHOW   = ['id','titulo','contenido','fecha_creacion','fecha_actualizacion'];

    public function __construct() {
        session_start_safe();
        $this->ensureValidToken();
        $this->accessToken   = $_SESSION['access_token'];
        $config              = load_drive_config($_SESSION['google_email']);
        $this->spreadsheetId = $config['spreadsheet_id'] ?? '';
        if (!$this->spreadsheetId) {
            throw new RuntimeException('Spreadsheet no configurado. Haz login de nuevo.');
        }
    }

    private function ensureValidToken(): void {
        $expires = $_SESSION['token_expires_at'] ?? 0;
        if ($expires > time() + 60) return;

        $email  = $_SESSION['google_email'] ?? '';
        $stored = load_tokens($email);
        if (empty($stored['refresh_token'])) {
            session_unset();
            session_destroy();
            header('Location: ' . BASE_URL . '/login.php');
            exit;
        }
        $new = refresh_access_token($stored['refresh_token']);
        $_SESSION['access_token']     = $new['access_token'];
        $_SESSION['token_expires_at'] = time() + (int)($new['expires_in'] ?? 3600);
        if (!empty($new['refresh_token'])) {
            save_tokens($new, $email);
        }
    }

    private function request(string $method, string $url, ?array $body = null): array {
        $ch = curl_init($url);
        $headers = [
            'Authorization: Bearer ' . $this->accessToken,
            'Content-Type: application/json',
        ];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $headers,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
        }
        $response = curl_exec($ch);
        $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true) ?? [];
        if ($status >= 400) {
            $msg = $decoded['error']['message'] ?? $response;
            throw new RuntimeException("Sheets API $status: $msg");
        }
        return $decoded;
    }

    public static function uuid(): string {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function readSheet(string $sheet, array $columns): array {
        $lastCol = chr(ord('A') + count($columns) - 1);
        $url     = self::SHEETS_BASE . '/' . urlencode($this->spreadsheetId)
                 . '/values/' . urlencode("{$sheet}!A2:{$lastCol}");
        $data    = $this->request('GET', $url);
        $rows    = $data['values'] ?? [];
        $result  = [];
        foreach ($rows as $i => $row) {
            $obj = ['_row' => $i + 2];
            foreach ($columns as $j => $col) {
                $obj[$col] = $row[$j] ?? '';
            }
            $result[] = $obj;
        }
        return $result;
    }

    private function appendRow(string $sheet, array $values): void {
        $url = self::SHEETS_BASE . '/' . urlencode($this->spreadsheetId)
             . '/values/' . urlencode("{$sheet}!A:A") . ':append'
             . '?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
        $this->request('POST', $url, ['values' => [$values]]);
    }

    private function updateRow(string $sheet, int $row, array $columns, array $values): void {
        $lastCol = chr(ord('A') + count($columns) - 1);
        $url     = self::SHEETS_BASE . '/' . urlencode($this->spreadsheetId)
                 . '/values/' . urlencode("{$sheet}!A{$row}:{$lastCol}{$row}")
                 . '?valueInputOption=RAW';
        $this->request('PUT', $url, ['values' => [$values]]);
    }

    private function deleteRow(string $sheet, int $row): void {
        $meta    = $this->request('GET', self::SHEETS_BASE . '/' . urlencode($this->spreadsheetId) . '?fields=sheets.properties');
        $sheetId = null;
        foreach ($meta['sheets'] ?? [] as $s) {
            if (($s['properties']['title'] ?? '') === $sheet) {
                $sheetId = (int)$s['properties']['sheetId'];
                break;
            }
        }
        if ($sheetId === null) {
            throw new RuntimeException("Hoja '$sheet' no encontrada");
        }
        $url = self::SHEETS_BASE . '/' . urlencode($this->spreadsheetId) . ':batchUpdate';
        $this->request('POST', $url, [
            'requests' => [[
                'deleteDimension' => [
                    'range' => [
                        'sheetId'    => $sheetId,
                        'dimension'  => 'ROWS',
                        'startIndex' => $row - 1,
                        'endIndex'   => $row,
                    ],
                ],
            ]],
        ]);
    }

    public function getAllChistes(): array {
        $rows = $this->readSheet('chistes', self::COL_CHISTE);
        return array_map([$this, 'parseChiste'], $rows);
    }

    public function getChisteById(string $id): ?array {
        foreach ($this->readSheet('chistes', self::COL_CHISTE) as $row) {
            if ($row['id'] === $id) return $this->parseChiste($row);
        }
        return null;
    }

    public function appendChiste(array $data): string {
        $id  = self::uuid();
        $now = date('c');
        $this->appendRow('chistes', [
            $id,
            $data['texto']     ?? '',
            $data['categoria'] ?? '',
            $data['puntuacion'] !== null && $data['puntuacion'] !== '' ? (int)$data['puntuacion'] : '',
            $data['estado']    ?? 'borrador',
            json_encode($data['tags'] ?? [], JSON_UNESCAPED_UNICODE),
            $now,
            $now,
        ]);
        return $id;
    }

    public function updateChiste(string $id, array $data): void {
        $rows = $this->readSheet('chistes', self::COL_CHISTE);
        $row  = null;
        foreach ($rows as $r) {
            if ($r['id'] === $id) { $row = $r; break; }
        }
        if (!$row) throw new RuntimeException("Chiste $id no encontrado");

        $this->updateRow('chistes', $row['_row'], self::COL_CHISTE, [
            $id,
            $data['texto']     ?? $row['texto'],
            $data['categoria'] ?? $row['categoria'],
            isset($data['puntuacion']) && $data['puntuacion'] !== '' && $data['puntuacion'] !== null
                ? (int)$data['puntuacion'] : '',
            $data['estado']    ?? $row['estado'],
            json_encode($data['tags'] ?? [], JSON_UNESCAPED_UNICODE),
            $row['fecha_creacion'],
            date('c'),
        ]);
    }

    public function deleteChiste(string $id): void {
        foreach ($this->readSheet('chistes', self::COL_CHISTE) as $row) {
            if ($row['id'] === $id) {
                $this->deleteRow('chistes', $row['_row']);
                return;
            }
        }
    }

    private function parseChiste(array $row): array {
        return [
            'id'                  => $row['id'],
            'texto'               => $row['texto'],
            'categoria'           => $row['categoria'],
            'puntuacion'          => $row['puntuacion'] !== '' ? (int)$row['puntuacion'] : null,
            'estado'              => $row['estado'] ?: 'borrador',
            'tags'                => json_decode($row['tags'] ?: '[]', true) ?? [],
            'fecha_creacion'      => $row['fecha_creacion'],
            'fecha_actualizacion' => $row['fecha_actualizacion'],
        ];
    }

    public function getAllShows(): array {
        $rows = $this->readSheet('shows', self::COL_SHOW);
        return array_map([$this, 'parseShow'], $rows);
    }

    public function getShowById(string $id): ?array {
        foreach ($this->readSheet('shows', self::COL_SHOW) as $row) {
            if ($row['id'] === $id) return $this->parseShow($row);
        }
        return null;
    }

    public function appendShow(array $data): string {
        $id  = self::uuid();
        $now = date('c');
        $this->appendRow('shows', [
            $id,
            $data['titulo']    ?? 'Show sin título',
            isset($data['contenido']) ? json_encode($data['contenido'], JSON_UNESCAPED_UNICODE) : '',
            $now,
            $now,
        ]);
        return $id;
    }

    public function updateShow(string $id, array $data): void {
        $rows = $this->readSheet('shows', self::COL_SHOW);
        $row  = null;
        foreach ($rows as $r) {
            if ($r['id'] === $id) { $row = $r; break; }
        }
        if (!$row) throw new RuntimeException("Show $id no encontrado");

        $this->updateRow('shows', $row['_row'], self::COL_SHOW, [
            $id,
            $data['titulo']    ?? $row['titulo'],
            isset($data['contenido']) ? json_encode($data['contenido'], JSON_UNESCAPED_UNICODE) : $row['contenido'],
            $row['fecha_creacion'],
            date('c'),
        ]);
    }

    public function deleteShow(string $id): void {
        foreach ($this->readSheet('shows', self::COL_SHOW) as $row) {
            if ($row['id'] === $id) {
                $this->deleteRow('shows', $row['_row']);
                return;
            }
        }
    }

    private function parseShow(array $row): array {
        return [
            'id'                  => $row['id'],
            'titulo'              => $row['titulo'],
            'contenido'           => $row['contenido'] ? json_decode($row['contenido'], true) : null,
            'fecha_creacion'      => $row['fecha_creacion'],
            'fecha_actualizacion' => $row['fecha_actualizacion'],
        ];
    }

    public function getCategorias(): array {
        $url  = self::SHEETS_BASE . '/' . urlencode($this->spreadsheetId) . '/values/categorias!A2:A';
        $data = $this->request('GET', $url);
        return array_column($data['values'] ?? [], 0);
    }

    public function appendCategoria(string $nombre): void {
        $existing = $this->getCategorias();
        if (in_array($nombre, $existing, true)) return;
        $this->appendRow('categorias', [$nombre]);
    }

    public function getAllTags(): array {
        $url  = self::SHEETS_BASE . '/' . urlencode($this->spreadsheetId) . '/values/tags!A2:A';
        $data = $this->request('GET', $url);
        return array_column($data['values'] ?? [], 0);
    }

    private function syncTags(array $tags): void {
        $existing = $this->getAllTags();
        foreach ($tags as $tag) {
            if ($tag !== '' && !in_array($tag, $existing, true)) {
                $this->appendRow('tags', [$tag]);
                $existing[] = $tag;
            }
        }
    }

    public function appendChisteWithTags(array $data): string {
        $id = $this->appendChiste($data);
        if (!empty($data['tags'])) {
            $this->syncTags($data['tags']);
        }
        return $id;
    }

    public function updateChisteWithTags(string $id, array $data): void {
        $this->updateChiste($id, $data);
        if (!empty($data['tags'])) {
            $this->syncTags($data['tags']);
        }
    }

    public static function createSpreadsheet(string $accessToken): string {
        $url  = self::SHEETS_BASE;
        $body = [
            'properties' => ['title' => 'Showrganizer'],
            'sheets'     => [
                ['properties' => ['title' => 'chistes']],
                ['properties' => ['title' => 'shows']],
                ['properties' => ['title' => 'categorias']],
                ['properties' => ['title' => 'tags']],
            ],
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($body, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
            ],
        ]);
        $response = curl_exec($ch);
        $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($response, true) ?? [];
        if ($status >= 400 || empty($data['spreadsheetId'])) {
            throw new RuntimeException('No se pudo crear el spreadsheet: ' . ($data['error']['message'] ?? $response));
        }

        $spreadsheetId = $data['spreadsheetId'];

        $headers = [
            'chistes'    => [self::COL_CHISTE],
            'shows'      => [self::COL_SHOW],
            'categorias' => [['nombre']],
            'tags'       => [['nombre']],
        ];

        foreach ($headers as $sheet => $header) {
            $range = urlencode("{$sheet}!A1");
            $headerUrl = self::SHEETS_BASE . "/{$spreadsheetId}/values/{$range}?valueInputOption=RAW";
            $ch = curl_init($headerUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST  => 'PUT',
                CURLOPT_POSTFIELDS     => json_encode(['values' => $header]),
                CURLOPT_HTTPHEADER     => [
                    'Authorization: Bearer ' . $accessToken,
                    'Content-Type: application/json',
                ],
            ]);
            curl_exec($ch);
            curl_close($ch);
        }

        $defaultCats = ['Observacional','Autoparodia','Política','Relaciones','Trabajo','Familia','Absurdo','Negro','Cotidiano'];
        $catValues   = array_map(fn($c) => [$c], $defaultCats);
        $catUrl      = self::SHEETS_BASE . "/{$spreadsheetId}/values/categorias!A2:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
        $ch = curl_init($catUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode(['values' => $catValues]),
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
            ],
        ]);
        curl_exec($ch);
        curl_close($ch);

        return $spreadsheetId;
    }
}
