// Capa de datos del prototipo: usuarios, permisos, solicitudes de acceso y correos simulados.
// Todo se guarda en localStorage (no hay servidor). Una página abierta en otra pestaña
// se entera de los cambios con el evento "storage"; en la misma pestaña se usa AVISO_CAMBIO.

const CLAVE_USUARIOS = "vcm-usuarios-v2";
const CLAVE_SOLICITUDES_ACCESO = "vcm-solicitudes-acceso-v2";
const CLAVE_PRESENCIA = "vcm-presencia";
const CLAVE_NOTIFICACIONES = "vcm-notificaciones-v2";

export const AVISO_CAMBIO = "vcm-datos-cambiaron";

export const ESTADOS_ACCESO = ["Pendiente", "Aceptada", "Rechazada"];
export const ROLES = ["Administrador", "Usuario"];

// Secciones del sistema que se pueden permitir o quitar a cada usuario.
export const PERMISOS = [
  { id: "indicadores", texto: "Indicadores" },
  { id: "candidatos", texto: "Candidatos" },
  { id: "solicitudes", texto: "Solicitudes de evaluación" },
];

const TODOS_LOS_PERMISOS = Object.fromEntries(PERMISOS.map((p) => [p.id, true]));

// Usuarios que ya existen al abrir el sistema. Los tres primeros son cuentas internas; los otros dos
// son personas cuya solicitud de acceso ya fue aceptada (sus datos se ven en "Estado de solicitud").
const USUARIOS_INICIALES = [
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

const NOTIFICACIONES_INICIALES = SOLICITUDES_ACCESO_DEMO.filter((s) => s.estado === "Pendiente").map((s) => ({
  id: `demo-${s.id}`,
  tipo: "solicitud",
  usuario: s.usuario,
  texto: `${nombreCompleto(s)} envió una solicitud de acceso.`,
  fecha: s.fecha,
}));

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento disponible: el prototipo sigue funcionando en memoria.
  }
}

function avisarCambio() {
  window.dispatchEvent(new Event(AVISO_CAMBIO));
}

function leerObjeto(clave) {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave));
    if (guardado && typeof guardado === "object" && !Array.isArray(guardado)) {
      return guardado;
    }
  } catch {
    // Dato dañado: se parte de cero.
  }
  return {};
}

function leerLista(clave, inicial) {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave));
    if (Array.isArray(guardado)) {
      return guardado;
    }
  } catch {
    // Dato dañado: se reemplaza por el inicial.
  }
  guardar(clave, inicial);
  return inicial;
}

