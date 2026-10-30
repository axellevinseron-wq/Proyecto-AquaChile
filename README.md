
# Proyecto AquaChile

Avance funcional (Evaluación Parcial 2) del proyecto de Vinculación con el Medio desarrollado junto a **AquaChile**: una aplicación web para gestionar **evaluaciones psicolaborales**.

> Esta etapa es solo frontend. No hay backend ni base de datos: los datos son **ficticios** y se guardan en el navegador (`localStorage`).

## Problemática

El proceso de evaluaciones psicolaborales necesita un lugar único para:

- registrar a los candidatos,
- crear solicitudes de evaluación para cada candidato,
- seguir el avance de cada solicitud (Pendiente → En proceso → Finalizada),
- ver indicadores del proceso para tomar decisiones.

La aplicación resuelve ese flujo completo con datos simulados.

## Funcionalidades

| Módulo | Qué permite |
|---|---|
| **Login y registro** | Iniciar sesión, "recordarme" y pedir una cuenta nueva. Los administradores aprueban o cancelan las solicitudes de cuenta. |
| **Inicio** | Tarjetas con indicadores, calendario de solicitudes y estadística del día elegido. |
| **Indicadores** | Gráficos por estado, por día del mes y últimas solicitudes. |
| **Candidatos** | Tabla con búsqueda y filtro por estado, resumen del mes y formulario para agregar candidatos (valida campos, formato de correo y correo repetido). |
| **Solicitudes** | Búsqueda, filtro por estado, formulario de nueva solicitud con validaciones y cambio de estado desde la tabla. |
| **Opciones** | Modo oscuro, tamaño de letra, tamaño del sistema y fondos de pantalla. |

## Contenidos del curso aplicados

- **React** con Vite.
- **Bootstrap 5** y diseño responsivo (grilla, tarjetas, tablas, menú lateral que se adapta a móvil).
- **Componentes reutilizables, props, arreglos y `.map()`** (`IndicadorCard`, `BarrasEstado`, `Calendario`, tablas, etc.).
- **`useState`** para el estado, además de `useMemo` y `useEffect`.
- **Eventos, filtros y renderizado condicional** (búsqueda, filtro por estado, formularios que se abren y cierran).
- **Formularios con validaciones** (login, registro, candidatos y solicitudes).
- **React Router** para la navegación entre pantallas.
- **Vitest** y Testing Library para las pruebas unitarias.

## Tecnologías

React 19 · Vite · Bootstrap 5 · React Router · Vitest · Testing Library · ESLint

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```
```bash
npm install react-router-dom
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @vitest/coverage-v8
```

La app queda en `http://localhost:5173`.

### Usuarios de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `jefe.rrhh` | `rrhh123` | Administrador |
| `psicologo` | `psico123` | Usuario |

Solo los administradores ven el panel "Solicitudes de cuentas" dentro de Solicitudes.

## Rutas

| Ruta | Pantalla |
|---|---|
| `/inicio` | Inicio |
| `/indicadores` | Indicadores |
| `/candidatos` | Candidatos |
| `/solicitudes` | Solicitudes |
| `/opciones` | Opciones |

Cualquier ruta que no exista redirige a `/inicio`. Sin sesión iniciada siempre se muestra el login.

## Pruebas con Vitest

```bash
npm run test:run   # ejecuta todas las pruebas una vez
npm test           # modo observador
npm run coverage   # informe de cobertura
```

| Archivo | Qué comprueba |
|---|---|
| `src/logica.test.js` | Filtros y búsqueda, validación de formularios, correo repetido, cambio de estado e indicadores |
| `src/App.test.jsx` | Login, navegación con React Router, ruta inexistente, formulario de candidatos y búsqueda |

La lógica de filtros, validaciones e indicadores está en `src/logica.js`, separada de los componentes para poder probarla fácilmente.

## Estructura del proyecto

```
src/
├── components/     Componentes reutilizables (paneles, tarjetas, gráficos, menú)
├── pages/          LoginPage y DashboardPage
├── assets/         Imágenes y fondos
├── logica.js       Funciones puras: filtros, validaciones, indicadores
├── auth.js         Usuarios y solicitudes de cuenta simulados
├── opciones.js     Preferencias de apariencia
├── useAlmacenLocal.js  Hook para guardar listas en localStorage
├── App.jsx         Rutas y estructura general
└── main.jsx        Punto de entrada
```

## Integrantes

- Nicolas Oyarzo
- Matias Mansilla
- Axel Levin