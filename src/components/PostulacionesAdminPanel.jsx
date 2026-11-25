import { Fragment, useEffect, useState } from "react";
import { pedir } from "../api";

const ESTADOS = ["Recibida", "En revisión", "Entrevista", "Seleccionada", "No seleccionada"];
const CLIENTE_GOOGLE_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

function fechaLocal(iso) {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (!Number.isFinite(fecha.getTime())) return "";
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fechaVisible(entrevista) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: entrevista.zonaHoraria,
  }).format(new Date(entrevista.inicio));
}

function PostulacionesAdminPanel() {
  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [formularioId, setFormularioId] = useState(null);
  const [fechaHora, setFechaHora] = useState("");
  const [zonaHoraria, setZonaHoraria] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Santiago",
  );
  const [duracionMinutos, setDuracionMinutos] = useState("30");
  const [ocupadaId, setOcupadaId] = useState(null);

  useEffect(() => {
    let activo = true;
    pedir("GET", "/admin/postulaciones").then((respuesta) => {
      if (!activo) return;
      setCargando(false);
      if (!respuesta.ok) {
        setError(respuesta.datos?.error ?? "No se pudieron cargar las postulaciones.");
        return;
      }
      setError("");
      setPostulaciones(respuesta.datos.items);
    });
    return () => {
      activo = false;
    };
  }, []);

  async function cambiarEstado(id, estado) {
    const respuesta = await pedir("PATCH", `/admin/postulaciones/${id}/estado`, { estado });
    if (!respuesta.ok) {
      setError(respuesta.datos?.error ?? "No se pudo actualizar el estado.");
      return;
    }
    setError("");
    setPostulaciones((actuales) =>
      actuales.map((item) => item.id === id ? { ...item, estado } : item),
    );
  }

  function abrirFormulario(item) {
    setFormularioId(item.id);
    setFechaHora(fechaLocal(item.entrevista?.inicio));
    setZonaHoraria(item.entrevista?.zonaHoraria || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Santiago");
    setDuracionMinutos(String(item.entrevista?.duracionMinutos ?? 30));
    setError("");
  }

  function autorizarGoogle(alRecibirToken) {
    if (!CLIENTE_GOOGLE_ID) {
      setError("Configura VITE_GOOGLE_CLIENT_ID para habilitar Google Calendar.");
      setOcupadaId(null);
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      setError("No se pudo cargar la autorización de Google. Recarga la página e inténtalo nuevamente.");
      setOcupadaId(null);
      return;
    }

    try {
      const cliente = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENTE_GOOGLE_ID,
        scope: "openid email https://www.googleapis.com/auth/calendar.events",
        callback: ({ access_token: accessToken, error: errorGoogle }) => {
          if (errorGoogle || !accessToken) {
            setError("No se autorizó Google Calendar. Vuelve a intentarlo.");
            setOcupadaId(null);
            return;
          }
          alRecibirToken(accessToken);
        },
        error_callback: () => {
          setError("No se pudo abrir la autorización de Google.");
          setOcupadaId(null);
        },
      });
      cliente.requestAccessToken({ prompt: "consent" });
    } catch {
      setError("No se pudo iniciar la autorización de Google.");
      setOcupadaId(null);
    }
  }

  function enviarEntrevista(evento, item) {
    evento.preventDefault();
    const inicio = new Date(fechaHora);
    if (!Number.isFinite(inicio.getTime()) || inicio <= new Date()) {
      setError("Selecciona una fecha y hora futuras.");
      return;
    }
    setError("");
    setOcupadaId(item.id);
    autorizarGoogle(async (accessToken) => {
      const metodo = item.entrevista?.estado === "Agendada" ? "PATCH" : "POST";
      const respuesta = await pedir(
        metodo,
        `/admin/postulaciones/${item.id}/entrevista`,
        {
          googleAccessToken: accessToken,
          inicio: inicio.toISOString(),
          zonaHoraria,
          duracionMinutos: Number(duracionMinutos),
        },
      );
      setOcupadaId(null);
      if (!respuesta.ok) {
        setError(respuesta.datos?.error ?? "No se pudo agendar la entrevista.");
        return;
      }
      setPostulaciones((actuales) =>
        actuales.map((postulacion) => postulacion.id === item.id ? respuesta.datos.postulacion : postulacion),
      );
      setFormularioId(null);
    });
  }

  function cancelarEntrevista(item) {
    if (!window.confirm(`¿Cancelar la entrevista de ${item.nombre}?`)) return;
    setError("");
    setOcupadaId(item.id);
    autorizarGoogle(async (accessToken) => {
      const respuesta = await pedir(
        "DELETE",
        `/admin/postulaciones/${item.id}/entrevista`,
        { googleAccessToken: accessToken },
      );
      setOcupadaId(null);
      if (!respuesta.ok) {
        setError(respuesta.datos?.error ?? "No se pudo cancelar la entrevista.");
        return;
      }
      setPostulaciones((actuales) =>
        actuales.map((postulacion) => postulacion.id === item.id ? respuesta.datos.postulacion : postulacion),
      );
      setFormularioId(null);
    });
  }

  return (
    <section aria-labelledby="titulo-postulaciones">
      <div className="mb-3">
        <h1 className="h3 mb-1" id="titulo-postulaciones">Postulaciones</h1>
        <p className="text-secondary mb-0">Revisa a las personas interesadas y actualiza el avance de selección.</p>
      </div>
      {error && <p className="alert alert-danger py-2" role="alert">{error}</p>}
      {cargando ? (
        <p role="status">Cargando postulaciones...</p>
      ) : (
        <div className="card card-body caja caja--azul">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead><tr><th>Postulante</th><th>Oferta</th><th>Fecha</th><th>Estado</th><th>Entrevista</th><th>Mensaje</th></tr></thead>
              <tbody>
                {postulaciones.map((item) => (
                  <Fragment key={item.id}>
                    <tr>
                      <td><strong>{item.nombre}</strong><small className="d-block"><a href={`mailto:${item.correo}`}>{item.correo}</a></small><small className="d-block text-secondary">{item.telefono}</small></td>
                      <td>{item.ofertaTitulo}</td>
                      <td>{new Date(item.fecha).toLocaleDateString("es-CL")}</td>
                      <td>
                        <label className="visually-hidden" htmlFor={`postulacion-estado-${item.id}`}>Estado de {item.nombre}</label>
                        <select id={`postulacion-estado-${item.id}`} className="form-select form-select-sm" value={item.estado} onChange={(evento) => cambiarEstado(item.id, evento.target.value)}>
                          {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
                        </select>
                      </td>
                      <td>
                        {item.entrevista?.estado === "Agendada" ? (
                          <div className="d-flex flex-column gap-1">
                            <span className="small">{fechaVisible(item.entrevista)}</span>
                            {item.entrevista.enlaceCalendar && <a href={item.entrevista.enlaceCalendar} target="_blank" rel="noreferrer">Ver evento</a>}
                            {item.entrevista.enlaceMeet && <a href={item.entrevista.enlaceMeet} target="_blank" rel="noreferrer">Entrar a Meet</a>}
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              <button type="button" className="btn btn-sm btn-outline-primary" disabled={ocupadaId === item.id} onClick={() => abrirFormulario(item)}>Reprogramar</button>
                              <button type="button" className="btn btn-sm btn-outline-danger" disabled={ocupadaId === item.id} onClick={() => cancelarEntrevista(item)}>Cancelar</button>
                            </div>
                          </div>
                        ) : item.estado === "Entrevista" ? (
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => abrirFormulario(item)}>
                            {item.entrevista?.estado === "Error" ? "Reintentar" : "Agendar entrevista"}
                          </button>
                        ) : (
                          <span className="text-secondary">—</span>
                        )}
                        {item.entrevista?.estado === "Error" && <small className="d-block text-danger mt-1">No se pudo completar la cita.</small>}
                      </td>
                      <td className="admin-empleos__mensaje">{item.mensaje || "—"}</td>
                    </tr>
                    {formularioId === item.id && (
                      <tr key={`entrevista-${item.id}`}>
                        <td colSpan="6">
                          <form className="card card-body caja caja--azul p-3" onSubmit={(evento) => enviarEntrevista(evento, item)}>
                            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                              <h2 className="h5 mb-0">{item.entrevista?.estado === "Agendada" ? "Reprogramar entrevista" : "Agendar entrevista"}</h2>
                              <button type="button" className="btn-close" aria-label="Cerrar formulario" onClick={() => setFormularioId(null)} />
                            </div>
                            <p className="small text-secondary mb-2">
                              {item.nombre} · {item.correo} · {item.ofertaTitulo}
                            </p>
                            <div className="row g-2 align-items-end">
                              <div className="col-12 col-md-5">
                                <label className="form-label mb-1" htmlFor={`entrevista-fecha-${item.id}`}>Fecha y hora</label>
                                <input
                                  id={`entrevista-fecha-${item.id}`}
                                  type="datetime-local"
                                  className="form-control"
                                  value={fechaHora}
                                  min={fechaLocal(new Date().toISOString())}
                                  required
                                  onChange={(evento) => setFechaHora(evento.target.value)}
                                />
                              </div>
                              <div className="col-6 col-md-3">
                                <label className="form-label mb-1" htmlFor={`entrevista-duracion-${item.id}`}>Duración</label>
                                <select id={`entrevista-duracion-${item.id}`} className="form-select" value={duracionMinutos} onChange={(evento) => setDuracionMinutos(evento.target.value)}>
                                  <option value="15">15 minutos</option>
                                  <option value="30">30 minutos</option>
                                  <option value="45">45 minutos</option>
                                  <option value="60">60 minutos</option>
                                  <option value="90">90 minutos</option>
                                  <option value="120">120 minutos</option>
                                  <option value="180">180 minutos</option>
                                </select>
                              </div>
                              <div className="col-6 col-md-4">
                                <label className="form-label mb-1" htmlFor={`entrevista-zona-${item.id}`}>Zona horaria</label>
                                <input id={`entrevista-zona-${item.id}`} className="form-control" value={zonaHoraria} readOnly />
                              </div>
                            </div>
                            <div className="d-flex justify-content-end gap-2 mt-3">
                              <button type="button" className="btn btn-outline-secondary" onClick={() => setFormularioId(null)}>Volver</button>
                              <button type="submit" className="btn btn-primary" disabled={ocupadaId === item.id}>
                                {ocupadaId === item.id ? "Conectando con Google..." : "Confirmar y enviar invitación"}
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {postulaciones.length === 0 && <tr><td colSpan="6" className="text-center text-secondary py-4">Aún no hay postulaciones recibidas.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default PostulacionesAdminPanel;
