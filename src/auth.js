// Capa de datos del sistema en el navegador. La información vive en el servidor Express (carpeta server/):
// aquí se hacen las peticiones y se guarda una copia local (caché) para que las pantallas puedan leerla
// de forma directa. La copia se actualiza al iniciar sesión, después de cada cambio y cada pocos segundos
// (ver useSincronizacion). Cuando la copia cambia se avisa con AVISO_CAMBIO.

import { fijarToken, pedir } from "./api";

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

function copiaVacia() {
  return { usuarios: [], conexiones: [], notificaciones: [], solicitudesAcceso: [] };
}

let copia = copiaVacia();
let ultimaHuella = "";

function avisarCambio() {
  window.dispatchEvent(new Event(AVISO_CAMBIO));
}

// Borra la sesión y los datos guardados en memoria (al cerrar sesión o si la sesión venció).
export function reiniciarDatos() {
  fijarToken(null);
  copia = copiaVacia();
  ultimaHuella = "";
}

// Nombre y apellido juntos (las solicitudes antiguas pueden no tener apellido).
export function nombreCompleto(persona) {
  return `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.trim();
}

function mensajeDe(respuesta) {
  return respuesta.datos?.error ?? "No se pudo completar la acción.";
}

// Pide al servidor lo que el usuario puede ver y actualiza la copia local.
export async function refrescarDatos() {
  const respuesta = await pedir("GET", "/sincronizacion");
  if (!respuesta.ok) {
    return false;
  }
  const huella = JSON.stringify(respuesta.datos);
  if (huella !== ultimaHuella) {
    ultimaHuella = huella;
    copia = { ...copiaVacia(), ...respuesta.datos };
    avisarCambio();
  }
  return true;
}

// Hace un cambio en el servidor y, si salió bien, actualiza la copia local.
async function modificar(metodo, ruta, cuerpo) {
  const respuesta = await pedir(metodo, ruta, cuerpo);
  if (!respuesta.ok) {
    return { ok: false, error: mensajeDe(respuesta) };
  }
  await refrescarDatos();
  return { ok: true };
}

// ---------- Sesión ----------

// Devuelve { ok: true, sesion } o { ok: false, error, pendiente }.
// "pendiente" indica que ese usuario tiene una solicitud de cuenta esperando aprobación.
export async function iniciarSesion(usuario, clave) {
  const respuesta = await pedir("POST", "/sesion", { usuario, clave });
  if (!respuesta.ok) {
    return { ok: false, error: mensajeDe(respuesta), pendiente: respuesta.datos?.pendiente === true };
  }
  fijarToken(respuesta.datos.token);
  await refrescarDatos();
  return { ok: true, sesion: respuesta.datos.sesion };
}

// Avisa al servidor y borra los datos locales sin esperar la respuesta.
export function cerrarSesion() {
  const respuesta = pedir("DELETE", "/sesion"); // el token se lee antes de borrarlo
  reiniciarDatos();
  avisarCambio();
  return respuesta;
}

// ---------- Usuarios y permisos ----------

export function permisosDe(usuario) {
  if (usuario?.rol === "Administrador") {
    return { ...TODOS_LOS_PERMISOS };
  }
  // Un usuario sin permisos guardados conserva el acceso que tenía antes.
  return { ...TODOS_LOS_PERMISOS, ...(usuario?.permisos ?? {}) };
}

// Un administrador recibe todos los usuarios; el resto de las personas solo recibe su propio registro.
export function obtenerUsuarios() {
  return copia.usuarios;
}

// Solo cambia rol y permisos (solo administradores). El servidor evita quedarse sin administradores.
export function actualizarUsuario(nombreUsuario, { rol, permisos }) {
  return modificar("PATCH", `/usuarios/${encodeURIComponent(nombreUsuario)}`, { rol, permisos });
}

// Datos personales de quien inició sesión.
export function actualizarPerfil(nombreUsuario, { nombre, correo, telefono, rut, foto, banner }) {
  return modificar("PATCH", `/usuarios/${encodeURIComponent(nombreUsuario)}/perfil`, {
    nombre,
    correo,
    telefono,
    rut,
    foto,
    banner,
  });
}

// ---------- Solicitudes de acceso ----------

// Solo los administradores reciben la lista completa.
export function leerSolicitudesAcceso() {
  return copia.solicitudesAcceso;
}

// Pública (no necesita sesión). Devuelve { ok: true, solicitud } o { ok: false, error }.
export async function crearSolicitudAcceso(datos) {
  const respuesta = await pedir("POST", "/accesos", datos);
  return respuesta.ok
    ? { ok: true, solicitud: respuesta.datos.solicitud }
    : { ok: false, error: mensajeDe(respuesta) };
}

// Solicitudes de ejemplo con su correo y código, para mostrar cómo funciona "Estado de solicitud".
export async function ejemplosConsulta() {
  const respuesta = await pedir("GET", "/accesos/ejemplos");
  return respuesta.ok ? respuesta.datos.ejemplos : [];
}

// Devuelve la solicitud solo si el correo y el código coinciden; si no, null.
export async function consultarSolicitud(correo, codigo) {
  if (!(correo ?? "").trim() || !(codigo ?? "").trim()) {
    return null;
  }
  const respuesta = await pedir("POST", "/accesos/consulta", { correo, codigo });
  return respuesta.ok ? respuesta.datos.solicitud : null;
}

// El autor del cambio lo toma el servidor de la sesión: no se envía desde aquí.
export function cambiarEstadoAcceso(id, nuevoEstado) {
  return modificar("POST", `/accesos/${id}/estado`, { estado: nuevoEstado });
}

export function agregarComentarioAcceso(id, texto) {
  return modificar("POST", `/accesos/${id}/comentarios`, { texto });
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

// Latido: la pestaña sigue abierta. Con huboActividad también se renueva la última actividad.
export function registrarLatido(huboActividad = false) {
  return pedir("POST", "/presencia/latido", { actividad: huboActividad });
}

// Se usa al cerrar la pestaña: keepalive permite que la petición termine aunque la página ya se cerró.
export function avisarDesconexion() {
  return pedir("POST", "/presencia/desconexion", undefined, { keepalive: true });
}

export function estadoConexion(registro, ahora = Date.now()) {
  if (!registro?.conectado || ahora - new Date(registro.latido).getTime() > MS_SIN_LATIDO) {
    return "Desconectado";
  }
  return ahora - new Date(registro.actividad).getTime() > MINUTOS_INACTIVO * 60 * 1000
    ? "Inactivo"
    : "Conectado";
}

// Lista de todos los usuarios con su estado y su última actividad (solo la reciben los administradores).
export function obtenerConexiones(ahora = Date.now()) {
  return copia.conexiones.map((c) => ({
    usuario: c.usuario,
    nombre: c.nombre ?? "",
    rol: c.rol,
    estado: estadoConexion(c, ahora),
    ultimaActividad: c.actividad ?? null,
  }));
}

// ---------- Notificaciones ----------
// Registro de lo que pasa en el sistema (las crea el servidor). Cuando exista el chat, sus mensajes
// se pueden guardar allí con tipo "mensaje" y aparecerán en el panel de notificaciones.

export function leerNotificaciones() {
  return copia.notificaciones;
}
