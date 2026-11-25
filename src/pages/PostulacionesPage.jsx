import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../apiClient";

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

export default function PostulacionesPage({ sesion }) {
  const esAdmin = sesion.rolApi === "ADMIN";
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

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await apiFetch("/api/postulaciones/administracion");
      setPostulaciones(Array.isArray(datos) ? datos : []);
      setError("");
    } catch (err) {
      setError(err.message || "No se pudieron cargar las postulaciones.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let activa = true;
    apiFetch("/api/postulaciones/administracion")
      .then((datos) => {
        if (activa) {
          setPostulaciones(Array.isArray(datos) ? datos : []);
          setError("");
        }
      })
      .catch((err) => {
        if (activa) setError(err.message || "No se pudieron cargar las postulaciones.");
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => { activa = false; };
  }, []);

  async function cambiarEstado(id, estado) {
    setOcupadaId(id);
    setError("");
    try {
      const actualizado = await apiFetch(`/api/admin/postulaciones/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setPostulaciones((actuales) => actuales.map((item) => item.id === id ? actualizado : item));
    } catch (err) {
      setError(err.message || "No se pudo actualizar el estado.");
    } finally {
      setOcupadaId(null);
    }
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
      try {
        const respuesta = await apiFetch(`/api/admin/postulaciones/${item.id}/entrevista`, {
          method: metodo,
          body: JSON.stringify({
            googleAccessToken: accessToken,
            inicio: inicio.toISOString(),
            zonaHoraria,
            duracionMinutos: Number(duracionMinutos),
          }),
        });
        setPostulaciones((actuales) =>
          actuales.map((postulacion) => postulacion.id === item.id ? respuesta.postulacion : postulacion),
        );
        setFormularioId(null);
      } catch (err) {
        setError(err.message || "No se pudo agendar la entrevista.");
      } finally {
        setOcupadaId(null);
      }
    });
  }

  function cancelarEntrevista(item) {
    if (!window.confirm(`¿Cancelar la entrevista de ${item.nombre}?`)) return;
    setError("");
    setOcupadaId(item.id);
    autorizarGoogle(async (accessToken) => {
      try {
        const respuesta = await apiFetch(`/api/admin/postulaciones/${item.id}/entrevista`, {
          method: "DELETE",
          body: JSON.stringify({ googleAccessToken: accessToken }),
        });
        setPostulaciones((actuales) =>
          actuales.map((postulacion) => postulacion.id === item.id ? respuesta.postulacion : postulacion),
        );
        setFormularioId(null);
      } catch (err) {
        setError(err.message || "No se pudo cancelar la entrevista.");
      } finally {
        setOcupadaId(null);
      }
    });
  }

  return (
    <section aria-labelledby="titulo-postulaciones">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 className="h3 mb-1" id="titulo-postulaciones">Postulaciones</h1>
          <p className="text-secondary mb-0">Revisa a las personas postulantes y coordina las entrevistas.</p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cargar} disabled={cargando}>Actualizar</button>
          <Link className="btn btn-outline-primary btn-sm" to="/evaluacion-cv">Revisar CV y evaluaciones</Link>
        </div>
      </div>
      {error && <p className="alert alert-danger py-2" role="alert">{error}</p>}
      {cargando ? <p role="status">Cargando postulaciones...</p> : (
        <div className="card card-body caja caja--azul">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead><tr><th>Postulante</th><th>Oferta</th><th>Estado</th><th>Entrevista</th></tr></thead>
              <tbody>
                {postulaciones.map((item) => (
                  <Fragment key={item.id}>
                    <tr>
                      <td><strong>{item.nombre || "Postulante"}</strong><small className="d-block"><a href={`mailto:${item.correo}`}>{item.correo}</a></small><small className="d-block text-secondary">{item.telefono}</small></td>
                      <td>{item.ofertaTitulo || "—"}</td>
                      <td>
                        {esAdmin ? (
                          <label className="visually-hidden" htmlFor={`postulacion-estado-${item.id}`}>Estado de {item.nombre}</label>
                        ) : null}
                        {esAdmin ? (
                          <select id={`postulacion-estado-${item.id}`} className="form-select form-select-sm"
                            value={item.estado} disabled={ocupadaId === item.id}
                            onChange={(evento) => cambiarEstado(item.id, evento.target.value)}>
                            {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
                          </select>
                        ) : item.estado}
                      </td>
                      <td>
                        {item.entrevista?.estado === "Agendada" ? (
                          <div className="d-flex flex-column gap-1">
                            <span className="small">{fechaVisible(item.entrevista)}</span>
                            {item.entrevista.enlaceCalendar && <a href={item.entrevista.enlaceCalendar} target="_blank" rel="noreferrer">Ver evento</a>}
                            {item.entrevista.enlaceMeet && <a href={item.entrevista.enlaceMeet} target="_blank" rel="noreferrer">Entrar a Meet</a>}
                            {esAdmin && <div className="d-flex flex-wrap gap-1 mt-1">
                              <button type="button" className="btn btn-sm btn-outline-primary" disabled={ocupadaId === item.id} onClick={() => abrirFormulario(item)}>Reprogramar</button>
                              <button type="button" className="btn btn-sm btn-outline-danger" disabled={ocupadaId === item.id} onClick={() => cancelarEntrevista(item)}>Cancelar</button>
                            </div>}
                          </div>
                        ) : esAdmin && item.estado === "Entrevista" ? (
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => abrirFormulario(item)}>
                            {item.entrevista?.estado === "Error" ? "Reintentar" : "Agendar entrevista"}
                          </button>
                        ) : item.entrevista?.estado === "Error" ? (
                          <span className="small text-danger">No se pudo completar la cita.</span>
                        ) : <span className="text-secondary">—</span>}
                      </td>
                    </tr>
                    {esAdmin && formularioId === item.id && (
                      <tr>
                        <td colSpan="4">
                          <form className="card card-body caja caja--azul p-3" onSubmit={(evento) => enviarEntrevista(evento, item)}>
                            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                              <h2 className="h5 mb-0">{item.entrevista?.estado === "Agendada" ? "Reprogramar entrevista" : "Agendar entrevista"}</h2>
                              <button type="button" className="btn-close" aria-label="Cerrar formulario" onClick={() => setFormularioId(null)} />
                            </div>
                            <p className="small text-secondary mb-2">{item.nombre} · {item.correo} · {item.ofertaTitulo}</p>
                            <div className="row g-2 align-items-end">
                              <div className="col-12 col-md-5">
                                <label className="form-label mb-1" htmlFor={`entrevista-fecha-${item.id}`}>Fecha y hora</label>
                                <input id={`entrevista-fecha-${item.id}`} type="datetime-local" className="form-control"
                                  value={fechaHora} min={fechaLocal(new Date().toISOString())} required
                                  onChange={(evento) => setFechaHora(evento.target.value)} />
                              </div>
                              <div className="col-6 col-md-3">
                                <label className="form-label mb-1" htmlFor={`entrevista-duracion-${item.id}`}>Duración</label>
                                <select id={`entrevista-duracion-${item.id}`} className="form-select" value={duracionMinutos}
                                  onChange={(evento) => setDuracionMinutos(evento.target.value)}>
                                  {[15, 30, 45, 60, 90, 120, 180].map((minutos) => <option key={minutos} value={minutos}>{minutos} minutos</option>)}
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
                {postulaciones.length === 0 && <tr><td colSpan="4" className="text-center text-secondary py-4">Aún no hay postulaciones recibidas.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
