<?php
require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/auth.php';

class Database {

    private PDO $pdo;
    private int $userId;

    public function __construct() {
        session_start_safe();
        if (empty($_SESSION['user_id'])) {
            header('Location: ' . BASE_URL . '/login.php');
            exit;
        }
        $this->userId = (int)$_SESSION['user_id'];
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $this->pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }

    public static function connect(): PDO {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }

    public static function uuid(): string {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    // ── Chistes ─────────────────────────────────────────────────────────────

    public function getAllChistes(): array {
        $st = $this->pdo->prepare(
            'SELECT * FROM chistes WHERE user_id = ? ORDER BY fecha_creacion DESC'
        );
        $st->execute([$this->userId]);
        return array_map([$this, 'parseChiste'], $st->fetchAll());
    }

    public function getChisteById(string $id): ?array {
        $st = $this->pdo->prepare(
            'SELECT * FROM chistes WHERE id = ? AND user_id = ?'
        );
        $st->execute([$id, $this->userId]);
        $row = $st->fetch();
        return $row ? $this->parseChiste($row) : null;
    }

    public function appendChiste(array $data): string {
        $id  = self::uuid();
        $now = date('Y-m-d H:i:s');
        $st  = $this->pdo->prepare(
            'INSERT INTO chistes
             (id, user_id, texto, categoria, puntuacion, estado, tags,
              fecha_creacion, fecha_actualizacion, duracion, callbacks, idioma)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $st->execute([
            $id,
            $this->userId,
            $data['texto']     ?? '',
            $data['categoria'] ?? '',
            isset($data['puntuacion']) && $data['puntuacion'] !== '' && $data['puntuacion'] !== null
                ? (int)$data['puntuacion'] : null,
            $data['estado']    ?? 'borrador',
            json_encode($data['tags'] ?? [], JSON_UNESCAPED_UNICODE),
            $now,
            $now,
            isset($data['duracion']) && $data['duracion'] !== '' && $data['duracion'] !== null
                ? (int)$data['duracion'] : null,
            json_encode($data['callbacks'] ?? [], JSON_UNESCAPED_UNICODE),
            $data['idioma'] ?? '',
        ]);
        return $id;
    }

    public function updateChiste(string $id, array $data): void {
        $row = $this->getChisteById($id);
        if (!$row) throw new RuntimeException("Chiste $id no encontrado");

        $st = $this->pdo->prepare(
            'UPDATE chistes SET
               texto = ?, categoria = ?, puntuacion = ?, estado = ?, tags = ?,
               fecha_actualizacion = ?, duracion = ?, callbacks = ?, idioma = ?
             WHERE id = ? AND user_id = ?'
        );
        $st->execute([
            $data['texto']     ?? $row['texto'],
            $data['categoria'] ?? $row['categoria'],
            isset($data['puntuacion']) && $data['puntuacion'] !== '' && $data['puntuacion'] !== null
                ? (int)$data['puntuacion'] : null,
            $data['estado']    ?? $row['estado'],
            json_encode($data['tags'] ?? [], JSON_UNESCAPED_UNICODE),
            date('Y-m-d H:i:s'),
            isset($data['duracion']) && $data['duracion'] !== '' && $data['duracion'] !== null
                ? (int)$data['duracion'] : null,
            json_encode($data['callbacks'] ?? [], JSON_UNESCAPED_UNICODE),
            array_key_exists('idioma', $data) ? ($data['idioma'] ?? '') : ($row['idioma'] ?? ''),
            $id,
            $this->userId,
        ]);
    }

    public function deleteChiste(string $id): void {
        $st = $this->pdo->prepare('DELETE FROM chistes WHERE id = ? AND user_id = ?');
        $st->execute([$id, $this->userId]);
    }

    private function parseChiste(array $row): array {
        return [
            'id'                  => $row['id'],
            'texto'               => $row['texto'],
            'categoria'           => $row['categoria'],
            'puntuacion'          => $row['puntuacion'] !== null ? (int)$row['puntuacion'] : null,
            'estado'              => $row['estado'] ?: 'borrador',
            'tags'                => json_decode($row['tags'] ?: '[]', true) ?? [],
            'fecha_creacion'      => $row['fecha_creacion'],
            'fecha_actualizacion' => $row['fecha_actualizacion'],
            'duracion'            => $row['duracion'] !== null ? (int)$row['duracion'] : null,
            'callbacks'           => json_decode($row['callbacks'] ?? '[]' ?: '[]', true) ?? [],
            'idioma'              => $row['idioma'] ?? '',
        ];
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

    // ── Shows ────────────────────────────────────────────────────────────────

    public function getAllShows(): array {
        $st = $this->pdo->prepare(
            'SELECT * FROM shows WHERE user_id = ? ORDER BY fecha_creacion DESC'
        );
        $st->execute([$this->userId]);
        return array_map([$this, 'parseShow'], $st->fetchAll());
    }

    public function getShowById(string $id): ?array {
        $st = $this->pdo->prepare('SELECT * FROM shows WHERE id = ? AND user_id = ?');
        $st->execute([$id, $this->userId]);
        $row = $st->fetch();
        return $row ? $this->parseShow($row) : null;
    }

    public function appendShow(array $data): string {
        $id  = self::uuid();
        $now = date('Y-m-d H:i:s');
        $st  = $this->pdo->prepare(
            'INSERT INTO shows
             (id, user_id, titulo, contenido, fecha_creacion, fecha_actualizacion,
              fecha_show, sala, ciudad)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $fechaShow = ($data['fecha_show'] ?? '') ?: null;
        $st->execute([
            $id,
            $this->userId,
            $data['titulo']    ?? 'Show sin título',
            isset($data['contenido']) ? json_encode($data['contenido'], JSON_UNESCAPED_UNICODE) : null,
            $now,
            $now,
            $fechaShow,
            $data['sala']   ?? '',
            $data['ciudad'] ?? '',
        ]);
        return $id;
    }

    public function updateShow(string $id, array $data): void {
        $row = $this->getShowById($id);
        if (!$row) throw new RuntimeException("Show $id no encontrado");

        $fechaShow = array_key_exists('fecha_show', $data)
            ? (($data['fecha_show'] ?? '') ?: null)
            : ($row['fecha_show'] ?: null);

        $st = $this->pdo->prepare(
            'UPDATE shows SET
               titulo = ?, contenido = ?, fecha_actualizacion = ?,
               fecha_show = ?, sala = ?, ciudad = ?
             WHERE id = ? AND user_id = ?'
        );
        $st->execute([
            $data['titulo'] ?? $row['titulo'],
            isset($data['contenido']) ? json_encode($data['contenido'], JSON_UNESCAPED_UNICODE) : $row['contenido'],
            date('Y-m-d H:i:s'),
            $fechaShow,
            array_key_exists('sala', $data)   ? ($data['sala']   ?? '') : ($row['sala']   ?? ''),
            array_key_exists('ciudad', $data) ? ($data['ciudad'] ?? '') : ($row['ciudad'] ?? ''),
            $id,
            $this->userId,
        ]);
    }

    public function cloneShow(string $id): string {
        $original = $this->getShowById($id);
        if (!$original) throw new RuntimeException("Show $id no encontrado");

        $newId = self::uuid();
        $now   = date('Y-m-d H:i:s');
        $st    = $this->pdo->prepare(
            'INSERT INTO shows
             (id, user_id, titulo, contenido, fecha_creacion, fecha_actualizacion,
              fecha_show, sala, ciudad)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $st->execute([
            $newId,
            $this->userId,
            $original['titulo'] . ' (copia)',
            $original['contenido'] ? json_encode($original['contenido'], JSON_UNESCAPED_UNICODE) : null,
            $now,
            $now,
            null,
            $original['sala']   ?? '',
            $original['ciudad'] ?? '',
        ]);
        return $newId;
    }

    public function deleteShow(string $id): void {
        $st = $this->pdo->prepare('DELETE FROM shows WHERE id = ? AND user_id = ?');
        $st->execute([$id, $this->userId]);
    }

    public function getShowsByJokeId(string $jokeId): array {
        $result = [];
        foreach ($this->getAllShows() as $show) {
            $blocks = $show['contenido']['blocks'] ?? [];
            foreach ($blocks as $block) {
                if (($block['type'] ?? '') === 'joke' && ($block['joke_id'] ?? '') === $jokeId) {
                    $result[] = [
                        'id'               => $show['id'],
                        'titulo'           => $show['titulo'],
                        'fecha_show'       => $show['fecha_show'] ?? '',
                        'sala'             => $show['sala']       ?? '',
                        'ciudad'           => $show['ciudad']     ?? '',
                        'estrellas_reales' => $block['estrellas_reales'] ?? null,
                        'notas'            => $block['notas']     ?? '',
                    ];
                    break;
                }
            }
        }
        return $result;
    }

    private function parseShow(array $row): array {
        $contenido = null;
        if (!empty($row['contenido'])) {
            $contenido = is_string($row['contenido'])
                ? json_decode($row['contenido'], true)
                : $row['contenido'];
        }
        return [
            'id'                  => $row['id'],
            'titulo'              => $row['titulo'],
            'contenido'           => $contenido,
            'fecha_creacion'      => $row['fecha_creacion'],
            'fecha_actualizacion' => $row['fecha_actualizacion'],
            'fecha_show'          => $row['fecha_show'] ?? '',
            'sala'                => $row['sala']       ?? '',
            'ciudad'              => $row['ciudad']     ?? '',
        ];
    }

    // ── Bloques ──────────────────────────────────────────────────────────────

    public function getAllBloques(): array {
        $st = $this->pdo->prepare(
            'SELECT * FROM bloques WHERE user_id = ? ORDER BY fecha_creacion DESC'
        );
        $st->execute([$this->userId]);
        return array_map([$this, 'parseBloque'], $st->fetchAll());
    }

    public function getBloqueById(string $id): ?array {
        $st = $this->pdo->prepare('SELECT * FROM bloques WHERE id = ? AND user_id = ?');
        $st->execute([$id, $this->userId]);
        $row = $st->fetch();
        return $row ? $this->parseBloque($row) : null;
    }

    public function appendBloque(array $data): string {
        $id  = self::uuid();
        $now = date('Y-m-d H:i:s');
        $st  = $this->pdo->prepare(
            'INSERT INTO bloques (id, user_id, titulo, descripcion, chistes, fecha_creacion, fecha_actualizacion)
             VALUES (?,?,?,?,?,?,?)'
        );
        $st->execute([
            $id,
            $this->userId,
            $data['titulo']      ?? 'Bloque sin título',
            $data['descripcion'] ?? '',
            json_encode($data['chistes'] ?? [], JSON_UNESCAPED_UNICODE),
            $now,
            $now,
        ]);
        return $id;
    }

    public function updateBloque(string $id, array $data): void {
        $row = $this->getBloqueById($id);
        if (!$row) throw new RuntimeException("Bloque $id no encontrado");

        $st = $this->pdo->prepare(
            'UPDATE bloques SET titulo = ?, descripcion = ?, chistes = ?, fecha_actualizacion = ?
             WHERE id = ? AND user_id = ?'
        );
        $st->execute([
            $data['titulo'] ?? $row['titulo'],
            array_key_exists('descripcion', $data) ? ($data['descripcion'] ?? '') : $row['descripcion'],
            json_encode($data['chistes'] ?? $row['chistes'], JSON_UNESCAPED_UNICODE),
            date('Y-m-d H:i:s'),
            $id,
            $this->userId,
        ]);
    }

    public function deleteBloque(string $id): void {
        $st = $this->pdo->prepare('DELETE FROM bloques WHERE id = ? AND user_id = ?');
        $st->execute([$id, $this->userId]);
    }

    private function parseBloque(array $row): array {
        $chistes = $row['chistes'];
        if (is_string($chistes)) {
            $chistes = json_decode($chistes ?: '[]', true) ?? [];
        }
        return [
            'id'                  => $row['id'],
            'titulo'              => $row['titulo'],
            'descripcion'         => $row['descripcion'] ?? '',
            'chistes'             => $chistes ?? [],
            'fecha_creacion'      => $row['fecha_creacion'],
            'fecha_actualizacion' => $row['fecha_actualizacion'],
        ];
    }

    // ── Categorías ───────────────────────────────────────────────────────────

    public function getCategorias(): array {
        $st = $this->pdo->prepare(
            'SELECT nombre FROM categorias WHERE user_id = ? ORDER BY nombre ASC'
        );
        $st->execute([$this->userId]);
        return array_column($st->fetchAll(), 'nombre');
    }

    public function appendCategoria(string $nombre): void {
        $st = $this->pdo->prepare(
            'INSERT IGNORE INTO categorias (user_id, nombre) VALUES (?, ?)'
        );
        $st->execute([$this->userId, $nombre]);
    }

    // ── Tags ─────────────────────────────────────────────────────────────────

    public function getAllTags(): array {
        $st = $this->pdo->prepare(
            'SELECT nombre FROM tags WHERE user_id = ? ORDER BY nombre ASC'
        );
        $st->execute([$this->userId]);
        return array_column($st->fetchAll(), 'nombre');
    }

    private function syncTags(array $tags): void {
        $st = $this->pdo->prepare(
            'INSERT IGNORE INTO tags (user_id, nombre) VALUES (?, ?)'
        );
        foreach ($tags as $tag) {
            if ($tag !== '') {
                $st->execute([$this->userId, $tag]);
            }
        }
    }
}
