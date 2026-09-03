# PredictIA Industrial

Proyecto de Práctica Profesionalizante II orientado a Industria 4.0. Es un MVP de mantenimiento predictivo IoT para monitorear temperatura y vibración en una máquina inyectora de plástico.

## KIT Industria 4.0

AVZ-01 — Mantenimiento Predictivo IoT.

## Tecnologías y arquitectura

- Backend implementado con Node.js y Express.
- Base de datos MySQL Community Server 8.4.
- API REST con arquitectura separada en rutas, controladores, servicios y repositorios.
- CORS, dotenv y mysql2.

La base `predictia_industrial` contiene 11 tablas. Sus datos iniciales incluyen los roles `administrador`, `mantenimiento` y `operario`, y las variables `temperatura` (`°C`) y `vibracion` (`mm/s`).

MySQL se ejecuta localmente en el puerto `3307`. Las credenciales reales se administran mediante `.env`, que no se versiona; `.env.example` funciona como plantilla.

## APIs implementadas

- `GET /api/health`
- `GET /api/health/database`
- `GET /api/roles`
- `GET /api/variables`
- `GET /api/maquinas`

`/api/maquinas` puede devolver una colección vacía porque todavía no existen máquinas iniciales.

## Estructura

- `backend/`: API REST y lógica de la aplicación.
- `database/`: scripts de creación, datos iniciales y pruebas de integridad de MySQL.
- `frontend/`: espacio reservado; React todavía no está implementado.
- `docs/evidencias/`: evidencias técnicas del proyecto.

JWT, autenticación, autorización y CRUD completo corresponden a etapas posteriores y no están implementados.

## Estado del proyecto

Semana 3 — Implementada, probada y documentada.

## Evidencias

[Documentación y evidencias de la Semana 3](docs/evidencias/semana-3/README.md)