function textoAleatorio(largo) {
  // Sin 0/O ni 1/I/L para que el código sea fácil de leer y escribir.
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(largo);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

// Nombre y apellido juntos (las solicitudes antiguas pueden no tener apellido).
export function nombreCompleto(persona) {
  return `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.trim();
}

function normalizar(texto) {
  return (texto ?? "").trim().toLowerCase();
}

// ---------- Usuarios y permisos ----------

export function permisosDe(usuario) {
  if (usuario?.rol === "Administrador") {
    return { ...TODOS_LOS_PERMISOS };
  }
  // Un usuario sin permisos guardados conserva el acceso que tenía antes.
  return { ...TODOS_LOS_PERMISOS, ...(usuario?.permisos ?? {}) };
}

export function obtenerUsuarios() {
  return leerLista(CLAVE_USUARIOS, USUARIOS_INICIALES);
}

export function iniciarSesion(usuario, clave) {
  const nombre = normalizar(usuario);
  const encontrado = obtenerUsuarios().find(
    (u) => u.usuario.toLowerCase() === nombre && u.clave === clave,
  );
  return encontrado
    ? { usuario: encontrado.usuario, rol: encontrado.rol, permisos: permisosDe(encontrado) }
    : null;
}

// Solo cambia rol y permisos. Nunca se deja el sistema sin administradores.
export function actualizarUsuario(nombreUsuario, { rol, permisos }) {
  const usuarios = obtenerUsuarios();
  const actual = usuarios.find((u) => u.usuario === nombreUsuario);
  if (!actual) {
    return { ok: false, error: "El usuario no existe." };
  }
  if (!ROLES.includes(rol)) {
    return { ok: false, error: "Rol no válido." };
  }
  const quedanAdmins = usuarios.some((u) => u.usuario !== nombreUsuario && u.rol === "Administrador");
  if (actual.rol === "Administrador" && rol !== "Administrador" && !quedanAdmins) {
    return { ok: false, error: "Debe existir al menos un administrador." };
  }
  const limpios = Object.fromEntries(PERMISOS.map((p) => [p.id, Boolean(permisos?.[p.id])]));
  const actualizados = usuarios.map((u) =>
    u.usuario === nombreUsuario ? { ...u, rol, permisos: limpios } : u,
  );
  guardar(CLAVE_USUARIOS, actualizados);
  registrarNotificacion("permisos", nombreUsuario, `Se actualizaron el rol y los permisos de ${nombreUsuario}.`);
  avisarCambio();
  return { ok: true, usuarios: actualizados };
}

// Datos personales de quien inició sesión. Correo, teléfono y RUT son obligatorios.
export function actualizarPerfil(nombreUsuario, { nombre, correo, telefono, rut, foto, banner }) {
  const usuarios = obtenerUsuarios();
  if (!usuarios.some((u) => u.usuario === nombreUsuario)) {
    return { ok: false, error: "El usuario no existe." };
  }
  const actualizados = usuarios.map((u) =>
    u.usuario === nombreUsuario
      ? {
          ...u,
          nombre: nombre.trim(),
          correo: correo.trim(),
          telefono: telefono.trim(),
          rut: rut.trim(),
          foto: foto ?? "",
          banner: banner ?? "",
        }
      : u,
  );
  guardar(CLAVE_USUARIOS, actualizados);
  registrarNotificacion("perfil", nombreUsuario, `${nombreUsuario} actualizó su perfil.`);
  avisarCambio();
  return { ok: true };
}

// ---------- Solicitudes de acceso ----------

export function leerSolicitudesAcceso() {
  return leerLista(CLAVE_SOLICITUDES_ACCESO, SOLICITUDES_ACCESO_DEMO);
}

export function tieneSolicitudPendiente(usuario) {
  const nombre = normalizar(usuario);
  return leerSolicitudesAcceso().some(
    (s) => s.estado === "Pendiente" && s.usuario.toLowerCase() === nombre,
  );
}

export function crearSolicitudAcceso({ nombre, apellido, rut, telefono, correo, usuario, motivo }) {
  const solicitudes = leerSolicitudesAcceso();
  const nombreUsuario = usuario.trim();
  const correoLimpio = correo.trim();

  if (
    obtenerUsuarios().some((u) => u.usuario.toLowerCase() === nombreUsuario.toLowerCase()) ||
    solicitudes.some(
      (s) => s.estado !== "Rechazada" && s.usuario.toLowerCase() === nombreUsuario.toLowerCase(),
    )
  ) {
    return { ok: false, error: "Ese nombre de usuario ya está en uso. Elige otro." };
  }
  if (
    solicitudes.some((s) => s.estado === "Pendiente" && normalizar(s.correo) === normalizar(correoLimpio))
  ) {
    return { ok: false, error: "Ya tienes una solicitud pendiente con ese correo." };
  }

  const nueva = {
    id: solicitudes.length ? Math.max(...solicitudes.map((s) => s.id)) + 1 : 1,
    nombre: nombre.trim(),
    apellido: (apellido ?? "").trim(),
    rut: (rut ?? "").trim(),
    telefono: (telefono ?? "").trim(),
    correo: correoLimpio,
    usuario: nombreUsuario,
    motivo: motivo.trim(),
    codigo: textoAleatorio(6),
    fecha: new Date().toISOString(),
    estado: "Pendiente",
    comentarios: [],
    credenciales: null,
  };
  guardar(CLAVE_SOLICITUDES_ACCESO, [...solicitudes, nueva]);
  registrarNotificacion("solicitud", nueva.usuario, `${nombreCompleto(nueva)} envió una solicitud de acceso.`);
  avisarCambio();
  return { ok: true, solicitud: nueva };
}

// Solicitudes de ejemplo con su correo y código, para mostrar cómo funciona "Estado de solicitud".
export function ejemplosConsulta() {
  return leerSolicitudesAcceso()
    .filter((s) => s.demo)
    .map((s) => ({ id: s.id, nombre: nombreCompleto(s), correo: s.correo, codigo: s.codigo, estado: s.estado }));
}

// Devuelve la solicitud solo si el correo y el código coinciden.
export function consultarSolicitud(correo, codigo) {
  const correoBuscado = normalizar(correo);
  const codigoBuscado = (codigo ?? "").trim().toUpperCase();
  if (!correoBuscado || !codigoBuscado) {
    return null;
  }
  return (
    leerSolicitudesAcceso().find(
      (s) => normalizar(s.correo) === correoBuscado && s.codigo.toUpperCase() === codigoBuscado,
    ) ?? null
  );
}

// Quita la cuenta creada por una solicitud que deja de estar aceptada.
function usuariosSinCuentaDe(solicitud) {
  return obtenerUsuarios().filter((u) => u.solicitudId !== solicitud.id);
}

export function cambiarEstadoAcceso(id, nuevoEstado, autor = "Administrador") {
  const solicitudes = leerSolicitudesAcceso();
  const solicitud = solicitudes.find((s) => s.id === id);
  if (!solicitud) {
    return { ok: false, error: "La solicitud no existe." };
  }
  if (!ESTADOS_ACCESO.includes(nuevoEstado)) {
    return { ok: false, error: "Estado no válido." };
  }
  if (solicitud.estado === nuevoEstado) {
    return { ok: true, solicitudes };
  }

  let credenciales = solicitud.credenciales;

  if (nuevoEstado === "Aceptada") {
    const ocupado = obtenerUsuarios().some(
      (u) => u.usuario.toLowerCase() === solicitud.usuario.toLowerCase(),
    );
    if (ocupado) {
      return { ok: false, error: `El usuario ${solicitud.usuario} ya existe en el sistema.` };
    }
    const clave = textoAleatorio(8);
    credenciales = { usuario: solicitud.usuario, clave };
    guardar(CLAVE_USUARIOS, [
      ...obtenerUsuarios(),
      {
        usuario: solicitud.usuario,
        clave,
        rol: "Usuario",
        permisos: { ...TODOS_LOS_PERMISOS },
        nombre: nombreCompleto(solicitud),
        correo: solicitud.correo,
        telefono: solicitud.telefono ?? "",
        rut: solicitud.rut ?? "",
        solicitudId: solicitud.id,
        creado: new Date().toISOString(),
      },
    ]);
  } else if (solicitud.estado === "Aceptada") {
    guardar(CLAVE_USUARIOS, usuariosSinCuentaDe(solicitud));
    credenciales = null;
  }

  const actualizadas = solicitudes.map((s) =>
    s.id === id
      ? {
          ...s,
          estado: nuevoEstado,
          credenciales,
          comentarios: [
            ...s.comentarios,
            { autor, texto: `Estado cambiado a ${nuevoEstado}.`, fecha: new Date().toISOString(), sistema: true },
          ],
        }
      : s,
  );
  guardar(CLAVE_SOLICITUDES_ACCESO, actualizadas);
  registrarNotificacion("solicitud", solicitud.usuario, `La solicitud de ${nombreCompleto(solicitud)} pasó a ${nuevoEstado}.`);
  avisarCambio();
  return { ok: true, solicitudes: actualizadas };
}

export function agregarComentarioAcceso(id, texto, autor = "Administrador") {
  const limpio = texto.trim();
  if (!limpio) {
    return { ok: false, error: "Escribe un comentario." };
  }
  const solicitudes = leerSolicitudesAcceso();
  if (!solicitudes.some((s) => s.id === id)) {
    return { ok: false, error: "La solicitud no existe." };
  }
  const actualizadas = solicitudes.map((s) =>
    s.id === id
      ? { ...s, comentarios: [...s.comentarios, { autor, texto: limpio, fecha: new Date().toISOString() }] }
      : s,
  );
  guardar(CLAVE_SOLICITUDES_ACCESO, actualizadas);
  avisarCambio();
  return { ok: true, solicitudes: actualizadas };
}

// ---------- Conexión de los usuarios ----------
// Cada pestaña con sesión iniciada manda un "latido" cada pocos segundos y avisa cuando la persona
// usa el sistema (clic, teclado, mouse). Con eso se calcula el estado de cada usuario:
//   Conectado    -> la pestaña sigue abierta y hubo actividad hace poco.
//   Inactivo     -> la pestaña sigue abierta, pero no hay actividad hace varios minutos.
//   Desconectado -> cerró sesión, cerró la pestaña o dejó de mandar latidos.

export const ESTADOS_CONEXION = ["Conectado", "Inactivo", "Desconectado"];
export const MINUTOS_INACTIVO = 5;
const MS_SIN_LATIDO = 3 * 60 * 1000;

function leerPresencia() {
  return leerObjeto(CLAVE_PRESENCIA);
}

function guardarPresencia(usuario, cambios) {
  const todos = leerPresencia();
  guardar(CLAVE_PRESENCIA, { ...todos, [usuario]: { ...todos[usuario], ...cambios } });
}

export function marcarConexion(usuario) {
  const ahora = new Date().toISOString();
  guardarPresencia(usuario, { conectado: true, latido: ahora, actividad: ahora });
  registrarNotificacion("sesion", usuario, `${usuario} inició sesión.`);
  avisarCambio();
}

// Latido: la pestaña sigue abierta. Con huboActividad también se renueva la última actividad.
export function registrarLatido(usuario, huboActividad = false) {
  const ahora = new Date().toISOString();
  guardarPresencia(usuario, huboActividad ? { conectado: true, latido: ahora, actividad: ahora } : { conectado: true, latido: ahora });
}

export function marcarDesconexion(usuario, avisar = true) {
  guardarPresencia(usuario, { conectado: false });
  if (avisar) {
    registrarNotificacion("sesion", usuario, `${usuario} cerró sesión.`);
  }
  avisarCambio();
}

export function estadoConexion(registro, ahora = Date.now()) {
  if (!registro?.conectado || ahora - new Date(registro.latido).getTime() > MS_SIN_LATIDO) {
    return "Desconectado";
  }
  return ahora - new Date(registro.actividad).getTime() > MINUTOS_INACTIVO * 60 * 1000
    ? "Inactivo"
    : "Conectado";
}

// Lista de todos los usuarios con su estado y su última actividad.
export function obtenerConexiones(ahora = Date.now()) {
  const presencia = leerPresencia();
  return obtenerUsuarios().map((u) => ({
    usuario: u.usuario,
    nombre: u.nombre ?? "",
    rol: u.rol,
    estado: estadoConexion(presencia[u.usuario], ahora),
    ultimaActividad: presencia[u.usuario]?.actividad ?? null,
  }));
}

// ---------- Notificaciones ----------
// Registro de lo que pasa en el sistema. Cuando exista el chat, sus mensajes se pueden guardar
// aquí con tipo "mensaje" y aparecerán en el panel de notificaciones.

export function registrarNotificacion(tipo, usuario, texto) {
  const lista = leerLista(CLAVE_NOTIFICACIONES, NOTIFICACIONES_INICIALES);
  const nueva = { id: `${Date.now()}-${textoAleatorio(4)}`, tipo, usuario, texto, fecha: new Date().toISOString() };
  guardar(CLAVE_NOTIFICACIONES, [nueva, ...lista].slice(0, 50));
}

export function leerNotificaciones() {
  return [...leerLista(CLAVE_NOTIFICACIONES, NOTIFICACIONES_INICIALES)].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha),
  );
}
