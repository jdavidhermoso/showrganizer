CREATE TABLE IF NOT EXISTS users (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    email    VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chistes (
    id                   VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id              INT          NOT NULL,
    texto                TEXT         NOT NULL,
    categoria            VARCHAR(255) NOT NULL DEFAULT '',
    puntuacion           TINYINT      DEFAULT NULL,
    estado               VARCHAR(50)  NOT NULL DEFAULT 'borrador',
    tags                 JSON         DEFAULT NULL,
    fecha_creacion       DATETIME     NOT NULL,
    fecha_actualizacion  DATETIME     NOT NULL,
    duracion             INT          DEFAULT NULL,
    callbacks            JSON         DEFAULT NULL,
    idioma               VARCHAR(10)  NOT NULL DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shows (
    id                   VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id              INT          NOT NULL,
    titulo               VARCHAR(500) NOT NULL DEFAULT '',
    contenido            JSON         DEFAULT NULL,
    fecha_creacion       DATETIME     NOT NULL,
    fecha_actualizacion  DATETIME     NOT NULL,
    fecha_show           DATE         DEFAULT NULL,
    sala                 VARCHAR(255) NOT NULL DEFAULT '',
    ciudad               VARCHAR(255) NOT NULL DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bloques (
    id                   VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id              INT          NOT NULL,
    titulo               VARCHAR(500) NOT NULL DEFAULT '',
    descripcion          TEXT         NOT NULL DEFAULT '',
    chistes              JSON         DEFAULT NULL,
    fecha_creacion       DATETIME     NOT NULL,
    fecha_actualizacion  DATETIME     NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categorias (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT          NOT NULL,
    nombre  VARCHAR(255) NOT NULL,
    UNIQUE KEY uq_cat (user_id, nombre),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO categorias (user_id, nombre)
SELECT u.id, c.nombre
FROM users u
CROSS JOIN (
    SELECT 'Observacional' AS nombre UNION ALL
    SELECT 'Autoparodia'   UNION ALL
    SELECT 'Política'      UNION ALL
    SELECT 'Relaciones'    UNION ALL
    SELECT 'Trabajo'       UNION ALL
    SELECT 'Familia'       UNION ALL
    SELECT 'Absurdo'       UNION ALL
    SELECT 'Negro'         UNION ALL
    SELECT 'Cotidiano'
) c;

CREATE TABLE IF NOT EXISTS tags (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT          NOT NULL,
    nombre  VARCHAR(255) NOT NULL,
    UNIQUE KEY uq_tag (user_id, nombre),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
