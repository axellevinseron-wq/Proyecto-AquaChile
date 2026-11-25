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
| `server/dominio.js` | Las reglas del sistema: usuarios, invitaciones, presencia y notificaciones. |
| `server/almacen.js` | Guarda los datos en `server/data/db.json` (escritura atómica). Sin base de datos externa. |
| `server/seguridad.js` | Hash de contraseñas y tokens de invitación (incluido en Node). |
| `server/sesiones.js` | Sesiones en memoria (duran 8 horas desde la última actividad). |
| `server/seed.js` | Datos de ejemplo de la primera ejecución. |

En el frontend, `src/api.js` hace las peticiones y `src/auth.js` mantiene una copia local de los datos
(se actualiza al iniciar sesión, tras cada cambio y cada 10 segundos).

## API

| Método y ruta | Quién | Descripción |
| --- | --- | --- |
| `POST /api/sesion` | público | Inicia sesión. Devuelve `{ token, sesion }`. |
| `GET /api/sesion` · `DELETE /api/sesion` | sesión | Consulta / cierra la sesión. |
| `GET /api/sincronizacion` | sesión | Usuarios, conexiones, notificaciones e invitaciones (el usuario normal solo recibe su propio registro). |
| `POST /api/presencia/latido` · `/desconexion` | sesión | Estado conectado / inactivo / desconectado. |
| `PATCH /api/usuarios/:usuario` | admin | Cambia rol y permisos. |
| `PATCH /api/usuarios/:usuario/perfil` | el propio usuario o admin | Actualiza datos personales, foto y banner. |
| `GET/POST /api/admin/invitaciones` | admin | Lista y crea invitaciones. |
| `POST /api/admin/invitaciones/:id/revocar` | admin | Revoca una invitación pendiente. |
| `GET /api/invitaciones/:token` | público | Comprueba una invitación sin revelar el hash del token. |
| `POST /api/invitaciones/:token/aceptar` | público | Configura la contraseña y consume la invitación una sola vez. |
| `GET /api/ofertas` · `/ofertas/:id` | público | Lista ofertas publicadas y consulta su detalle. |
| `POST /api/postulaciones` | público | Envía una postulación a una oferta vigente; acepta un CV PDF opcional de hasta 10 MB. |
| `GET/POST /api/admin/ofertas` · `PATCH /api/admin/ofertas/:id` | admin | Consulta, crea y actualiza ofertas. |
| `GET /api/admin/postulaciones` · `PATCH /api/admin/postulaciones/:id/estado` | admin | Revisa postulaciones y actualiza su estado. |
| `GET/DELETE /api/admin/postulaciones/:id/cv` | admin | Consulta en línea o elimina el CV privado de una postulación. |
| `POST/PATCH/DELETE /api/admin/postulaciones/:id/entrevista` | admin | Agenda, reprograma o cancela una entrevista de Google Calendar/Meet. |
| `GET/PUT /api/colecciones/candidatos` y `/solicitudes` | sesión (PUT con permiso de la sección) | Lista de candidatos y de solicitudes de evaluación. |

## Portal de empleos

- `/` muestra las ofertas públicas; `/empleos` es un alias y `/empleos/:id` presenta el detalle y el formulario de postulación.
- `/acceso` es la entrada al sistema interno; el portal público enlaza allí como «Acceso equipo».
- El panel interno tiene secciones de administración para ofertas y postulaciones, disponibles solo para administradores.
- En «Postulaciones», al cambiar una postulación a «Entrevista», un administrador puede agendar, reprogramar o cancelar la cita en el calendario principal de su cuenta Google. El acceso OAuth se usa solo durante la operación; no se guarda el token.
- El formulario público permite adjuntar un CV opcional en PDF (máximo 10 MB). Los archivos se guardan en `server/data/cvs`, fuera de las carpetas públicas; `CV_STORAGE_DIR` permite definir otro directorio privado. Solo administradores pueden verlos o eliminarlos desde «Postulaciones». Se conservan hasta que un administrador los elimine.
- Para habilitarlo, configura `VITE_GOOGLE_CLIENT_ID` en `.env` con un cliente OAuth de tipo aplicación web en Google Cloud. Habilita Google Calendar API y agrega los orígenes de desarrollo/producción como orígenes JavaScript autorizados. La autorización solicita correo e `calendar.events`.
- Las cuentas nuevas se crean por invitación de un administrador. El enlace vence en 24 horas, es de un solo uso y permite que la persona defina su propia contraseña (mínimo 12 caracteres). Los tokens se guardan como hash.
- Por defecto, las cuentas con rol «Usuario» reciben todos los permisos desactivados; el administrador selecciona los necesarios. Los administradores pueden invitar y revocar desde «Usuarios».
- Si Resend no está configurado o falla el envío, el panel muestra el enlace para compartirlo directamente con la persona indicada. Configura `APP_BASE_URL` con la URL pública del frontend; para correo, define `RESEND_API_KEY` y un `RESEND_FROM` verificado en Resend.
- El antiguo formulario y las rutas públicas de solicitud de acceso ya no están disponibles. Los registros históricos existentes en `db.json` se conservan, pero no se publican ni se usan para crear cuentas.
- Ofertas, postulaciones y solicitudes de evaluación son datos distintos. Las postulaciones no crean automáticamente una evaluación psicolaboral.
- Las ofertas iniciales están marcadas como ejemplos para la vista de demostración. Las postulaciones guardan nombre, correo, teléfono y mensaje; los metadatos del CV se guardan junto a la postulación y el archivo se mantiene separado.

## Pruebas

```bash
npm run test:run     # frontend (Vitest): levanta un servidor Express real por cada test
npm run test:server  # servidor: reglas del dominio y API HTTP (node:test)
```

## Cosas a tener en cuenta

- **Las contraseñas no se guardan en claro** (hash scrypt). Los tokens de invitación también se almacenan como hash; el enlace original solo se muestra al administrador al crear la invitación.
- Reiniciar el servidor cierra todas las sesiones (están en memoria). Los datos se conservan en `server/data/db.json`.
- Candidatos y solicitudes de evaluación se guardan como lista completa: si dos personas editan a la vez, gana el
  último guardado. Si el uso real lo requiere, el siguiente paso es pasar a endpoints por registro (crear / cambiar estado).
- Las ofertas y postulaciones también se guardan en `server/data/db.json`; para un uso real con datos personales conviene
  migrar a una base de datos y definir políticas de privacidad, retención y seguridad antes de publicar el portal.
- Los currículums contienen datos personales: restringe el acceso al directorio configurado en `CV_STORAGE_DIR` y elimina los archivos cuando ya no sean necesarios.
- Para pasar a una base de datos real (SQLite, PostgreSQL), solo hay que reemplazar `server/almacen.js`.
