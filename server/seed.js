// Datos iniciales del sistema (se usan solo la primera vez, cuando todavía no existe el archivo de datos).
// Las contraseñas de las cuentas de ejemplo se guardan con hash.

import { hashClave } from "./seguridad.js";
import { PERMISOS } from "./dominio.js";

const TODOS_LOS_PERMISOS = Object.fromEntries(PERMISOS.map((p) => [p.id, true]));

// Usuarios de demostración existentes al abrir el sistema.
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
    creado: "2026-10-29T16:05:00.000Z",
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

const OFERTAS_INICIALES = [
  {
    id: 1,
    titulo: "Operador/a de Centro de Cultivo",
    area: "Operaciones",
    ubicacion: "Región de Los Lagos",
    modalidad: "Presencial",
    jornada: "Turnos rotativos",
    descripcion: "Apoya las labores diarias del centro de cultivo, velando por el cumplimiento de los procedimientos operacionales y de seguridad.",
    requisitos: "Enseñanza media completa. Se valorará experiencia en centros de cultivo o labores productivas.",
    fechaCierre: "",
    estado: "Publicada",
    esDemo: true,
    creada: "2026-11-01T12:00:00.000Z",
  },
  {
    id: 2,
    titulo: "Técnico/a de Mantención",
    area: "Mantención",
    ubicacion: "Puerto Montt, Los Lagos",
    modalidad: "Presencial",
    jornada: "Jornada completa",
    descripcion: "Realiza mantenimiento preventivo y correctivo de equipos, registra intervenciones y coordina prioridades con el equipo de operaciones.",
    requisitos: "Formación técnica en electricidad, mecánica o área afín. Experiencia en mantenimiento industrial deseable.",
    fechaCierre: "",
    estado: "Publicada",
    esDemo: true,
    creada: "2026-11-01T12:00:00.000Z",
  },
  {
    id: 3,
    titulo: "Analista de Personas",
    area: "Personas",
    ubicacion: "Puerto Montt, Los Lagos",
    modalidad: "Híbrida",
    jornada: "Jornada completa",
    descripcion: "Colabora en procesos de selección, análisis de información y coordinación de iniciativas para los equipos de la compañía.",
    requisitos: "Título profesional afín a Recursos Humanos, Psicología o Administración. Manejo de herramientas de oficina.",
    fechaCierre: "",
    estado: "Publicada",
    esDemo: true,
    creada: "2026-11-01T12:00:00.000Z",
  },
];

// El hash de las cuentas de ejemplo se calcula una sola vez por proceso (scrypt es lento a propósito).
let usuariosConHash = null;

// Estado completo de la base de datos la primera vez que arranca el servidor.
export function crearDatosIniciales() {
  usuariosConHash ??= USUARIOS_EJEMPLO.map(({ clave, ...resto }) => ({ ...resto, claveHash: hashClave(clave) }));
  return {
    usuarios: structuredClone(usuariosConHash),
    presencia: {},
    notificaciones: [],
    invitaciones: [],
    candidatos: structuredClone(CANDIDATOS_INICIALES),
    solicitudes: structuredClone(SOLICITUDES_INICIALES),
    ofertas: structuredClone(OFERTAS_INICIALES),
    postulaciones: [],
  };
}
