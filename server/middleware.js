// Piezas reutilizables de Express: sesión, permisos, límite de intentos y manejo de errores.

import { buscarUsuario, permisosDe } from "./dominio.js";

// Identifica al usuario por el token "Authorization: Bearer ..." y lo deja en req.usuario.
// Los datos del usuario se leen en cada petición, así un cambio de rol o permisos se aplica al instante.
export function crearAutenticacion({ almacen, sesiones }) {
  function requiereSesion(req, res, next) {
    const encabezado = req.get("authorization") ?? "";
    const token = encabezado.startsWith("Bearer ") ? encabezado.slice(7) : "";
    const nombre = token ? sesiones.leer(token) : null;
    const usuario = nombre ? buscarUsuario(almacen.datos, nombre) : null;
    if (!usuario) {
      return res.status(401).json({ error: "Tu sesión no es válida o venció. Vuelve a iniciar sesión." });
    }
    req.usuario = usuario;
    req.token = token;
    return next();
  }

  function requiereAdmin(req, res, next) {
    if (req.usuario?.rol !== "Administrador") {
      return res.status(403).json({ error: "Solo los administradores pueden hacer esto." });
    }
    return next();
  }

  function requierePermiso(permiso) {
    return (req, res, next) => {
      if (permisosDe(req.usuario)[permiso] === false) {
        return res.status(403).json({ error: "No tienes permiso para modificar esta sección." });
      }
      return next();
    };
  }

  return { requiereSesion, requiereAdmin, requierePermiso };
}

// Limita cuántas veces se puede repetir algo en una ventana de tiempo (en memoria).
// Con soloFallos, solo se cuentan los intentos que llamen a registrarFallo (ej.: contraseñas incorrectas).
export function crearLimitador({ max, ventanaMs }) {
  const registros = new Map();

  function vigente(clave) {
    const registro = registros.get(clave);
    if (registro && Date.now() - registro.desde > ventanaMs) {
      registros.delete(clave);
      return null;
    }
    return registro ?? null;
  }

  return {
    excedido(clave) {
      return (vigente(clave)?.cuenta ?? 0) >= max;
    },
    contar(clave) {
      const registro = vigente(clave) ?? { cuenta: 0, desde: Date.now() };
      registro.cuenta += 1;
      registros.set(clave, registro);
    },
    limpiar(clave) {
      registros.delete(clave);
    },
  };
}

export function demasiadosIntentos(res) {
  return res.status(429).json({ error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." });
}

export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: "La ruta no existe." });
}

// Express llama a esta función cuando algo falla. Nunca se devuelve el detalle interno al navegador.
// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, next) {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Los datos enviados pesan demasiado." });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido." });
  }
  console.error(err);
  return res.status(500).json({ error: "Ocurrió un error en el servidor." });
}
