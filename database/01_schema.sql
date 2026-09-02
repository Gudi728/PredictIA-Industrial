-- ============================================================
-- PredictIA Industrial
-- Base de datos del MVP de mantenimiento predictivo IoT
-- Motor: MySQL Community Server 8.4
-- ============================================================

CREATE DATABASE IF NOT EXISTS predictia_industrial
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE predictia_industrial;

-- ============================================================
-- 1. ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id_rol INT UNSIGNED AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_roles
        PRIMARY KEY (id_rol),

    CONSTRAINT uq_roles_nombre
        UNIQUE (nombre),

    CONSTRAINT chk_roles_activo
        CHECK (activo IN (0, 1))
) ENGINE = InnoDB;

-- ============================================================
-- 2. USUARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT UNSIGNED AUTO_INCREMENT,
    id_rol INT UNSIGNED NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    nombre_usuario VARCHAR(50) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuarios
        PRIMARY KEY (id_usuario),

    CONSTRAINT uq_usuarios_nombre_usuario
        UNIQUE (nombre_usuario),

    CONSTRAINT uq_usuarios_correo
        UNIQUE (correo),

    CONSTRAINT chk_usuarios_activo
        CHECK (activo IN (0, 1)),

    CONSTRAINT fk_usuarios_roles
        FOREIGN KEY (id_rol)
        REFERENCES roles (id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;

-- ============================================================
-- 3. MAQUINAS
-- ============================================================

CREATE TABLE IF NOT EXISTS maquinas (
    id_maquina INT UNSIGNED AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion VARCHAR(500) NULL,
    ubicacion VARCHAR(150) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_maquinas
        PRIMARY KEY (id_maquina),

    CONSTRAINT uq_maquinas_codigo
        UNIQUE (codigo),

    CONSTRAINT chk_maquinas_activo
        CHECK (activo IN (0, 1))
) ENGINE = InnoDB;

-- ============================================================
-- 4. ASIGNACIONES DE MAQUINAS
-- ============================================================

CREATE TABLE IF NOT EXISTS asignaciones_maquinas (
    id_usuario INT UNSIGNED NOT NULL,
    id_maquina INT UNSIGNED NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_asignaciones_maquinas
        PRIMARY KEY (id_usuario, id_maquina),

    CONSTRAINT chk_asignaciones_activo
        CHECK (activo IN (0, 1)),

    CONSTRAINT fk_asignaciones_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_asignaciones_maquina
        FOREIGN KEY (id_maquina)
        REFERENCES maquinas (id_maquina)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;

-- ============================================================
-- 5. VARIABLES MONITOREADAS
-- ============================================================

CREATE TABLE IF NOT EXISTS variables_monitoreadas (
    id_variable INT UNSIGNED AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_variables_monitoreadas
        PRIMARY KEY (id_variable),

    CONSTRAINT uq_variables_nombre
        UNIQUE (nombre),

    CONSTRAINT chk_variables_activo
        CHECK (activo IN (0, 1))
) ENGINE = InnoDB;

-- ============================================================
-- 6. LIMITES CONFIGURADOS
-- ============================================================

CREATE TABLE IF NOT EXISTS limites_configurados (
    id_limite INT UNSIGNED AUTO_INCREMENT,
    id_maquina INT UNSIGNED NOT NULL,
    id_variable INT UNSIGNED NOT NULL,
    valor_maximo DECIMAL(10, 2) NOT NULL,
    id_usuario_actualizacion INT UNSIGNED NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_limites_configurados
        PRIMARY KEY (id_limite),

    CONSTRAINT uq_limites_maquina_variable
        UNIQUE (id_maquina, id_variable),

    CONSTRAINT chk_limites_valor_maximo
        CHECK (valor_maximo > 0),

    CONSTRAINT fk_limites_maquina
        FOREIGN KEY (id_maquina)
        REFERENCES maquinas (id_maquina)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_limites_variable
        FOREIGN KEY (id_variable)
        REFERENCES variables_monitoreadas (id_variable)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_limites_usuario_actualizacion
        FOREIGN KEY (id_usuario_actualizacion)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;

-- ============================================================
-- 7. MEDICIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS mediciones (
    id_medicion BIGINT UNSIGNED AUTO_INCREMENT,
    id_maquina INT UNSIGNED NOT NULL,
    id_variable INT UNSIGNED NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    origen VARCHAR(20) NOT NULL DEFAULT 'simulada',
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_mediciones
        PRIMARY KEY (id_medicion),

    CONSTRAINT chk_mediciones_origen
        CHECK (origen IN ('simulada', 'prueba')),

    CONSTRAINT fk_mediciones_maquina
        FOREIGN KEY (id_maquina)
        REFERENCES maquinas (id_maquina)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_mediciones_variable
        FOREIGN KEY (id_variable)
        REFERENCES variables_monitoreadas (id_variable)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_mediciones_maquina_variable_fecha (
        id_maquina,
        id_variable,
        fecha_hora
    )
) ENGINE = InnoDB;

-- ============================================================
-- 8. ALERTAS
-- ============================================================

CREATE TABLE IF NOT EXISTS alertas (
    id_alerta BIGINT UNSIGNED AUTO_INCREMENT,
    id_medicion BIGINT UNSIGNED NOT NULL,
    id_maquina INT UNSIGNED NOT NULL,
    id_variable INT UNSIGNED NOT NULL,
    motivo VARCHAR(30) NOT NULL,
    detalle VARCHAR(500) NULL,
    valor_detectado DECIMAL(10, 2) NOT NULL,
    limite_aplicado DECIMAL(10, 2) NOT NULL,
    estado_actual VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_alertas
        PRIMARY KEY (id_alerta),

    CONSTRAINT uq_alertas_medicion
        UNIQUE (id_medicion),

    CONSTRAINT chk_alertas_motivo
        CHECK (
            motivo IN (
                'superacion_limite',
                'tendencia_anormal'
            )
        ),

    CONSTRAINT chk_alertas_estado
        CHECK (
            estado_actual IN (
                'pendiente',
                'en_revision',
                'resuelta'
            )
        ),

    CONSTRAINT chk_alertas_limite
        CHECK (limite_aplicado > 0),

    CONSTRAINT fk_alertas_medicion
        FOREIGN KEY (id_medicion)
        REFERENCES mediciones (id_medicion)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_alertas_maquina
        FOREIGN KEY (id_maquina)
        REFERENCES maquinas (id_maquina)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_alertas_variable
        FOREIGN KEY (id_variable)
        REFERENCES variables_monitoreadas (id_variable)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_alertas_estado_fecha (
        estado_actual,
        fecha_hora
    ),

    INDEX idx_alertas_maquina_fecha (
        id_maquina,
        fecha_hora
    )
) ENGINE = InnoDB;

-- ============================================================
-- 9. HISTORIAL DE ESTADOS DE ALERTAS
-- ============================================================

CREATE TABLE IF NOT EXISTS historial_estados_alertas (
    id_historial BIGINT UNSIGNED AUTO_INCREMENT,
    id_alerta BIGINT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    estado_anterior VARCHAR(20) NOT NULL,
    estado_nuevo VARCHAR(20) NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_historial_estados_alertas
        PRIMARY KEY (id_historial),

    CONSTRAINT chk_historial_estado_anterior
        CHECK (
            estado_anterior IN (
                'pendiente',
                'en_revision',
                'resuelta'
            )
        ),

    CONSTRAINT chk_historial_estado_nuevo
        CHECK (
            estado_nuevo IN (
                'pendiente',
                'en_revision',
                'resuelta'
            )
        ),

    CONSTRAINT chk_historial_cambio_estado
        CHECK (estado_anterior <> estado_nuevo),

    CONSTRAINT fk_historial_alerta
        FOREIGN KEY (id_alerta)
        REFERENCES alertas (id_alerta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_historial_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_historial_alerta_fecha (
        id_alerta,
        fecha_hora
    )
) ENGINE = InnoDB;

-- ============================================================
-- 10. ATENCIONES DE ALERTAS
-- ============================================================

CREATE TABLE IF NOT EXISTS atenciones_alertas (
    id_atencion BIGINT UNSIGNED AUTO_INCREMENT,
    id_alerta BIGINT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    observacion TEXT NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_atenciones_alertas
        PRIMARY KEY (id_atencion),

    CONSTRAINT fk_atenciones_alerta
        FOREIGN KEY (id_alerta)
        REFERENCES alertas (id_alerta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_atenciones_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_atenciones_alerta_fecha (
        id_alerta,
        fecha_hora
    )
) ENGINE = InnoDB;

-- ============================================================
-- 11. OBSERVACIONES DE MAQUINAS
-- ============================================================

CREATE TABLE IF NOT EXISTS observaciones_maquinas (
    id_observacion BIGINT UNSIGNED AUTO_INCREMENT,
    id_maquina INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_observaciones_maquinas
        PRIMARY KEY (id_observacion),

    CONSTRAINT fk_observaciones_maquina
        FOREIGN KEY (id_maquina)
        REFERENCES maquinas (id_maquina)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_observaciones_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_observaciones_maquina_fecha (
        id_maquina,
        fecha_hora
    )
) ENGINE = InnoDB;
