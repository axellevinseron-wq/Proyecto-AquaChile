// Datos iniciales del sistema (se usan solo la primera vez, cuando todavía no existe el archivo de datos).
// Las contraseñas de las cuentas de ejemplo se guardan con hash; las "credenciales" de una solicitud
// aceptada se conservan en claro porque el solicitante las ve en la página de estado.

import { hashClave } from "./seguridad.js";
import { nombreCompleto, PERMISOS } from "./dominio.js";

const TODOS_LOS_PERMISOS = Object.fromEntries(PERMISOS.map((p) => [p.id, true]));

// Usuarios que ya existen al abrir el sistema. Los tres primeros son cuentas internas; los otros dos
// son personas cuya solicitud de acceso ya fue aceptada (sus datos se ven en "Estado de solicitud").
const USUARIOS_EJEMPLO = [
  { usuario: "admin", clave: "admin123", rol: "Administrador" },
  { usuario: "jefe.rrhh", clave: "rrhh123", rol: "Administrador" },
  { usuario: "psicologo", clave: "psico123", rol: "Usuario" },
  {
    usuario: "cfuentes",
    clave: "K7M3QX9P",
    rol: "Usuario",
    permisos: { ...TODOS_LOS_PERMISOS },
    nombre: "Camila Fuentes",
    correo: "camila.fuentes@example.test",
    telefono: "+56 9 6123 4501",
    rut: "17.234.561-1",
    solicitudId: 1,
    creado: "2026-10-27T14:20:00.000Z",
  },
  {
    usuario: "maraya",
    clave: "T4HW8N2R",
    rol: "Usuario",
    permisos: { ...TODOS_LOS_PERMISOS },
    nombre: "Matías Araya",
    correo: "matias.araya@example.test",
    telefono: "+56 9 7345 8812",
    rut: "18.765.432-7",
    solicitudId: 2,
    creado: "2026-10-29T16:05:00.000Z",
  },
];

// Solicitudes de ejemplo para mostrar el flujo completo: aceptadas (con su cuenta ya creada),
// rechazadas (con el motivo) y pendientes (algunas con comentarios del administrador).
// Para consultarlas en "Estado de solicitud" se usan el correo y el código de cada una.
const SOLICITUDES_ACCESO_DEMO = [
  {
    id: 1,
    nombre: "Camila",
    apellido: "Fuentes",
    rut: "17.234.561-1",
    telefono: "+56 9 6123 4501",
    correo: "camila.fuentes@example.test",
    usuario: "cfuentes",
    motivo: "Soy jefa de turno en la planta y necesito revisar los indicadores.",
    codigo: "CAM482",
    fecha: "2026-10-26T13:40:00.000Z",
    estado: "Aceptada",
    comentarios: [
      { autor: "admin", texto: "Cuenta aprobada. Cambia tu contraseña al ingresar por primera vez.", fecha: "2026-10-27T14:20:00.000Z" },
      { autor: "admin", texto: "Estado cambiado a Aceptada.", fecha: "2026-10-27T14:20:00.000Z", sistema: true },
    ],
    credenciales: { usuario: "cfuentes", clave: "K7M3QX9P" },
    demo: true,
  },
  {
    id: 2,
    nombre: "Matías",
    apellido: "Araya",
    rut: "18.765.432-7",
    telefono: "+56 9 7345 8812",
    correo: "matias.araya@example.test",
    usuario: "maraya",
    motivo: "Soy técnico de mantención y necesito consultar candidatos del área.",
    codigo: "MAT735",
    fecha: "2026-10-28T12:15:00.000Z",
    estado: "Aceptada",
    comentarios: [
      { autor: "admin", texto: "Estado cambiado a Aceptada.", fecha: "2026-10-29T16:05:00.000Z", sistema: true },
    ],
    credenciales: { usuario: "maraya", clave: "T4HW8N2R" },
    demo: true,
  },
  {
    id: 3,
    nombre: "Javiera",
    apellido: "Torres",
    rut: "19.345.678-2",
    telefono: "+56 9 5432 1098",
    correo: "javiera.torres@example.test",
    usuario: "jtorres",
    motivo: "Quiero acceso para consultar datos de otra área.",
    codigo: "JAV296",
    fecha: "2026-10-29T15:50:00.000Z",
    estado: "Rechazada",
    comentarios: [
      { autor: "admin", texto: "Tu cargo no requiere acceso al sistema. Si cambia tu función, envía una nueva solicitud.", fecha: "2026-10-30T10:30:00.000Z" },
      { autor: "admin", texto: "Estado cambiado a Rechazada.", fecha: "2026-10-30T10:31:00.000Z", sistema: true },
    ],
    credenciales: null,
    demo: true,
  },
  {
    id: 4,
    nombre: "Ignacio",
    apellido: "Paredes",
    rut: "16.987.654-1",
    telefono: "+56 9 8890 3345",
    correo: "ignacio.paredes@example.test",
    usuario: "iparedes",
    motivo: "Necesito acceso temporal para una auditoría interna.",
    codigo: "IGN914",
    fecha: "2026-10-30T18:25:00.000Z",
    estado: "Rechazada",
    comentarios: [
      { autor: "admin", texto: "No recibimos el respaldo de tu jefatura. Vuelve a solicitarlo adjuntando su autorización.", fecha: "2026-10-31T09:10:00.000Z" },
      { autor: "admin", texto: "Estado cambiado a Rechazada.", fecha: "2026-10-31T09:11:00.000Z", sistema: true },
    ],
    credenciales: null,
    demo: true,
  },
  {
    id: 5,
    nombre: "Felipe",
    apellido: "Núñez",
    rut: "20.123.456-5",
    telefono: "+56 9 4410 7723",
    correo: "felipe.nunez@example.test",
    usuario: "fnunez",
    motivo: "Apoyo al equipo de selección y necesito registrar evaluaciones.",
    codigo: "FEL358",
    fecha: "2026-11-02T14:00:00.000Z",
    estado: "Pendiente",
    comentarios: [
      { autor: "admin", texto: "Indícanos tu cargo y el nombre de tu jefatura directa para continuar con la revisión.", fecha: "2026-11-03T11:45:00.000Z" },
    ],
    credenciales: null,
    demo: true,
  },
  {
    id: 6,
    nombre: "Constanza",
    apellido: "Vera",
    rut: "15.678.901-1",
    telefono: "+56 9 9021 6654",
    correo: "constanza.vera@example.test",
    usuario: "cvera",
    motivo: "Soy psicóloga laboral y necesito registrar evaluaciones de candidatos.",
    codigo: "CON672",
    fecha: "2026-11-03T12:30:00.000Z",
    estado: "Pendiente",
    comentarios: [],
    credenciales: null,
    demo: true,
  },
  {
    id: 7,
    nombre: "Andrea",
    apellido: "Muñoz",
    rut: "18.234.509-1",
    telefono: "+56 9 3278 4419",
    correo: "andrea.munoz@example.test",
    usuario: "amunoz",
    motivo: "Soy coordinadora de RR.HH. y necesito gestionar las solicitudes de evaluación.",
    codigo: "AND847",
    fecha: "2026-11-03T20:10:00.000Z",
    estado: "Pendiente",
    comentarios: [],
    credenciales: null,
    demo: true,
  },
];

