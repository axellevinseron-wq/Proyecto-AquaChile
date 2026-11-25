const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const USER_INFO_API = "https://www.googleapis.com/oauth2/v3/userinfo";

export class GoogleCalendarError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GoogleCalendarError";
    this.status = status;
  }
}

export function crearClienteGoogleCalendar({ fetchImpl = fetch } = {}) {
  async function solicitar(url, accessToken, opciones = {}) {
    let respuesta;
    try {
      respuesta = await fetchImpl(url, {
        ...opciones,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(opciones.body ? { "Content-Type": "application/json" } : {}),
          ...opciones.headers,
        },
      });
    } catch {
      throw new GoogleCalendarError("No se pudo conectar con Google Calendar. Inténtalo nuevamente.", 503);
    }

    if (respuesta.status === 204) return null;

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      const mensaje = datos.error?.message;
      throw new GoogleCalendarError(
        typeof mensaje === "string" && mensaje.length <= 240
          ? mensaje
          : "Google Calendar rechazó la operación. Revisa la autorización e inténtalo nuevamente.",
        respuesta.status,
      );
    }
    return datos;
  }

  return {
    async obtenerOrganizador(accessToken) {
      const usuario = await solicitar(USER_INFO_API, accessToken);
      if (!usuario?.email || usuario.email_verified !== true) {
        throw new GoogleCalendarError("Google no confirmó el correo de la cuenta organizadora.", 403);
      }
      return usuario.email.trim().toLocaleLowerCase("en-US");
    },

    async crearEvento(accessToken, evento) {
      const url = `${CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`;
      try {
        return await solicitar(url, accessToken, {
          method: "POST",
          body: JSON.stringify(evento),
        });
      } catch (error) {
        if (!(error instanceof GoogleCalendarError) || error.status !== 409) throw error;
        return solicitar(`${CALENDAR_API}/calendars/primary/events/${evento.id}`, accessToken);
      }
    },

    actualizarEvento(accessToken, eventId, cambios) {
      return solicitar(
        `${CALENDAR_API}/calendars/primary/events/${eventId}?conferenceDataVersion=1&sendUpdates=all`,
        accessToken,
        { method: "PATCH", body: JSON.stringify(cambios) },
      );
    },

    async eliminarEvento(accessToken, eventId) {
      try {
        await solicitar(
          `${CALENDAR_API}/calendars/primary/events/${eventId}?sendUpdates=all`,
          accessToken,
          { method: "DELETE" },
        );
      } catch (error) {
        if (!(error instanceof GoogleCalendarError) || error.status !== 404) throw error;
      }
    },
  };
}
