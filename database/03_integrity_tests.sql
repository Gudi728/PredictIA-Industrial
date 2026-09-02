-- ============================================================
-- PredictIA Industrial
-- Pruebas de restricciones e integridad referencial
-- Los errores indicados son resultados esperados
-- ============================================================

SET NAMES utf8mb4;
USE predictia_industrial;

START TRANSACTION;

-- Recuperar identificadores iniciales
SELECT id_rol
INTO @id_rol_administrador
FROM roles
WHERE nombre = 'administrador';

SELECT id_variable
INTO @id_temperatura
FROM variables_monitoreadas
WHERE nombre = 'temperatura';

SELECT id_variable
INTO @id_vibracion
FROM variables_monitoreadas
WHERE nombre = 'vibracion';

-- Crear datos temporales válidos
INSERT INTO usuarios (
    id_rol,
    nombre,
    apellido,
    nombre_usuario,
    correo,
    contrasena_hash,
    activo
)
VALUES (
    @id_rol_administrador,
    'Usuario',
    'Prueba',
    'usuario_integridad_test',
    'integridad@test.local',
    'hash_temporal_solo_para_prueba_de_integridad',
    TRUE
);

SET @id_usuario_prueba = LAST_INSERT_ID();

INSERT INTO maquinas (
    codigo,
    nombre,
    tipo,
    descripcion,
    ubicacion,
    activo
)
VALUES (
    'TEST-INTEGRIDAD',
    'Máquina de prueba',
    'Inyectora',
    'Registro temporal para pruebas de integridad',
    'Área de pruebas',
    TRUE
);

SET @id_maquina_prueba = LAST_INSERT_ID();

INSERT INTO limites_configurados (
    id_maquina,
    id_variable,
    valor_maximo,
    id_usuario_actualizacion
)
VALUES (
    @id_maquina_prueba,
    @id_temperatura,
    100.00,
    @id_usuario_prueba
);

INSERT INTO mediciones (
    id_maquina,
    id_variable,
    valor,
    origen
)
VALUES (
    @id_maquina_prueba,
    @id_temperatura,
    105.00,
    'prueba'
);

SET @id_medicion_prueba = LAST_INSERT_ID();

INSERT INTO alertas (
    id_medicion,
    id_maquina,
    id_variable,
    motivo,
    detalle,
    valor_detectado,
    limite_aplicado,
    estado_actual
)
VALUES (
    @id_medicion_prueba,
    @id_maquina_prueba,
    @id_temperatura,
    'superacion_limite',
    'Alerta temporal para prueba de integridad',
    105.00,
    100.00,
    'pendiente'
);

SET @id_alerta_prueba = LAST_INSERT_ID();

-- PRUEBA 1
INSERT INTO roles (nombre, descripcion, activo)
VALUES ('administrador', 'Rol duplicado', TRUE);

-- PRUEBA 2
INSERT INTO mediciones (
    id_maquina,
    id_variable,
    valor,
    origen
)
VALUES (
    999999,
    @id_temperatura,
    80.00,
    'prueba'
);

-- PRUEBA 3
INSERT INTO limites_configurados (
    id_maquina,
    id_variable,
    valor_maximo,
    id_usuario_actualizacion
)
VALUES (
    @id_maquina_prueba,
    @id_vibracion,
    -1.00,
    @id_usuario_prueba
);

-- PRUEBA 4
INSERT INTO limites_configurados (
    id_maquina,
    id_variable,
    valor_maximo,
    id_usuario_actualizacion
)
VALUES (
    @id_maquina_prueba,
    @id_temperatura,
    120.00,
    @id_usuario_prueba
);

-- PRUEBA 5
INSERT INTO alertas (
    id_medicion,
    id_maquina,
    id_variable,
    motivo,
    detalle,
    valor_detectado,
    limite_aplicado,
    estado_actual
)
VALUES (
    @id_medicion_prueba,
    @id_maquina_prueba,
    @id_temperatura,
    'tendencia_anormal',
    'Intento de alerta duplicada',
    105.00,
    100.00,
    'pendiente'
);

INSERT INTO mediciones (
    id_maquina,
    id_variable,
    valor,
    origen
)
VALUES (
    @id_maquina_prueba,
    @id_temperatura,
    90.00,
    'prueba'
);

SET @id_medicion_estado = LAST_INSERT_ID();

-- PRUEBA 6
INSERT INTO alertas (
    id_medicion,
    id_maquina,
    id_variable,
    motivo,
    detalle,
    valor_detectado,
    limite_aplicado,
    estado_actual
)
VALUES (
    @id_medicion_estado,
    @id_maquina_prueba,
    @id_temperatura,
    'tendencia_anormal',
    'Prueba de estado inválido',
    90.00,
    100.00,
    'cerrada'
);

-- PRUEBA 7
INSERT INTO historial_estados_alertas (
    id_alerta,
    id_usuario,
    estado_anterior,
    estado_nuevo
)
VALUES (
    @id_alerta_prueba,
    @id_usuario_prueba,
    'pendiente',
    'pendiente'
);

-- PRUEBA 8
DELETE FROM maquinas
WHERE id_maquina = @id_maquina_prueba;

ROLLBACK;

SELECT COUNT(*) AS maquinas_prueba_restantes
FROM maquinas
WHERE codigo = 'TEST-INTEGRIDAD';

SELECT COUNT(*) AS usuarios_prueba_restantes
FROM usuarios
WHERE nombre_usuario = 'usuario_integridad_test';
