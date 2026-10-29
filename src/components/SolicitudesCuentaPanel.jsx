import { useEffect, useState } from "react";

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

// Lista de cuentas pedidas desde el login, con botones para aceptarlas o cancelarlas.
function SolicitudesCuentaPanel({ solicitudes, onResolver }) {
  const pendientes = solicitudes.filter((s) => s.estado === "Pendiente");
  const [verId, setVerId] = useState(null);
  const [aviso, setAviso] = useState("");
  const seleccionada = pendientes.find((s) => s.id === verId);

  // Escape cierra la ventana de información.
  useEffect(() => {
    if (!seleccionada) {
      return undefined;
    }
    function cerrarConEscape(evento) {
      if (evento.key === "Escape") {
        setVerId(null);
      }
    }
    document.addEventListener("keydown", cerrarConEscape);
    return () => document.removeEventListener("keydown", cerrarConEscape);
  }, [seleccionada]);

  function resolver(solicitud, decision) {
    onResolver(solicitud.id, decision);
    setVerId(null);
    setAviso(
      decision === "aceptar"
        ? `Cuenta de ${solicitud.usuario} aceptada: ya puede ingresar.`
        : `Solicitud de ${solicitud.usuario} cancelada.`,
    );
  }

  return (
    <div>
      {aviso && (
        <div className="alert alert-info py-2 small" role="status">
          {aviso}
        </div>
      )}

      {pendientes.length === 0 ? (
        <p className="text-secondary mb-0">No hay solicitudes de cuenta pendientes.</p>
      ) : (
        <ul className="lista-cuentas">
          {pendientes.map((s) => (
            <li key={s.id}>
              <span>
                <strong>{s.nombre}</strong>
                <small className="d-block text-secondary">
                  @{s.usuario} · {formatearFecha(s.fecha)}
                </small>
              </span>
              <span className="d-flex flex-wrap gap-1">
                <button type="button" className="btn btn-success btn-sm" onClick={() => resolver(s, "aceptar")}>
                  Aceptar
                </button>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => resolver(s, "cancelar")}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setVerId(s.id)}>
                  Ver información
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {seleccionada && (
        <div className="ventana-fondo" onClick={() => setVerId(null)}>
          <div
            className="ventana"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ventana-titulo"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="ventana__cabecera">
              <h3 className="h5 mb-0" id="ventana-titulo">Información de la solicitud</h3>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setVerId(null)} />
            </div>

            <dl className="ventana__datos">
              <dt>Nombre</dt>
              <dd>{seleccionada.nombre}</dd>
              <dt>Correo</dt>
              <dd>{seleccionada.correo}</dd>
              <dt>Usuario</dt>
              <dd>{seleccionada.usuario}</dd>
              <dt>Enviada</dt>
              <dd>{formatearFecha(seleccionada.fecha)}</dd>
              <dt>Estado</dt>
              <dd>{seleccionada.estado}</dd>
            </dl>

            <div className="d-flex flex-wrap gap-2 justify-content-end">
              <button type="button" className="btn btn-success btn-sm" onClick={() => resolver(seleccionada, "aceptar")}>
                Aceptar
              </button>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => resolver(seleccionada, "cancelar")}>
                Cancelar
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVerId(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SolicitudesCuentaPanel;
