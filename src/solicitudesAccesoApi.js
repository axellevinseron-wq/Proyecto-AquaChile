const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function peticionPublica(ruta, datos) {
  let respuesta;
  try {
    respuesta = await fetch(`${API}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Comprueba que el backend esté iniciado.");
  }
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(respuesta.status === 404
      ? "No encontramos una solicitud con ese correo y código. Revisa los datos."
      : (error.detail || error.message || `Error HTTP ${respuesta.status}`));
  }
  return respuesta.json();
}

export async function crearSolicitudAccesoApi(datos, cv) {
  const formulario = new FormData();
  formulario.append("datos", JSON.stringify({
    nombre: datos.nombre, apellido: datos.apellido, rut: datos.rut,
    telefono: datos.telefono, correo: datos.correo,
    usuarioSolicitado: datos.usuario, motivo: datos.motivo,
  }));
  formulario.append("cv", cv);
  let respuesta;
  try {
    respuesta = await fetch(`${API}/api/publico/solicitudes-acceso`, {
      method: "POST", body: formulario,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Comprueba que el backend esté iniciado.");
  }
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error.detail || error.message || `Error HTTP ${respuesta.status}`);
  }
  return respuesta.json();
}

export function consultarSolicitudAccesoApi(correo, codigoSeguimiento) {
  return peticionPublica("/api/publico/solicitudes-acceso/consultar", { correo, codigoSeguimiento });
}
