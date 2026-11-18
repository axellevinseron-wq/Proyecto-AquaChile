// Reglas del sistema (antes vivían en src/auth.js y funcionaban sobre localStorage).
// Son funciones simples que reciben el objeto de datos, lo modifican y devuelven { ok, ... }.
// Quien las llama (las rutas de Express) decide cuándo guardar en disco.

import { correoValido, rutValido, telefonoValido } from "../src/logica.js";
import { claveCoincide, hashClave, hashToken, textoAleatorio, tokenSesion } from "./seguridad.js";

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

export const ESTADOS_OFERTA = ["Borrador", "Publicada", "Cerrada"];
export const ESTADOS_POSTULACION = ["Recibida", "En revisión", "Entrevista", "Seleccionada", "No seleccionada"];

export function ofertaVigente(oferta) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const fechaHoy = `${partes.find((parte) => parte.type === "year").value}-${partes.find((parte) => parte.type === "month").value}-${partes.find((parte) => parte.type === "day").value}`;
  return oferta.estado === "Publicada" && (!oferta.fechaCierre || oferta.fechaCierre >= fechaHoy);
}

const MAX_IMAGEN = 1_500_000; // caracteres de la imagen en base64
const MAX_COLECCION = 5000;
const MAX_NOTIFICACIONES = 50;

// ---------- Utilidades ----------

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

// ---------- Invitaciones de usuario ----------

const DURACION_INVITACION = 24 * 60 * 60 * 1000;
const LARGO_MINIMO_CLAVE = 12;

function camposInvitacion(entrada) {
  const usuario = texto(entrada?.usuario);
  const nombre = texto(entrada?.nombre);
  const correo = texto(entrada?.correo);
  const rol = texto(entrada?.rol);
  if (!usuario || !nombre || !correo || !rol) return error("Completa todos los campos.");
  if (usuario.length > 50 || !/^[A-Za-z0-9._-]+$/.test(usuario)) {
    return error("El usuario debe tener hasta 50 caracteres y solo incluir letras, números, punto, guion o guion bajo.");
  }
  if (nombre.length > 120 || correo.length > 200 || !correoValido(correo)) {
    return error("El nombre o correo no es válido.");
  }
  if (!ROLES.includes(rol)) return error("El rol no es válido.");
  return {
    ok: true,
    campos: {
      usuario,
      nombre,
      correo,
      rol,
      permisos: rol === "Administrador"
        ? { ...TODOS_LOS_PERMISOS }
        : Object.fromEntries(PERMISOS.map((permiso) => [permiso.id, entrada.permisos?.[permiso.id] === true])),
    },
  };
}

function invitacionPublica(invitacion) {
  const publica = { ...invitacion };
  delete publica.tokenHash;
  return publica;
}

export function crearInvitacion(datos, entrada, creador) {
  const validacion = camposInvitacion(entrada);
  if (!validacion.ok) return validacion;
  const campos = validacion.campos;
  const usuario = normalizar(campos.usuario);
  const correo = normalizar(campos.correo);
  datos.invitaciones ??= [];

  if (buscarUsuario(datos, campos.usuario) || datos.usuarios.some((item) => normalizar(item.correo) === correo)) {
    return error("Ya existe una cuenta con ese usuario o correo.", 409);
  }

  const ahora = Date.now();
  const pendientes = datos.invitaciones.filter(
    (anterior) => !anterior.usadaEn && !anterior.revocadaEn && new Date(anterior.expira).getTime() > ahora,
  );
  const conflicto = pendientes.some((anterior) => {
    const mismoUsuario = normalizar(anterior.usuario) === usuario;
    const mismoCorreo = normalizar(anterior.correo) === correo;
    return (mismoUsuario || mismoCorreo) && !(mismoUsuario && mismoCorreo);
  });
  if (conflicto) return error("Ya hay una invitación pendiente con ese usuario o correo.", 409);
  for (const anterior of pendientes) {
    if (normalizar(anterior.usuario) === usuario && normalizar(anterior.correo) === correo) {
      anterior.revocadaEn = new Date(ahora).toISOString();
    }
  }

  const token = tokenSesion();
  const invitacion = {
    id: datos.invitaciones.length ? Math.max(...datos.invitaciones.map((item) => item.id)) + 1 : 1,
    ...campos,
    tokenHash: hashToken(token),
    creada: new Date(ahora).toISOString(),
    expira: new Date(ahora + DURACION_INVITACION).toISOString(),
    creadaPor: creador,
    usadaEn: null,
    revocadaEn: null,
  };
  datos.invitaciones.push(invitacion);
  registrarNotificacion(datos, "invitacion", invitacion.usuario, `${creador} invitó a ${invitacion.nombre} al sistema.`);
  return { ok: true, invitacion: invitacionPublica(invitacion), token };
}

