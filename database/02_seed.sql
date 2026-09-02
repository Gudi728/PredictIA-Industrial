-- ============================================================
-- PredictIA Industrial
-- Datos iniciales del MVP
-- Requiere la ejecución previa de 01_schema.sql
-- ============================================================

USE predictia_industrial;

-- ============================================================
-- ROLES INICIALES
-- ============================================================

INSERT INTO roles (nombre, descripcion, activo)
VALUES (
    'administrador',
    'Administra usuarios, roles, maquinas, limites y simulaciones.',
    TRUE
)
ON DUPLICATE KEY UPDATE
    descripcion = 'Administra usuarios, roles, maquinas, limites y simulaciones.',
    activo = TRUE;

INSERT INTO roles (nombre, descripcion, activo)
VALUES (
    'mantenimiento',
    'Consulta mediciones y alertas, gestiona estados y registra atenciones.',
    TRUE
)
ON DUPLICATE KEY UPDATE
    descripcion = 'Consulta mediciones y alertas, gestiona estados y registra atenciones.',
    activo = TRUE;

INSERT INTO roles (nombre, descripcion, activo)
VALUES (
    'operario',
    'Consulta las maquinas habilitadas y registra observaciones.',
    TRUE
)
ON DUPLICATE KEY UPDATE
    descripcion = 'Consulta las maquinas habilitadas y registra observaciones.',
    activo = TRUE;

-- ============================================================
-- VARIABLES MONITOREADAS
-- ============================================================

INSERT INTO variables_monitoreadas (
    nombre,
    unidad,
    descripcion,
    activo
)
VALUES (
    'temperatura',
    CONVERT(0xC2B043 USING utf8mb4),
    'Temperatura de funcionamiento de la maquina.',
    TRUE
)
ON DUPLICATE KEY UPDATE
    unidad = CONVERT(0xC2B043 USING utf8mb4),
    descripcion = 'Temperatura de funcionamiento de la maquina.',
    activo = TRUE;

INSERT INTO variables_monitoreadas (
    nombre,
    unidad,
    descripcion,
    activo
)
VALUES (
    'vibracion',
    'mm/s',
    'Velocidad de vibracion registrada en la maquina.',
    TRUE
)
ON DUPLICATE KEY UPDATE
    unidad = 'mm/s',
    descripcion = 'Velocidad de vibracion registrada en la maquina.',
    activo = TRUE;
