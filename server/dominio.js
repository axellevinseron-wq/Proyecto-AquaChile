// Reglas del sistema (antes vivían en src/auth.js y funcionaban sobre localStorage).
// Son funciones simples que reciben el objeto de datos, lo modifican y devuelven { ok, ... }.
// Quien las llama (las rutas de Express) decide cuándo guardar en disco.

import { correoValido, rutValido, telefonoValido } from "../src/logica.js";
import { claveCoincide, hashClave, textoAleatorio } from "./seguridad.js";

export const ESTADOS_ACCESO = ["Pendiente", "Aceptada", "Rechazada"];
export const ROLES = ["Administrador", "Usuario"];

// Secciones del sistema que se pueden permitir o quitar a cada usuario.
export const PERMISOS = [
  { id: "indicadores", texto: "Indicadores" },
  { id: "candidatos", texto: "Candidatos" },
  { id: "solicitudes", texto: "Solicitudes de evaluación" },
];

const TODOS_LOS_PERMISOS = Object.fromEntries(PERMISOS.map((p) => [p.id, true]));

// Listas que el sistema guarda, y el permiso que hace falta para modificarlas.
export const COLECCIONES = { candidatos: "candidatos", solicitudes: "solicitudes" };

const MAX_IMAGEN = 1_500_000; // caracteres de la imagen en base64
const MAX_COLECCION = 5000;
const MAX_NOTIFICACIONES = 50;

// ---------- Utilidades ----------

export function nombreCompleto(persona) {
  return `${persona?.nombre ?? ""} ${persona?.apellido ?? ""}`.trim();
}

function normalizar(texto) {
  return (texto ?? "").toString().trim().toLowerCase();
}

function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

function error(mensaje, status = 400) {
  return { ok: false, error: mensaje, status };
}

// ---------- Usuarios y permisos ----------

export function permisosDe(usuario) {
  if (usuario?.rol === "Administrador") {
    return { ...TODOS_LOS_PERMISOS };
  }
  // Un usuario sin permisos guardados conserva el acceso que tenía antes.
  return { ...TODOS_LOS_PERMISOS, ...(usuario?.permisos ?? {}) };
}

// Lo que se le envía al navegador: nunca el hash de la contraseña.
export function usuarioPublico(usuario) {
  const { claveHash, ...resto } = usuario; // eslint-disable-line no-unused-vars
  return { ...resto, permisos: permisosDe(usuario) };
}

export function sesionDe(usuario) {
  return { usuario: usuario.usuario, rol: usuario.rol, permisos: permisosDe(usuario) };
}

export function buscarUsuario(datos, nombre) {
  const buscado = normalizar(nombre);
  return datos.usuarios.find((u) => u.usuario.toLowerCase() === buscado) ?? null;
}

export function iniciarSesion(datos, usuario, clave) {
  const encontrado = buscarUsuario(datos, usuario);
  return encontrado && claveCoincide(clave, encontrado.claveHash) ? encontrado : null;
}

// Solo cambia rol y permisos. Nunca se deja el sistema sin administradores.
export function actualizarUsuario(datos, nombreUsuario, { rol, permisos }) {
  const actual = datos.usuarios.find((u) => u.usuario === nombreUsuario);
  if (!actual) {
    return error("El usuario no existe.", 404);
  }
  if (!ROLES.includes(rol)) {
    return error("Rol no válido.");
  }
  const quedanAdmins = datos.usuarios.some((u) => u.usuario !== nombreUsuario && u.rol === "Administrador");
  if (actual.rol === "Administrador" && rol !== "Administrador" && !quedanAdmins) {
    return error("Debe existir al menos un administrador.", 409);
  }
  actual.rol = rol;
  actual.permisos = Object.fromEntries(PERMISOS.map((p) => [p.id, Boolean(permisos?.[p.id])]));
  registrarNotificacion(datos, "permisos", nombreUsuario, `Se actualizaron el rol y los permisos de ${nombreUsuario}.`);
  return { ok: true };
}

function imagenValida(valor) {
  return valor === "" || (typeof valor === "string" && valor.startsWith("data:image/") && valor.length <= MAX_IMAGEN);
}

// Datos personales. Si el valor viene lleno debe ser válido; los vacíos se permiten
// (las cuentas internas parten sin correo, teléfono ni RUT).
export function actualizarPerfil(datos, nombreUsuario, { nombre, correo, telefono, rut, foto, banner }) {
  const actual = datos.usuarios.find((u) => u.usuario === nombreUsuario);
  if (!actual) {
    return error("El usuario no existe.", 404);
  }
  const limpios = { nombre: texto(nombre), correo: texto(correo), telefono: texto(telefono), rut: texto(rut) };
  if (limpios.correo && !correoValido(limpios.correo)) return error("Correo no válido.");
  if (limpios.telefono && !telefonoValido(limpios.telefono)) return error("Teléfono no válido.");
  if (limpios.rut && !rutValido(limpios.rut)) return error("RUT no válido.");
  if (limpios.nombre.length > 120) return error("El nombre es demasiado largo.");
  if (!imagenValida(foto ?? "") || !imagenValida(banner ?? "")) {
    return error("La imagen no es válida o pesa demasiado.");
  }
  Object.assign(actual, limpios, { foto: foto ?? "", banner: banner ?? "" });
  registrarNotificacion(datos, "perfil", nombreUsuario, `${nombreUsuario} actualizó su perfil.`);
  return { ok: true };
}

