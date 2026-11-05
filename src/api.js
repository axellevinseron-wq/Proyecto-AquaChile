// Cliente HTTP del sistema: todas las peticiones al servidor Express (carpeta server/) pasan por aquí.
//
// En desarrollo, Vite reenvía las rutas /api al servidor (ver vite.config.js), así que no hace falta
// configurar nada. Si el frontend y la API están en direcciones distintas, define VITE_API_URL
// (por ejemplo http://localhost:3001) en el archivo .env.

export const AVISO_SESION_VENCIDA = "vcm-sesion-vencida";

let base = import.meta.env.VITE_API_URL ?? "";
let token = null;

export function configurarApi({ url }) {
  base = url;
}

// El token de sesión solo vive en memoria: al recargar la página hay que volver a ingresar.
export function fijarToken(nuevo) {
  token = nuevo;
}

export function hayToken() {
  return token !== null;
}

// Nunca lanza errores: siempre devuelve { ok, status, datos }. Si el servidor no responde, status es 0.
export async function pedir(metodo, ruta, cuerpo, { keepalive = false } = {}) {
  const encabezados = { Accept: "application/json" };
  if (cuerpo !== undefined) {
    encabezados["Content-Type"] = "application/json";
  }
  const conSesion = token !== null;
  if (conSesion) {
    encabezados.Authorization = `Bearer ${token}`;
  }

  try {
    const respuesta = await fetch(`${base}/api${ruta}`, {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      keepalive,
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 401 && conSesion) {
      // El servidor ya no reconoce la sesión (venció o se reinició): la app vuelve al login.
      window.dispatchEvent(new Event(AVISO_SESION_VENCIDA));
    }
    return { ok: respuesta.ok, status: respuesta.status, datos };
  } catch {
    return {
      ok: false,
      status: 0,
      datos: { error: "No se pudo conectar con el servidor. Revisa que esté encendido." },
    };
  }
}
