
const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const CLAVE = "aquachile-sesion-api";

export function leerSesionApi() {
  try {
    const guardado = sessionStorage.getItem(CLAVE);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

export function guardarSesionApi(sesion) {
  if (sesion) {
    sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
  } else {
    sessionStorage.removeItem(CLAVE);
  }
}

export async function apiFetch(ruta, opciones = {}) {
  const sesion = leerSesionApi();

  const headers = new Headers(opciones.headers || {});

  if (sesion?.token) {
    headers.set("Authorization", `Bearer ${sesion.token}`);
  }

  if (
      opciones.body &&
      !(opciones.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const respuesta = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers,
  });

  if (respuesta.status === 401) {
    guardarSesionApi(null);
  }

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));

    throw new Error(
        error.detail ||
        error.message ||
        `Error HTTP ${respuesta.status}`
    );
  }

  if (respuesta.status === 204) {
    return null;
  }

  return respuesta.json();
}

export async function loginApi(correo, password) {
  const respuesta = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ correo, password }),
  });

  if (!respuesta.token) {
    throw new Error("El servidor no devolvio un token JWT.");
  }

  const sesion = {
    token: respuesta.token,
    usuario: respuesta.nombre || respuesta.correo || correo,
    correo: respuesta.correo || correo,
    rolApi: respuesta.rol,
    rol:
        respuesta.rol === "ADMIN"
            ? "Administrador"
            : respuesta.rol === "EVALUADOR"
                ? "Evaluador"
                : "Analista",
    permisos: {
      indicadores: true,
      candidatos: true,
      solicitudes: true,
    },
  };

  guardarSesionApi(sesion);

  return sesion;
}

export async function obtenerUsuarioActualApi() {
  return apiFetch("/api/auth/me");
}

export async function verificarSesionApi() {
  const sesion = leerSesionApi();

  if (!sesion?.token) {
    return null;
  }

  try {
    await obtenerUsuarioActualApi();
    return sesion;
  } catch {
    guardarSesionApi(null);
    return null;
  }
}