// ---------- Solicitudes de acceso ----------

export function tieneSolicitudPendiente(datos, usuario) {
  const nombre = normalizar(usuario);
  return datos.solicitudesAcceso.some((s) => s.estado === "Pendiente" && s.usuario.toLowerCase() === nombre);
}

export function crearSolicitudAcceso(datos, entrada) {
  const campos = {
    nombre: texto(entrada?.nombre),
    apellido: texto(entrada?.apellido),
    rut: texto(entrada?.rut),
    telefono: texto(entrada?.telefono),
    correo: texto(entrada?.correo),
    usuario: texto(entrada?.usuario),
    motivo: texto(entrada?.motivo),
  };

  if (!campos.nombre || !campos.correo || !campos.usuario || !campos.motivo) {
    return error("Completa todos los campos.");
  }
  if (Object.values(campos).some((valor) => valor.length > 1000)) {
    return error("Alguno de los datos es demasiado largo.");
  }
  if (!correoValido(campos.correo)) return error("Ingresa un correo válido.");
  if (campos.rut && !rutValido(campos.rut)) return error("Ingresa un RUT válido, por ejemplo 12.345.678-5.");
  if (campos.telefono && !telefonoValido(campos.telefono)) return error("Ingresa un teléfono válido (8 a 12 dígitos).");
  if (/\s/.test(campos.usuario)) return error("El usuario no puede tener espacios.");

  const minuscula = campos.usuario.toLowerCase();
  if (
    datos.usuarios.some((u) => u.usuario.toLowerCase() === minuscula) ||
    datos.solicitudesAcceso.some((s) => s.estado !== "Rechazada" && s.usuario.toLowerCase() === minuscula)
  ) {
    return error("Ese nombre de usuario ya está en uso. Elige otro.", 409);
  }
  if (datos.solicitudesAcceso.some((s) => s.estado === "Pendiente" && normalizar(s.correo) === normalizar(campos.correo))) {
    return error("Ya tienes una solicitud pendiente con ese correo.", 409);
  }

  const solicitudes = datos.solicitudesAcceso;
  const nueva = {
    id: solicitudes.length ? Math.max(...solicitudes.map((s) => s.id)) + 1 : 1,
    ...campos,
    codigo: textoAleatorio(6),
    fecha: new Date().toISOString(),
    estado: "Pendiente",
    comentarios: [],
    credenciales: null,
  };
  solicitudes.push(nueva);
  registrarNotificacion(datos, "solicitud", nueva.usuario, `${nombreCompleto(nueva)} envió una solicitud de acceso.`);
  return { ok: true, solicitud: nueva };
}

// Solicitudes de ejemplo con su correo y código, para mostrar cómo funciona "Estado de solicitud".
export function ejemplosConsulta(datos) {
  return datos.solicitudesAcceso
    .filter((s) => s.demo)
    .map((s) => ({ id: s.id, nombre: nombreCompleto(s), correo: s.correo, codigo: s.codigo, estado: s.estado }));
}

// Devuelve la solicitud solo si el correo y el código coinciden.
export function consultarSolicitud(datos, correo, codigo) {
  const correoBuscado = normalizar(correo);
  const codigoBuscado = texto(codigo).toUpperCase();
  if (!correoBuscado || !codigoBuscado) {
    return null;
  }
  return (
    datos.solicitudesAcceso.find(
      (s) => normalizar(s.correo) === correoBuscado && s.codigo.toUpperCase() === codigoBuscado,
    ) ?? null
  );
}

