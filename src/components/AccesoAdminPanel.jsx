import { useMemo, useState } from "react";
import { useToast } from "./Toast";
import {
  agregarComentarioAcceso,
  cambiarEstadoAcceso,
  ESTADOS_ACCESO,
  leerSolicitudesAcceso,
  nombreCompleto,
} from "../auth";
import { useDatosAcceso } from "../useDatosAcceso";

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function claseEstado(estado) {
  if (estado === "Aceptada") return "text-bg-success";
  if (estado === "Rechazada") return "text-bg-danger";
  return "text-bg-warning";
}

function TarjetaSolicitud({ solicitud }) {
  const { notificar } = useToast();
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState("");

  async function cambiarEstado(estado) {
    const resultado = await cambiarEstadoAcceso(solicitud.id, estado);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setError("");
    notificar(`Solicitud de ${solicitud.usuario} marcada como ${estado.toLowerCase()}.`);
  }

  async function comentar(evento) {
    evento.preventDefault();
    const resultado = await agregarComentarioAcceso(solicitud.id, comentario);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setError("");
    setComentario("");
    notificar("Comentario agregado. El solicitante ya puede verlo.");
  }

  return (
    <article className="acceso-tarjeta">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div>
          <h3 className="h6 mb-0">{nombreCompleto(solicitud)}</h3>
          <small className="text-secondary">
            @{solicitud.usuario} · {solicitud.correo} · {formatearFecha(solicitud.fecha)}
          </small>
          {(solicitud.rut || solicitud.telefono) && (
            <small className="d-block text-secondary">
              RUT {solicitud.rut || "—"} · Teléfono {solicitud.telefono || "—"}
            </small>
          )}
        </div>
        <span className={`badge ${claseEstado(solicitud.estado)}`}>{solicitud.estado}</span>
      </div>

      {solicitud.motivo && <p className="small mt-2 mb-2">{solicitud.motivo}</p>}

      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <span className="small text-secondary">Cambiar estado:</span>
        {ESTADOS_ACCESO.map((estado) => (
          <button
            key={estado}
            type="button"
            className={`btn btn-sm ${solicitud.estado === estado ? "btn-secondary" : "btn-outline-secondary"}`}
            disabled={solicitud.estado === estado}
            onClick={() => cambiarEstado(estado)}
            aria-label={`Marcar solicitud de ${solicitud.usuario} como ${estado}`}
          >
            {estado}
          </button>
        ))}
      </div>

      {solicitud.estado === "Aceptada" && solicitud.credenciales && (
        <p className="small mb-2">
          Cuenta creada: <strong>{solicitud.credenciales.usuario}</strong> (la contraseña generada la ve el solicitante).
        </p>
      )}

      {solicitud.comentarios.length > 0 && (
        <ul className="pub-comentarios mb-2">
          {solicitud.comentarios.map((c, i) => (
            <li key={i} className={c.sistema ? "pub-comentarios__sistema" : ""}>
              <span className="pub-comentarios__meta">
                {c.autor} · {formatearFecha(c.fecha)}
              </span>
              {c.texto}
            </li>
          ))}
        </ul>
      )}

      <form className="d-flex flex-column flex-md-row gap-2" onSubmit={comentar}>
        <label className="visually-hidden" htmlFor={`comentario-${solicitud.id}`}>
          Comentario para {solicitud.usuario}
        </label>
        <input
          id={`comentario-${solicitud.id}`}
          className="form-control form-control-sm"
          placeholder="Escribe un comentario visible para el solicitante..."
          value={comentario}
          onChange={(e) => {
            setComentario(e.target.value);
            setError("");
          }}
        />
        <button type="submit" className="btn btn-primary btn-sm text-nowrap">
          Comentar
        </button>
      </form>
      {error && (
        <p className="text-danger small mt-2 mb-0" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

// Solo para administradores: gestiona las solicitudes de acceso enviadas desde la página pública.
function AccesoAdminPanel() {
  const version = useDatosAcceso();
  const [filtro, setFiltro] = useState("");

  const solicitudes = useMemo(
    () => [...leerSolicitudesAcceso()].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    // `version` cambia cuando el almacenamiento se modifica
    [version],
  );
  const visibles = filtro ? solicitudes.filter((s) => s.estado === filtro) : solicitudes;

  return (
    <section aria-labelledby="titulo-acceso">
      <div className="card card-body caja caja--azul">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 id="titulo-acceso" className="h4 mb-1">Solicitudes de acceso</h2>
            <p className="text-secondary small mb-0">
              Cambia el estado y deja comentarios: el solicitante los ve en la página de estado de solicitud.
            </p>
          </div>
          <div>
            <label htmlFor="filtro-acceso" className="visually-hidden">Filtrar por estado</label>
            <select id="filtro-acceso" className="form-select form-select-sm" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_ACCESO.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>

        {visibles.length === 0 ? (
          <p className="text-secondary mb-0">No hay solicitudes para mostrar.</p>
        ) : (
          <div className="acceso-lista">
            {visibles.map((s) => (
              <TarjetaSolicitud key={s.id} solicitud={s} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default AccesoAdminPanel;
