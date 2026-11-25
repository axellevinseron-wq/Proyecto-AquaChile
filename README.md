# Proyecto AquaChile

**MVP de reclutamiento y evaluación psicolaboral** · Evaluación Parcial 3

Proyecto académico de Vinculación con el Medio desarrollado junto a AquaChile para la asignatura **DSY1104 — Desarrollo Fullstack II, Duoc UC (2026)**. Centraliza el proceso de reclutamiento y evaluación psicolaboral mediante una aplicación web integrada con una API REST y una base de datos relacional.

> La versión EA3 evoluciona el prototipo frontend de la EA2 hacia una solución Full Stack con persistencia real, JWT e inteligencia artificial. Se utilizan exclusivamente datos ficticios y CV de prueba.

## Integrantes

- Nicolas Oyarzo
- Matias Mansilla
- Axel Levin

Repositorio oficial: [Proyecto-AquaChile](https://github.com/axellevinseron-wq/Proyecto-AquaChile).

## Acceso directo

La aplicación está publicada en Internet. Para utilizarla desde otro computador o celular, basta con un navegador y conexión a Internet; no es necesario instalar herramientas ni encender el equipo de desarrollo.

| Recurso | Enlace |
|---|---|
| Aplicación web | [Abrir AquaChile](https://aquachile-frontend.vercel.app/) |
| Portal de empleos | [Ofertas laborales](https://aquachile-frontend.vercel.app/empleos) |
| Panel interno | [Iniciar sesión](https://aquachile-frontend.vercel.app/acceso) |
| API REST | [Swagger](https://aquachile-backend-1784.onrender.com/swagger-ui/index.html) |
| Administración del backend | [Render](https://dashboard.render.com/) |
| Administración del frontend | [Vercel](https://vercel.com/dashboard) |
| Administración de PostgreSQL | [Neon](https://console.neon.tech/) |
| Código fuente | [GitHub](https://github.com/axellevinseron-wq/Proyecto-AquaChile) |

Puede Demorar en Iniciar La Pagina!

## Índice

- [Problemática y objetivo](#problemática-y-objetivo)
- [Funcionalidades](#funcionalidades)
- [Tecnologías y contenidos del curso](#tecnologías-y-contenidos-del-curso)
- [Arquitectura y modelo de datos](#arquitectura-y-modelo-de-datos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Despliegue en Internet](#despliegue-en-internet)
- [Rutas y API REST](#rutas-y-api-rest)
- [Seguridad e inteligencia artificial](#seguridad-e-inteligencia-artificial)
- [Pruebas](#pruebas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Documentación](#documentación)

## Problemática y objetivo

El área de Reclutamiento y Selección necesita centralizar ofertas laborales, candidatos, postulaciones, solicitudes de evaluación y sus respectivos documentos. La dispersión de información dificulta el seguimiento de estados y la consulta de indicadores.

El objetivo del MVP es ofrecer un portal público de empleos y un panel interno que permita administrar el proceso, mantener información persistente y apoyar al analista mediante IA, sin sustituir la decisión humana.

## Funcionalidades

| Módulo | Qué permite |
|---|---|
| Portal público | Consultar ofertas publicadas, buscar, filtrar y abrir detalles. |
| Postulación laboral | Registrar antecedentes y adjuntar CV asociado a una oferta. |
| Acceso interno | Iniciar y cerrar sesión mediante JWT. |
| Solicitudes de acceso | Solicitar una cuenta, adjuntar PDF y consultar el estado mediante correo y código de seguimiento. |
| Administración de acceso | Revisar solicitudes, descargar CV, aprobar, rechazar y registrar comentarios. |
| Inicio e indicadores | Consultar resúmenes, gráficos, calendario y seguimiento del proceso. |
| Candidatos | Gestionar registros y consultar información mediante búsqueda y filtros. |
| Solicitudes de evaluación | Crear solicitudes y gestionar estados Pendiente, En proceso y Finalizada. |
| Ofertas laborales | Gestionar ofertas, editar sus antecedentes y controlar su publicación. |
| Usuarios y permisos | Administrar usuarios internos y controlar acceso según rol. |
| Evaluación de CV | Consultar antecedentes, recuperar el documento original y obtener análisis orientativo mediante IA. |
| Perfil y opciones | Editar información de perfil y personalizar la apariencia del sistema. |

### Flujo de demostración

1. El postulante entra al portal público, selecciona una oferta y adjunta un CV ficticio.
2. El backend valida la solicitud y registra postulante, postulación y referencia al archivo.
3. Un usuario autorizado inicia sesión y consulta la información registrada.
4. El analista gestiona solicitudes de evaluación y utiliza la IA como apoyo.
5. El equipo revisa los estados e indicadores del dashboard.

## Tecnologías y contenidos del curso

| Capa | Tecnologías |
|---|---|
| Frontend | React 19, Vite 8, Bootstrap 5, React Router |
| Backend | Java 21, Spring Boot, Spring MVC, Spring Security, Spring Data JPA |
| Persistencia | PostgreSQL, Hibernate/JPA, Neon |
| Despliegue | Vercel, Render, Docker |
| Seguridad | JWT, autorización por roles, BCrypt |
| Documentación API | Swagger UI / OpenAPI |
| IA | API Groq, modelo configurable |
| Pruebas frontend | Vitest, React Testing Library, user-event, cobertura V8 |
| Pruebas backend | JUnit, Mockito, JaCoCo |
| Herramientas | Maven, npm, ESLint, Git y GitHub |

Se aplican componentes reutilizables, props, hooks (`useState`, `useEffect`, `useMemo`), renderizado condicional, formularios validados, navegación, consumo HTTP, arquitectura por capas, persistencia relacional y pruebas automatizadas.

## Arquitectura y modelo de datos

React + Bootstrap se comunica mediante HTTP con Spring Boot. El backend se conecta a PostgreSQL, al almacenamiento privado de CV y a la API Groq. Swagger UI permite consultar y probar la API REST.

El backend concentra la lógica de negocio en un monolito organizado por módulos. Los controladores reciben peticiones HTTP, los servicios aplican reglas y los repositorios gestionan persistencia. React consume la API mediante `src/apiClient.js`. Las preferencias visuales y funciones auxiliares pueden conservar estado local; los datos principales se gestionan mediante el servidor.

### Entidades y relaciones principales

| Entidad | Responsabilidad |
|---|---|
| Usuario | Identidad, rol, estado y acceso interno. |
| Oferta | Cargo, categoría, ubicación, condiciones y publicación. |
| Postulante | Antecedentes del candidato. |
| Postulación | Vincula un postulante con una oferta y registra su estado. |
| Solicitud | Gestiona el seguimiento de una evaluación. |
| CV adjunto | Referencia al archivo asociado a una postulación. |
| Solicitud de acceso | Registro de petición de cuenta, seguimiento y CV asociado. |

Las postulaciones laborales almacenan archivos bajo `UPLOAD_DIR/<id-postulante>/<id-postulacion>/<id-archivo>.<ext>` y guardan sus referencias en PostgreSQL. Las solicitudes de acceso manejan su CV por separado. El contenedor laboral utiliza UUID.

## Instalación y ejecución

### 1. Requisitos

- Git, Java JDK 21 y Maven.
- Node.js compatible con Vite 8 (20.19+ o 22.12+; se recomienda una versión LTS compatible) y npm.
- PostgreSQL instalado y en ejecución.
- Clave de API Groq para demostrar la funcionalidad de IA.
- Dos terminales PowerShell (Windows) para ejecutar frontend y backend.

### 2. Obtener el proyecto

```powershell
git clone https://github.com/axellevinseron-wq/Proyecto-AquaChile.git
cd Proyecto-AquaChile
```

La guía supone que el repositorio oficial contiene la versión integrada, con `src/` y `aquachile-backend/` en la raíz.

### 3. Preparar PostgreSQL

En PowerShell **como administrador**, si el servicio instalado se llama `postgresql-x64-18`:

```powershell
Get-Service *postgres*
Start-Service postgresql-x64-18
```

Desde pgAdmin o psql, crear una base de datos `aquachile_dev` y un usuario con permisos sobre ella. Usar una contraseña propia y no publicarla. Ejemplo SQL ejecutado como administrador de PostgreSQL:

```sql
CREATE ROLE aquachile_app LOGIN PASSWORD 'REEMPLAZAR_POR_CONTRASENA_PRIVADA';
CREATE DATABASE aquachile_dev OWNER aquachile_app;
```

Si la base o el usuario ya existen, reutilizarlos; no borrar datos. La configuración de Hibernate del proyecto determina la creación o actualización del esquema.

### 4. Configurar y ejecutar el backend

En la primera terminal, desde la raíz:

```powershell
cd aquachile-backend
$env:DB_URL = "jdbc:postgresql://localhost:5432/aquachile_dev"
$env:DB_USER = "aquachile_app"
$env:DB_PASSWORD = "TU_CONTRASENA_PRIVADA"
$bytes = New-Object byte[] 64
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$rng.Dispose()
$env:ADMIN_INITIAL_PASSWORD = "TU_CONTRASENA_INICIAL"
$env:GROQ_API_KEY = "TU_CLAVE_GROQ"
$env:CORS_ORIGINS = "http://localhost:5173,http://localhost:5174"
$env:UPLOAD_DIR = "./uploads"
mvn spring-boot:run
```

Mantener el mismo secreto JWT durante la demostración. Para un entorno estable, almacenarlo en un gestor de secretos y reutilizarlo entre reinicios. Las variables de PowerShell se aplican a esa terminal. No copiar claves reales al repositorio.

### 5. Ejecutar el frontend

En una segunda terminal, desde la raíz:

```powershell
npm install
$env:VITE_API_URL = "http://localhost:8080"
npm run dev
```

| Servicio | Dirección local |
|---|---|
| Portal público | http://localhost:5173/empleos |
| Acceso interno | http://localhost:5173/acceso |
| Solicitud de cuenta | http://localhost:5173/solicitud |
| API / salud | http://localhost:8080/api/health |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |

Si Vite utiliza otro puerto, actualizar CORS. Si el puerto 8080 está ocupado, identificar el proceso antes de detenerlo.

### Variables de entorno

| Variable | Uso |
|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Conexión JDBC y credenciales PostgreSQL. |
| `JWT_SECRET` | Firma y validación de tokens. |
| `ADMIN_INITIAL_PASSWORD` | Contraseña de inicialización administrativa. |
| `CORS_ORIGINS` | Orígenes frontend autorizados. |
| `UPLOAD_DIR` | Directorio privado de archivos. |
| `GROQ_API_KEY` | Credencial privada del proveedor IA. |
| `GROQ_MODEL` | Modelo configurable de IA. |
| `VITE_API_URL` | URL pública de la API consumida por React. |

### Usuarios de prueba

Los roles internos contemplados son Administrador (`ADMIN`), Analista de reclutamiento (`ANALISTA_RECLUTAMIENTO`) y Evaluador (`EVALUADOR`). El acceso se realiza con cuentas configuradas en el backend. Crear o verificar cuentas ficticias antes de la demostración; las credenciales del prototipo EA2 no se consideran vigentes. No publicar contraseñas activas ni tokens.

## Despliegue en Internet

La versión de demostración está publicada en tres plataformas independientes. No requiere mantener encendido el computador de desarrollo.

| Servicio | Dirección |
|---|---|
| Aplicación web (Vercel) | [AquaChile](https://aquachile-frontend.vercel.app) |
| Portal público | [Ofertas laborales](https://aquachile-frontend.vercel.app/empleos) |
| Acceso interno | [Iniciar sesión](https://aquachile-frontend.vercel.app/acceso) |
| Backend (Render) | https://aquachile-backend-1784.onrender.com |
| Swagger | [API REST](https://aquachile-backend-1784.onrender.com/swagger-ui/index.html) |
| Base de datos | Neon PostgreSQL, base `aquachile_prod` |

### Backend: Render

El servicio utiliza Docker, la rama `main` del repositorio oficial y el directorio `aquachile-backend`. El `Dockerfile` compila el proyecto con Maven y ejecuta el JAR con Java 21 en el puerto 10000. Las variables privadas se configuran en Environment del servicio, nunca en GitHub.

- `DB_URL`: URL JDBC de Neon con TLS (`sslmode=require&channelBinding=require`).
- `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_INITIAL_PASSWORD`, `GROQ_API_KEY`: valores privados del entorno.
- `SERVER_PORT`: `10000`.
- `CORS_ORIGINS`: `http://localhost:5175,https://aquachile-frontend.vercel.app`.
- `UPLOAD_DIR`: `/app/uploads`.

### Frontend: Vercel

El frontend utiliza Vite, el comando de compilación `vite build` y el directorio de salida `dist`. La variable de producción `VITE_API_URL` apunta a `https://aquachile-backend-1784.onrender.com`. El archivo `vercel.json` configura la navegación SPA y `.vercelignore` excluye el backend y archivos locales del despliegue.

El proyecto Vercel está vinculado mediante CLI, sin conexión automática al repositorio Git. Para actualizarlo desde la raíz del proyecto, con una cuenta autorizada:

```powershell
vercel login
vercel link
vercel --prod
```

Seleccionar el proyecto existente `aquachile-frontend` al vincular. No crear otro repositorio. Los archivos `.env.local` y `.vercel/` no deben publicarse.

### Operación y almacenamiento

Neon conserva los registros de la base de datos independientemente del ciclo de vida del backend. La base de demostración es independiente de la base local. Render gratuito puede suspender el servicio por inactividad; una nueva petición puede despertarlo y tardar en responder. Vercel mantiene publicado el frontend.

Los CV laborales guardados en `/app/uploads` utilizan el sistema de archivos temporal de Render: pueden perderse al reiniciar, suspender o redesplegar el servicio, aunque sus referencias permanezcan en PostgreSQL. Para garantizar su conservación se requiere almacenamiento privado persistente. Esta limitación no afecta la ejecución local con un directorio de archivos conservado. Utilizar exclusivamente datos y CV ficticios.

## Rutas y API REST

### Rutas del frontend

| Ruta | Pantalla |
|---|---|
| `/`, `/empleos`, `/oportunidades` | Portal público |
| `/empleos/:ofertaId` | Detalle de oferta |
| `/solicitud` | Solicitud de acceso y seguimiento |
| `/acceso` | Acceso interno |
| `/inicio`, `/indicadores` | Dashboard e indicadores |
| `/candidatos`, `/solicitudes` | Gestión interna |
| `/evaluacion-cv` | Evaluación de CV |
| `/ofertas`, `/cuentas`, `/usuarios` | Administración |
| `/perfil`, `/opciones` | Perfil y preferencias |

### Endpoints principales

| Método | Endpoint | Finalidad |
|---|---|---|
| POST | `/api/auth/login` | Obtener JWT |
| GET | `/api/auth/me` | Consultar usuario autenticado |
| GET | `/api/publico/ofertas` | Listar ofertas públicas |
| GET | `/api/publico/ofertas/{id}` | Detalle público |
| POST | `/api/publico/postulaciones` | Postular con CV multipart |
| POST | `/api/publico/solicitudes-acceso` | Solicitar cuenta |
| POST | `/api/publico/solicitudes-acceso/consultar` | Consultar seguimiento |
| CRUD | `/api/ofertas`, `/api/postulantes`, `/api/postulaciones`, `/api/solicitudes` | Gestión de recursos |
| GET | `/api/dashboard/resumen` | Indicadores |
| GET | `/api/postulaciones/{id}/cv` | Recuperar CV |
| POST | `/api/ia/postulaciones/{id}/analizar-cv` | Analizar CV |
| GET | `/api/ia/postulaciones/{id}/similitud-cv` | Consultar similitud |

Swagger UI contiene los contratos y métodos disponibles. Para probar rutas protegidas, iniciar sesión y utilizar el token con `Authorization: Bearer <token>`. Los errores HTTP habituales son 400 (validación), 401 (sin autenticación válida), 403 (sin permiso) y 404 (recurso no encontrado).

## Seguridad e inteligencia artificial

- JWT firmado en el servidor; el cliente conserva la sesión en `sessionStorage` y verifica su vigencia mediante la API.
- Los permisos de interfaz complementan, pero no sustituyen, la autorización del backend.
- Los CV de postulación admiten PDF o DOCX de hasta 5 MB según las validaciones del servidor; la solicitud de acceso utiliza PDF. Mantener los archivos fuera de directorios públicos.
- Las claves de IA permanecen en el backend; no deben incorporarse a variables `VITE_*`.
- La IA entrega apoyo orientativo. La revisión humana es obligatoria como criterio de uso.
- Usar exclusivamente CV ficticios. No publicar archivos de usuarios, credenciales, tokens ni información personal.

## Pruebas

### Frontend

```powershell
npm run test:run
npm run coverage
start .\coverage\index.html
npm run lint
npm run build
```

| Archivo | Qué comprueba |
|---|---|
| `src/auth.test.js` | Lógica de autenticación auxiliar |
| `src/logica.test.js` | Validaciones, filtros e indicadores |
| `src/apiClient.test.js` | Cliente HTTP |
| `src/presencia.test.js` | Presencia auxiliar |
| `src/App.test.jsx` | Login, navegación, candidatos y administración |

### Backend

```powershell
cd aquachile-backend
mvn clean verify
start .\target\site\jacoco\index.html
```

## Estructura del proyecto

```text
Proyecto-AquaChile/
├── src/
│   ├── components/          Paneles, tablas, gráficos y navegación
│   ├── pages/               Portal, acceso, dashboard y evaluación CV
│   ├── assets/              Imágenes y fondos
│   ├── apiClient.js         Cliente REST y sesión JWT
│   ├── solicitudesAccesoApi.js
│   ├── logica.js            Validaciones, filtros e indicadores
│   ├── auth.js              Lógica auxiliar y compatibilidad previa
│   ├── App.jsx              Rutas y estructura general
│   └── *.test.*             Pruebas frontend
├── aquachile-backend/
│   ├── src/main/java/cl/aquachile/backend/
│   │   ├── auth/            Autenticación
│   │   ├── usuario/         Usuarios
│   │   ├── oferta/          Ofertas
│   │   ├── postulante/      Candidatos
│   │   ├── postulacion/     Postulaciones
│   │   ├── solicitud/       Evaluaciones
│   │   ├── solicitudacceso/ Solicitudes de cuenta
│   │   ├── archivo/         CV y adjuntos
│   │   ├── ia/              Integración IA
│   │   ├── dashboard/       Indicadores
│   │   └── common/          Configuración y utilidades
│   ├── src/main/resources/  Configuración
│   ├── src/test/            Pruebas backend
│   ├── Dockerfile           Construcción del backend para Render
│   ├── .dockerignore        Exclusiones del contenedor
│   └── pom.xml
├── docs/                    Entregables académicos
├── package.json
├── vite.config.js
├── vercel.json              Rutas SPA para Vercel
├── .vercelignore            Exclusiones del despliegue frontend
└── README.md
```

## Documentación

| Documento | Descripción |
|---|---|
| [Manual de usuario](docs/Manual_de_Usuario.pdf) | Guía de operación y capturas. |
| [Documento técnico](docs/Documento_Tecnico.pdf) | Arquitectura, integración y seguridad. |
| [Informe de pruebas](docs/Informe_de_Pruebas.pdf) | Cobertura, resultados y reproducción. |

---

**Duoc UC · Desarrollo Fullstack II · Evaluación Parcial 3 · 2026**