export function leerInvitaciones(datos) {
  return [...(datos.invitaciones ?? [])]
    .sort((a, b) => b.creada.localeCompare(a.creada))
    .map(invitacionPublica);
}

function buscarInvitacion(datos, token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
  const hash = hashToken(token);
  return (datos.invitaciones ?? []).find((item) => item.tokenHash === hash) ?? null;
}

function estadoInvitacion(invitacion) {
  if (invitacion.usadaEn) return "usada";
  if (invitacion.revocadaEn) return "revocada";
  if (new Date(invitacion.expira).getTime() <= Date.now()) return "vencida";
  return "pendiente";
}

export function consultarInvitacion(datos, token) {
  const invitacion = buscarInvitacion(datos, token);
  if (!invitacion) return error("La invitación no existe o ya no es válida.", 404);
  if (estadoInvitacion(invitacion) !== "pendiente") return error("La invitación ya fue usada, revocada o venció.", 410);
  return {
    ok: true,
    invitacion: {
      nombre: invitacion.nombre,
      usuario: invitacion.usuario,
      rol: invitacion.rol,
      expira: invitacion.expira,
    },
  };
}

export function aceptarInvitacion(datos, token, clave) {
  const invitacion = buscarInvitacion(datos, token);
  if (!invitacion) return error("La invitación no existe o ya no es válida.", 404);
  if (estadoInvitacion(invitacion) !== "pendiente") return error("La invitación ya fue usada, revocada o venció.", 410);
  if (typeof clave !== "string" || clave.length < LARGO_MINIMO_CLAVE || clave.length > 128) {
    return error(`La contraseña debe tener entre ${LARGO_MINIMO_CLAVE} y 128 caracteres.`);
  }
  if (buscarUsuario(datos, invitacion.usuario)) return error("El usuario ya tiene una cuenta.", 409);

  const ahora = new Date().toISOString();
  const usuario = {
    usuario: invitacion.usuario,
    claveHash: hashClave(clave),
    rol: invitacion.rol,
    permisos: { ...invitacion.permisos },
    nombre: invitacion.nombre,
    correo: invitacion.correo,
    invitacionId: invitacion.id,
    creado: ahora,
  };
  datos.usuarios.push(usuario);
  invitacion.usadaEn = ahora;
  registrarNotificacion(datos, "invitacion", usuario.usuario, `${usuario.nombre} completó una invitación.`);
  return { ok: true, usuario: usuarioPublico(usuario) };
}

