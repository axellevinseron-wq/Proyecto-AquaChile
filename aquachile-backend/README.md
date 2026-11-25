# Backend AquaChile

Backend principal de la aplicación: Spring Boot, Java 21 y PostgreSQL. Requiere Maven 3.9 o superior.

## Ejecución local

1. Crea la base de datos configurada en `DB_URL` (por defecto `aquachile_dev`).
2. Desde PowerShell, define las variables necesarias y ejecuta el backend:

```powershell
$env:DB_PASSWORD = "tu-clave-local"
$env:JWT_SECRET = "un-secreto-aleatorio-de-al-menos-32-caracteres"
$env:ADMIN_INITIAL_PASSWORD = "una-clave-inicial-segura"
mvn spring-boot:run
```

Ejecuta estos comandos desde `aquachile-backend`. El API queda disponible en `http://localhost:8080`.
No guardes claves reales en archivos versionados. Las variables disponibles están listadas en `.env.example`.

En otra terminal, desde la raíz del repositorio:

```powershell
npm install
npm run dev
```

El frontend usa `http://localhost:8080` por defecto. Configura `VITE_API_URL` si el backend está en otra dirección.

## Funcionalidades adaptadas

- **Portal público de empleos:** disponible en `/` y `/empleos`, con ofertas compartibles en `/empleos/{id}`; `/oportunidades` se conserva como alias y `/acceso` abre el inicio de sesión del equipo. Las postulaciones admiten un mensaje opcional de hasta 1500 caracteres y muestran su fecha y mensaje en la sección «Postulaciones».
- **CV de postulaciones:** adjunto opcional PDF de hasta 10 MiB. Se almacena en `UPLOAD_DIR` (por defecto `./uploads`), fuera del directorio público. ADMIN, ANALISTA_RECLUTAMIENTO y EVALUADOR pueden consultar y descargarlo; solo ADMIN puede eliminarlo.
- **Invitaciones:** desde la sección «Invitaciones», ADMIN crea accesos para los roles del sistema. Los enlaces son de un solo uso y vencen en 24 horas. La solicitud pública de acceso existente continúa disponible. Si se configura `RESEND_API_KEY`, el enlace se envía por correo; si no, el panel permite copiarlo para compartirlo directamente.
- **Google Calendar y Meet:** desde «Postulaciones», ADMIN cambia el estado a «Entrevista» y puede agendar, reprogramar o cancelar la cita. Google Calendar envía la invitación al correo de la persona postulante. La cuenta autorizada para crear la cita debe ser la misma que la modifica o cancela.

Variables para estas integraciones:

- `APP_BASE_URL`: URL pública del frontend usada en los enlaces de invitación.
- `RESEND_API_KEY` y `RESEND_FROM`: envío opcional de invitaciones.
- `VITE_GOOGLE_CLIENT_ID`: ID OAuth de Google para autorizar Calendar desde el navegador. Configura también los orígenes permitidos en el cliente OAuth.
- `UPLOAD_DIR`: carpeta privada para archivos de CV.

## Pruebas

```powershell
mvn test
```

Desde la raíz, las validaciones del frontend incluyen `npm run build` y `npm run test:run`.
