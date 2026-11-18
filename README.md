# AquaChile – Evaluaciones psicolaborales

Aplicación web con **React + Vite** (frontend) y **Express** (backend, carpeta `server/`).
Antes todo se guardaba en `localStorage`; ahora los datos viven en el servidor y el navegador los pide por HTTP.

## Cómo ejecutarlo

Requiere Node 20.19 o superior.

```bash
npm install          # (no uses "npm ci": el package-lock.json aún no incluye Express)
cp .env.example .env # opcional: puerto, archivo de datos, etc.
npm run dev:all      # frontend en http://localhost:5173 y API en http://localhost:3001
```

También se pueden levantar por separado: `npm run dev` (Vite) y `npm run server` (Express con recarga automática).

**Producción:** `npm run build` y luego `npm start`. Express sirve la API (`/api`) y el frontend compilado (`dist/`)
desde el mismo puerto.

Cuentas de ejemplo: `admin / admin123`, `jefe.rrhh / rrhh123` (administradores) y `psicologo / psico123` (usuario).

## Estructura del servidor

| Archivo | Para qué sirve |
| --- | --- |
| `server/index.js` | Arranca Express (lee `.env`, abre el archivo de datos, escucha el puerto). |
| `server/app.js` | Crea la aplicación Express: todas las rutas `/api` y el servicio del frontend compilado. |
| `server/middleware.js` | Sesión (`Authorization: Bearer`), permisos por rol/sección, límite de intentos y manejo de errores. |
| `server/dominio.js` | Las reglas del sistema (antes en `src/auth.js`): usuarios, solicitudes de acceso, presencia, notificaciones. |
| `server/almacen.js` | Guarda los datos en `server/data/db.json` (escritura atómica). Sin base de datos externa. |
| `server/seguridad.js` | Hash de contraseñas con scrypt (incluido en Node) y códigos aleatorios. |
| `server/sesiones.js` | Sesiones en memoria (duran 8 horas desde la última actividad). |
| `server/seed.js` | Datos de ejemplo de la primera ejecución. |

En el frontend, `src/api.js` hace las peticiones y `src/auth.js` mantiene una copia local de los datos
(se actualiza al iniciar sesión, tras cada cambio y cada 10 segundos).

## API

| Método y ruta | Quién | Descripción |
| --- | --- | --- |
| `POST /api/sesion` | público | Inicia sesión. Devuelve `{ token, sesion }`. |
| `GET /api/sesion` · `DELETE /api/sesion` | sesión | Consulta / cierra la sesión. |
| `GET /api/sincronizacion` | sesión | Usuarios, conexiones, notificaciones y solicitudes de acceso (el usuario normal solo recibe su propio registro). |
| `POST /api/presencia/latido` · `/desconexion` | sesión | Estado conectado / inactivo / desconectado. |
| `PATCH /api/usuarios/:usuario` | admin | Cambia rol y permisos. |
| `PATCH /api/usuarios/:usuario/perfil` | el propio usuario o admin | Actualiza datos personales, foto y banner. |
| `POST /api/accesos` | público | Envía una solicitud de acceso. |
| `POST /api/accesos/consulta` | público | Consulta el estado con correo y código. |
| `GET /api/accesos/ejemplos` | público | Solicitudes de ejemplo (se desactivan con `EJEMPLOS_DEMO=false`). |
| `POST /api/accesos/:id/estado` · `/comentarios` | admin | Acepta/rechaza y comenta. El autor lo toma el servidor de la sesión. |
| `GET /api/ofertas` · `/ofertas/:id` | público | Lista ofertas publicadas y consulta su detalle. |
| `POST /api/postulaciones` | público | Envía una postulación a una oferta vigente. |
| `GET/POST /api/admin/ofertas` · `PATCH /api/admin/ofertas/:id` | admin | Consulta, crea y actualiza ofertas. |
| `GET /api/admin/postulaciones` · `PATCH /api/admin/postulaciones/:id/estado` | admin | Revisa postulaciones y actualiza su estado. |
| `GET/PUT /api/colecciones/candidatos` y `/solicitudes` | sesión (PUT con permiso de la sección) | Lista de candidatos y de solicitudes de evaluación. |

## Portal de empleos

- `/` muestra las ofertas públicas; `/empleos` es un alias y `/empleos/:id` presenta el detalle y el formulario de postulación.
- `/acceso` es la entrada al sistema interno; el portal público enlaza allí como «Acceso equipo».
- El panel interno tiene secciones de administración para ofertas y postulaciones, disponibles solo para administradores.
- Ofertas, postulaciones y solicitudes de evaluación son datos distintos. Las postulaciones no crean automáticamente una evaluación psicolaboral.
- Las ofertas iniciales están marcadas como ejemplos para la vista de demostración. Las postulaciones guardan nombre, correo, teléfono y mensaje, sin adjuntos.

## Pruebas

```bash
npm run test:run     # frontend (Vitest): levanta un servidor Express real por cada test
npm run test:server  # servidor: reglas del dominio y API HTTP (node:test)
```

## Cosas a tener en cuenta

- **Las contraseñas ya no se guardan en claro** (hash scrypt). La excepción es `credenciales` en las solicitudes
  aceptadas: se conservan para que el solicitante vea su contraseña inicial en «Estado de solicitud», igual que antes.
  Para producción conviene reemplazar eso por un enlace de «crear contraseña» enviado por correo.
- Reiniciar el servidor cierra todas las sesiones (están en memoria). Los datos se conservan en `server/data/db.json`.
- Candidatos y solicitudes de evaluación se guardan como lista completa: si dos personas editan a la vez, gana el
  último guardado. Si el uso real lo requiere, el siguiente paso es pasar a endpoints por registro (crear / cambiar estado).
- Las ofertas y postulaciones también se guardan en `server/data/db.json`; para un uso real con datos personales conviene
  migrar a una base de datos y definir políticas de privacidad, retención y seguridad antes de publicar el portal.
- Para pasar a una base de datos real (SQLite, PostgreSQL), solo hay que reemplazar `server/almacen.js`.