export function cambiarEstadoAcceso(datos, id, nuevoEstado, autor) {
  const solicitud = datos.solicitudesAcceso.find((s) => s.id === id);
  if (!solicitud) {
    return error("La solicitud no existe.", 404);
  }
  if (!ESTADOS_ACCESO.includes(nuevoEstado)) {
    return error("Estado no válido.");
  }
  if (solicitud.estado === nuevoEstado) {
    return { ok: true };
  }

  let usuarioEliminado = null;

  if (nuevoEstado === "Aceptada") {
    if (buscarUsuario(datos, solicitud.usuario)) {
      return error(`El usuario ${solicitud.usuario} ya existe en el sistema.`, 409);
    }
    const clave = textoAleatorio(8);
    solicitud.credenciales = { usuario: solicitud.usuario, clave };
    datos.usuarios.push({
      usuario: solicitud.usuario,
      claveHash: hashClave(clave),
      rol: "Usuario",
      permisos: { ...TODOS_LOS_PERMISOS },
      nombre: nombreCompleto(solicitud),
      correo: solicitud.correo,
      telefono: solicitud.telefono ?? "",
      rut: solicitud.rut ?? "",
      solicitudId: solicitud.id,
      creado: new Date().toISOString(),
    });
  } else if (solicitud.estado === "Aceptada") {
    // Quita la cuenta creada por una solicitud que deja de estar aceptada.
    usuarioEliminado = datos.usuarios.find((u) => u.solicitudId === solicitud.id)?.usuario ?? null;
    datos.usuarios = datos.usuarios.filter((u) => u.solicitudId !== solicitud.id);
    solicitud.credenciales = null;
  }

  solicitud.estado = nuevoEstado;
  solicitud.comentarios.push({
    autor,
    texto: `Estado cambiado a ${nuevoEstado}.`,
    fecha: new Date().toISOString(),
    sistema: true,
  });
  registrarNotificacion(datos, "solicitud", solicitud.usuario, `La solicitud de ${nombreCompleto(solicitud)} pasó a ${nuevoEstado}.`);
  return { ok: true, usuarioEliminado };
}

export function agregarComentarioAcceso(datos, id, textoComentario, autor) {
  const limpio = texto(textoComentario);
  if (!limpio) {
    return error("Escribe un comentario.");
  }
  if (limpio.length > 2000) {
    return error("El comentario es demasiado largo.");
  }
  const solicitud = datos.solicitudesAcceso.find((s) => s.id === id);
  if (!solicitud) {
    return error("La solicitud no existe.", 404);
  }
  solicitud.comentarios.push({ autor, texto: limpio, fecha: new Date().toISOString() });
  return { ok: true };
}

// ---------- Conexión de los usuarios ----------
// Cada pestaña con sesión iniciada manda un "latido" cada pocos segundos. El servidor solo guarda
// las marcas de tiempo; el navegador calcula el estado (Conectado / Inactivo / Desconectado).
// La presencia vive en memoria: al reiniciar el servidor todos quedan desconectados.

function guardarPresencia(datos, usuario, cambios) {
  datos.presencia[usuario] = { ...datos.presencia[usuario], ...cambios };
}

export function marcarConexion(datos, usuario) {
  const ahora = new Date().toISOString();
  guardarPresencia(datos, usuario, { conectado: true, latido: ahora, actividad: ahora });
  registrarNotificacion(datos, "sesion", usuario, `${usuario} inició sesión.`);
}

// Latido: la pestaña sigue abierta. Con huboActividad también se renueva la última actividad.
export function registrarLatido(datos, usuario, huboActividad = false) {
  const ahora = new Date().toISOString();
  guardarPresencia(datos, usuario, huboActividad ? { conectado: true, latido: ahora, actividad: ahora } : { conectado: true, latido: ahora });
}

export function marcarDesconexion(datos, usuario, avisar = true) {
  guardarPresencia(datos, usuario, { conectado: false });
  if (avisar) {
    registrarNotificacion(datos, "sesion", usuario, `${usuario} cerró sesión.`);
  }
}

export function obtenerConexiones(datos) {
  return datos.usuarios.map((u) => ({
    usuario: u.usuario,
    nombre: u.nombre ?? "",
    rol: u.rol,
    conectado: Boolean(datos.presencia[u.usuario]?.conectado),
    latido: datos.presencia[u.usuario]?.latido ?? null,
    actividad: datos.presencia[u.usuario]?.actividad ?? null,
  }));
}

// ---------- Notificaciones ----------

export function registrarNotificacion(datos, tipo, usuario, textoNotificacion) {
  const nueva = {
    id: `${Date.now()}-${textoAleatorio(4)}`,
    tipo,
    usuario,
    texto: textoNotificacion,
    fecha: new Date().toISOString(),
  };
  datos.notificaciones = [nueva, ...datos.notificaciones].slice(0, MAX_NOTIFICACIONES);
}

export function leerNotificaciones(datos) {
  return [...datos.notificaciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// ---------- Candidatos y solicitudes de evaluación ----------

export function reemplazarColeccion(datos, nombre, lista) {
  if (!Object.hasOwn(COLECCIONES, nombre)) {
    return error("La lista no existe.", 404);
  }
  if (!Array.isArray(lista) || lista.length > MAX_COLECCION) {
    return error("Los datos no tienen el formato esperado.");
  }
  const ids = new Set();
  for (const elemento of lista) {
    const esObjeto = elemento && typeof elemento === "object" && !Array.isArray(elemento);
    if (!esObjeto || !Number.isInteger(elemento.id) || ids.has(elemento.id)) {
      return error("Los datos no tienen el formato esperado.");
    }
    ids.add(elemento.id);
  }
  datos[nombre] = lista;
  return { ok: true };
}
