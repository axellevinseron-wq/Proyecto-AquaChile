// Envío real de correos con FormSubmit (https://formsubmit.co), sin servidor propio.
//
// 1. Escribe el correo del administrador en un archivo ".env" (ver ".env.example"):
//      VITE_FORMSUBMIT_CORREO=tu-correo@gmail.com
// 2. Reinicia "npm run dev".
// 3. La primera vez que se envíe una solicitud, FormSubmit manda un correo de activación
//    a esa dirección: ábrelo y confirma. Desde entonces las solicitudes llegan a ese correo.
//
// Al solicitante se le envía una copia automática (_autoresponse) con su código de seguimiento.

const DESTINO = import.meta.env.VITE_FORMSUBMIT_CORREO ?? "";

export function correoConfigurado() {
  return DESTINO.trim() !== "";
}

export async function enviarSolicitudPorCorreo(solicitud) {
  if (!correoConfigurado()) {
    return { ok: false, error: "El envío de correos no está configurado (falta VITE_FORMSUBMIT_CORREO)." };
  }

  const enlaceEstado = `${window.location.origin}/solicitud?tab=estado`;

  try {
    const respuesta = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(DESTINO.trim())}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `Nueva solicitud de acceso: ${solicitud.usuario}`,
        _template: "table",
        _captcha: "false",
        _autoresponse:
          `Hola ${solicitud.nombre}, recibimos tu solicitud de acceso a AquaChile.\n\n` +
          `Tu código de seguimiento es: ${solicitud.codigo}\n\n` +
          `Ingresa a ${enlaceEstado} con tu correo y este código para ver el estado y los comentarios del administrador.`,
        nombre: `${solicitud.nombre} ${solicitud.apellido ?? ""}`.trim(),
        rut: solicitud.rut,
        telefono: solicitud.telefono,
        email: solicitud.correo,
        usuario_solicitado: solicitud.usuario,
        motivo: solicitud.motivo,
        fecha: solicitud.fecha,
      }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || String(datos.success) === "false") {
      return { ok: false, error: datos.message ?? "FormSubmit no pudo enviar el correo." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con FormSubmit. Revisa tu conexión." };
  }
}
