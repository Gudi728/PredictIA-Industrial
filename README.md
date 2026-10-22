# PredictIA Industrial

Proyecto de Práctica Profesionalizante II orientado a Industria 4.0. Es un MVP de mantenimiento predictivo IoT para monitorear temperatura y vibración en máquinas industriales (inyectora de plástico).

## KIT Industria 4.0

AVZ-01 — Mantenimiento Predictivo IoT.

## Alcance del MVP

- Login con JWT y control de acceso por roles (administrador, mantenimiento, operario).
- Gestión de usuarios (solo administrador).
- Listado, creación y edición de máquinas.
- Configuración de límites por máquina y variable (administrador y mantenimiento).
- Mediciones: estado actual, historial, simulación y registro de medición de prueba.
- Alertas automáticas por superación de límite y tendencia anormal, con cambio de estado (pendiente → en revisión → resuelta).
- Dashboard con indicadores, estado por máquina, gráficos SVG de historial y alertas recientes.

**Las mediciones son simuladas o de prueba: el sistema no se conecta a sensores físicos.**

### Funcionalidades pendientes (fuera del alcance del MVP)

- Ingesta de datos desde sensores físicos reales.
- Atenciones de alertas con observaciones desde la interfaz (el endpoint del backend existe).
- Notificaciones (correo, push) y reportes exportables.
- Paginación en las pantallas de historial y alertas.

## Tecnologías y arquitectura

- **Backend:** Node.js, Express 5, mysql2, JWT, bcryptjs. Arquitectura en capas: rutas → controladores → servicios → repositorios.
- **Frontend:** React 19, React Router 7, Vite. Gráficos con SVG nativo, sin librerías externas.
- **Base de datos:** MySQL Community Server 8.4 (11 tablas). Datos iniciales: roles `administrador`, `mantenimiento` y `operario`; variables `temperatura` (`°C`) y `vibracion` (`mm/s`).

## Requisitos del sistema

- Node.js 18 o superior.
- MySQL 8.x accesible (en desarrollo se usa el puerto `3307`).
- npm.

## Preparación de MySQL

1. Crear la base de datos y las tablas ejecutando, en orden:
   - `database/01_schema.sql`
   - `database/02_seed.sql`
2. Opcionalmente, verificar integridad con `database/03_integrity_tests.sql`.
3. Crear un usuario de base de datos con permisos sobre la base creada.

## Configuración de variables de entorno

Las credenciales reales se administran mediante archivos `.env`, que **no se versionan**. Cada paquete incluye su plantilla `.env.example`.

### Backend — copiar `backend/.env.example` a `backend/.env`

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `PORT` | Puerto del API | `3000` |
| `DB_HOST` | Host de MySQL | `127.0.0.1` |
| `DB_PORT` | Puerto de MySQL | `3307` |
| `DB_USER` | Usuario de MySQL | `predictia_app` |
| `DB_PASSWORD` | Contraseña de MySQL | *(vacío en la plantilla)* |
| `DB_NAME` | Base de datos | `predictia_industrial` |
| `JWT_SECRET` | Secreto de firma JWT | *(vacío en la plantilla)* |
| `JWT_EXPIRES_IN` | Expiración del token | `8h` |
| `ADMIN_*` | Datos del administrador inicial | *(vacíos en la plantilla)* |

### Frontend — copiar `frontend/.env.example` a `frontend/.env`

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `VITE_API_URL` | URL base del API | `http://localhost:3000/api` |

## Instalación e inicio

### Backend

```
cd backend
npm install
npm run setup:admin   # crea el usuario administrador inicial (usa ADMIN_* del .env)
npm run dev           # o: npm start
```

El API queda disponible en `http://localhost:3000` (verificar con `GET /api/health`).

### Frontend

```
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Roles disponibles

| Rol | Permisos principales |
| --- | --- |
| `administrador` | Todo: usuarios, máquinas, límites, simulación y mediciones de prueba, gestión de alertas. |
| `mantenimiento` | Límites, consulta de mediciones y gestión de alertas (cambio de estado). |
| `operario` | Consulta de máquinas asignadas, mediciones y alertas (solo lectura). |

## Flujo básico de demostración

1. Iniciar sesión como administrador.
2. En **Máquinas**, registrar una máquina (ej. `INY-DEMO-001`).
3. En **Límites**, configurar temperatura máxima (ej. `80 °C`) y vibración máxima (ej. `7 mm/s`) para esa máquina.
4. En **Mediciones**, usar la **medición de prueba** con un valor que supere el límite (ej. temperatura `90`).
5. El backend genera automáticamente una alerta por superación de límite.
6. En **Alertas**, consultar el detalle y cambiar su estado: pendiente → en revisión → resuelta.
7. En el **Dashboard**, revisar indicadores, gráficos de historial y alertas recientes.

## Estructura

- `backend/`: API REST y lógica de la aplicación.
- `frontend/`: aplicación React (Vite).
- `database/`: scripts de creación, datos iniciales y pruebas de integridad de MySQL.
- `docs/evidencias/`: evidencias técnicas del proyecto.

## Pruebas de desarrollo

Los módulos del frontend (login, usuarios, máquinas, límites, mediciones, alertas y dashboard) fueron probados manualmente en el navegador contra el backend real, incluyendo la generación automática de alertas mediante una medición de prueba de `90 °C` con límite de `80 °C`.

**Limitación registrada:** las comparaciones históricas de determinados campos de los usuarios ID 4 e ID 5 quedaron **NO VERIFICABLES** por pérdida de snapshots durante el desarrollo; esas comparaciones no deben presentarse como aprobadas.

## Evidencias

[Documentación y evidencias de la Semana 3](docs/evidencias/semana-3/README.md)
