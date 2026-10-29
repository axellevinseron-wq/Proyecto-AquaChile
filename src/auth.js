const CLAVE_USUARIOS = "vcm-usuarios";
const CLAVE_SOLICITUDES_CUENTA = "vcm-solicitudes-cuenta";


const USUARIOS_INICIALES = [
  { usuario: "admin", clave: "admin123", rol: "Administrador" },
  { usuario: "jefe.rrhh", clave: "rrhh123", rol: "Administrador" },
  { usuario: "psicologo", clave: "psico123", rol: "Usuario" },
];


const SOLICITUDES_CUENTA_DEMO = [
  {
    id: 1,
    nombre: "Valentina Rojas",
    correo: "valentina.rojas@example.test",
    usuario: "vrojas",
    clave: "clave123",
    fecha: "2026-10-20T15:30:00.000Z",
    estado: "Pendiente",
  },
  {
    id: 2,
    nombre: "Diego Mora",
    correo: "diego.mora@example.test",
    usuario: "dmora",
    clave: "clave123",
    fecha: "2026-10-21T13:10:00.000Z",
    estado: "Pendiente",
  },
];

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    
  }
}

export function obtenerUsuarios() {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_USUARIOS));
    if (Array.isArray(guardados) && guardados.length > 0) {
      return guardados;
    }
  } catch {
    
  }
  guardar(CLAVE_USUARIOS, USUARIOS_INICIALES);
  return USUARIOS_INICIALES;
}

export function iniciarSesion(usuario, clave) {
  const nombre = usuario.trim().toLowerCase();
  const encontrado = obtenerUsuarios().find(
    (u) => u.usuario.toLowerCase() === nombre && u.clave === clave,
  );
  return encontrado ? { usuario: encontrado.usuario, rol: encontrado.rol } : null;
}

export function leerSolicitudesCuenta() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE_SOLICITUDES_CUENTA));
    if (Array.isArray(guardadas)) {
      return guardadas;
    }
  } catch {
    
  }
  guardar(CLAVE_SOLICITUDES_CUENTA, SOLICITUDES_CUENTA_DEMO);
  return SOLICITUDES_CUENTA_DEMO;
}

export function tieneSolicitudPendiente(usuario) {
  const nombre = usuario.trim().toLowerCase();
  return leerSolicitudesCuenta().some(
    (s) => s.estado === "Pendiente" && s.usuario.toLowerCase() === nombre,
  );
}


export function crearSolicitudCuenta({ nombre, correo, usuario, clave }) {
  const solicitudes = leerSolicitudesCuenta();
  const nombreUsuario = usuario.trim();
  const repetido =
    obtenerUsuarios().some((u) => u.usuario.toLowerCase() === nombreUsuario.toLowerCase()) ||
    tieneSolicitudPendiente(nombreUsuario);

  if (repetido) {
    return { ok: false, error: "Ese usuario ya existe o tiene una solicitud pendiente." };
  }

  const nueva = {
    id: solicitudes.length ? Math.max(...solicitudes.map((s) => s.id)) + 1 : 1,
    nombre: nombre.trim(),
    correo: correo.trim(),
    usuario: nombreUsuario,
    clave,
    fecha: new Date().toISOString(),
    estado: "Pendiente",
  };
  guardar(CLAVE_SOLICITUDES_CUENTA, [...solicitudes, nueva]);
  return { ok: true };
}


export function resolverSolicitudCuenta(id, decision) {
  const solicitudes = leerSolicitudesCuenta();
  const solicitud = solicitudes.find((s) => s.id === id);
  if (!solicitud || solicitud.estado !== "Pendiente") {
    return solicitudes;
  }

  if (decision === "aceptar") {
    guardar(CLAVE_USUARIOS, [
      ...obtenerUsuarios(),
      {
        usuario: solicitud.usuario,
        clave: solicitud.clave,
        rol: "Usuario",
        nombre: solicitud.nombre,
        correo: solicitud.correo,
      },
    ]);
  }

  const actualizadas = solicitudes.map((s) =>
    s.id === id ? { ...s, estado: decision === "aceptar" ? "Aceptada" : "Cancelada" } : s,
  );
  guardar(CLAVE_SOLICITUDES_CUENTA, actualizadas);
  return actualizadas;
}