const CANDIDATOS_INICIALES = [
  {
    id: 1,
    nombre: "Daniela Ríos",
    correo: "daniela.rios@example.test",
    cargo: "Analista de Datos",
    familiaCargo: "Datos y Tecnología",
  },
  {
    id: 2,
    nombre: "Matías Fuentes",
    correo: "matias.fuentes@example.test",
    cargo: "Supervisor de Operaciones",
    familiaCargo: "Operaciones",
  },
  {
    id: 3,
    nombre: "Camila Soto",
    correo: "camila.soto@example.test",
    cargo: "Psicóloga Organizacional",
    familiaCargo: "Personas",
  },
  {
    id: 4,
    nombre: "Nicolás Pérez",
    correo: "nicolas.perez@example.test",
    cargo: "Técnico de Mantención",
    familiaCargo: "Mantención",
  },
];

const SOLICITUDES_INICIALES = [
  {
    id: 1,
    candidatoId: 1,
    candidato: "Daniela Ríos",
    cargo: "Analista de Datos",
    familiaCargo: "Datos y Tecnología",
    estado: "Pendiente",
    responsable: "Laura Pérez",
    fechaSolicitud: "2026-10-12",
  },
  {
    id: 2,
    candidatoId: 2,
    candidato: "Matías Fuentes",
    cargo: "Supervisor de Operaciones",
    familiaCargo: "Operaciones",
    estado: "En proceso",
    responsable: "Carlos Díaz",
    fechaSolicitud: "2026-10-10",
  },
  {
    id: 3,
    candidatoId: 3,
    candidato: "Camila Soto",
    cargo: "Psicóloga Organizacional",
    familiaCargo: "Personas",
    estado: "Finalizada",
    responsable: "Laura Pérez",
    fechaSolicitud: "2026-10-08",
  },
];

// El hash de las cuentas de ejemplo se calcula una sola vez por proceso (scrypt es lento a propósito).
let usuariosConHash = null;

// Estado completo de la base de datos la primera vez que arranca el servidor.
export function crearDatosIniciales() {
  usuariosConHash ??= USUARIOS_EJEMPLO.map(({ clave, ...resto }) => ({ ...resto, claveHash: hashClave(clave) }));
  const pendientes = SOLICITUDES_ACCESO_DEMO.filter((s) => s.estado === "Pendiente");
  return {
    usuarios: structuredClone(usuariosConHash),
    solicitudesAcceso: structuredClone(SOLICITUDES_ACCESO_DEMO),
    presencia: {},
    notificaciones: pendientes.map((s) => ({
      id: `demo-${s.id}`,
      tipo: "solicitud",
      usuario: s.usuario,
      texto: `${nombreCompleto(s)} envió una solicitud de acceso.`,
      fecha: s.fecha,
    })),
    candidatos: structuredClone(CANDIDATOS_INICIALES),
    solicitudes: structuredClone(SOLICITUDES_INICIALES),
  };
}
