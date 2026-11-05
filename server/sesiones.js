// Sesiones en memoria: el cliente recibe un token al iniciar sesión y lo manda en cada petición.
// Si el servidor se reinicia, las sesiones se pierden y hay que volver a ingresar.

import { tokenSesion } from "./seguridad.js";

const DURACION_MS = 8 * 60 * 60 * 1000;

export function crearSesiones() {
  const activas = new Map();

  return {
    crear(usuario) {
      const token = tokenSesion();
      activas.set(token, { usuario, expira: Date.now() + DURACION_MS });
      return token;
    },
    // Devuelve el nombre de usuario de la sesión y la renueva, o null si no existe o venció.
    leer(token) {
      const sesion = activas.get(token);
      if (!sesion) {
        return null;
      }
      if (sesion.expira < Date.now()) {
        activas.delete(token);
        return null;
      }
      sesion.expira = Date.now() + DURACION_MS;
      return sesion.usuario;
    },
    cerrar(token) {
      activas.delete(token);
    },
    cerrarDe(usuario) {
      for (const [token, sesion] of activas) {
        if (sesion.usuario === usuario) {
          activas.delete(token);
        }
      }
    },
  };
}