export function revocarInvitacion(datos, id) {
  const invitacion = (datos.invitaciones ?? []).find((item) => item.id === id);
  if (!invitacion) return error("La invitación no existe.", 404);
  if (estadoInvitacion(invitacion) !== "pendiente") return error("Solo se pueden revocar invitaciones pendientes.", 409);
  invitacion.revocadaEn = new Date().toISOString();
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
  return [...(datos.notificaciones ?? [])]
    .filter((notificacion) => notificacion.tipo !== "solicitud")
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
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

// ---------- Ofertas de trabajo y postulaciones ----------

const CAMPOS_OFERTA = ["titulo", "area", "ubicacion", "modalidad", "jornada", "descripcion", "requisitos", "fechaCierre"];

function datosOferta(entrada) {
  return Object.fromEntries(CAMPOS_OFERTA.map((campo) => [campo, texto(entrada?.[campo])]));
}

function validarOferta(entrada, conEstado) {
  const campos = datosOferta(entrada);
  if (!campos.titulo || !campos.area || !campos.ubicacion || !campos.modalidad || !campos.jornada || !campos.descripcion) {
    return error("Completa los campos obligatorios de la oferta.");
  }
  if (Object.entries(campos).some(([campo, valor]) => valor.length > (campo === "descripcion" || campo === "requisitos" ? 5000 : 160))) {
    return error("Alguno de los campos de la oferta es demasiado largo.");
  }
  if (campos.fechaCierre && !/^\d{4}-\d{2}-\d{2}$/.test(campos.fechaCierre)) {
    return error("La fecha de cierre no es válida.");
  }
  if (conEstado && !ESTADOS_OFERTA.includes(entrada?.estado)) {
    return error("El estado de la oferta no es válido.");
  }
  return { ok: true, campos };
}

export function crearOferta(datos, entrada) {
  const validacion = validarOferta(entrada, true);
  if (!validacion.ok) return validacion;
  const oferta = {
    id: datos.ofertas.length ? Math.max(...datos.ofertas.map((item) => item.id)) + 1 : 1,
    ...validacion.campos,
    estado: entrada.estado,
    esDemo: false,
    creada: new Date().toISOString(),
  };
  datos.ofertas.unshift(oferta);
  return { ok: true, oferta };
}

export function actualizarOferta(datos, id, entrada) {
  const oferta = datos.ofertas.find((item) => item.id === id);
  if (!oferta) return error("La oferta no existe.", 404);
  const validacion = validarOferta(entrada, true);
  if (!validacion.ok) return validacion;
  Object.assign(oferta, validacion.campos, { estado: entrada.estado });
  return { ok: true, oferta };
}

export function crearPostulacion(datos, entrada) {
  const nombre = texto(entrada?.nombre);
  const correo = texto(entrada?.correo);
  const telefono = texto(entrada?.telefono);
  const mensaje = texto(entrada?.mensaje);
  const ofertaId = Number(entrada?.ofertaId);
  const oferta = datos.ofertas.find((item) => item.id === ofertaId && ofertaVigente(item));

  if (!oferta) return error("La oferta ya no está disponible.", 404);
  if (!nombre || !correo || !telefono) return error("Completa tu nombre, correo y teléfono.");
  if (nombre.length > 120 || correo.length > 200 || telefono.length > 40 || mensaje.length > 1500) {
    return error("Alguno de tus datos es demasiado largo.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return error("Ingresa un correo válido.");
  if (datos.postulaciones.some((item) => item.ofertaId === ofertaId && normalizar(item.correo) === normalizar(correo))) {
    return error("Ya recibimos una postulación con ese correo para esta oferta.", 409);
  }

  const postulacion = {
    id: datos.postulaciones.length ? Math.max(...datos.postulaciones.map((item) => item.id)) + 1 : 1,
    ofertaId,
    ofertaTitulo: oferta.titulo,
    nombre,
    correo,
    telefono,
    mensaje,
    estado: "Recibida",
    fecha: new Date().toISOString(),
  };
  datos.postulaciones.unshift(postulacion);
  return { ok: true, postulacion };
}

export function actualizarEstadoPostulacion(datos, id, estado) {
  const postulacion = datos.postulaciones.find((item) => item.id === id);
  if (!postulacion) return error("La postulación no existe.", 404);
  if (!ESTADOS_POSTULACION.includes(estado)) return error("El estado de la postulación no es válido.");
  postulacion.estado = estado;
  return { ok: true, postulacion };
}
