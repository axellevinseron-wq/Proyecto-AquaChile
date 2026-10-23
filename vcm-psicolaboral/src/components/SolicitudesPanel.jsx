import { useMemo, useState } from "react";

const ESTADOS = ["Pendiente", "En proceso", "Finalizada"];

function claseEstado(estado) {
  switch (estado) {
    case "Pendiente":
      return "text-bg-warning";
    case "En proceso":
      return "text-bg-primary";
    case "Finalizada":
      return "text-bg-success";
    default:
      return "text-bg-secondary";
  }
}

function SolicitudesPanel({
  solicitudes,
  candidatos,
  onNuevaSolicitud,
  onCambiarEstado,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [formulario, setFormulario] = useState({
    candidatoId: "",
    cargo: "",
    familiaCargo: "",
    responsable: "",
  });

  const solicitudesFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");

    return solicitudes.filter((solicitud) => {
      const coincideTexto = [
        solicitud.candidato,
        solicitud.cargo,
        solicitud.familiaCargo,
        solicitud.responsable,
      ].some((valor) => (valor ?? "").toLocaleLowerCase("es").includes(termino));

      const coincideEstado = !filtroEstado || solicitud.estado === filtroEstado;
      return coincideTexto && coincideEstado;
    });
  }, [solicitudes, busqueda, filtroEstado]);

  function actualizarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));
    setMensaje("");
  }

  function seleccionarCandidato(evento) {
    const candidatoId = evento.target.value;
    const candidato = candidatos.find((item) => item.id === Number(candidatoId));

    setFormulario((formularioActual) => ({
      ...formularioActual,
      candidatoId,
      cargo: candidato?.cargo ?? "",
      familiaCargo: candidato?.familiaCargo ?? "",
    }));
    setMensaje("");
  }

  function enviarFormulario(evento) {
    evento.preventDefault();

    if (!formulario.candidatoId || !formulario.cargo.trim() || !formulario.familiaCargo.trim() || !formulario.responsable.trim()) {
      setMensaje("Completa todos los campos para crear la solicitud.");
      return;
    }

    onNuevaSolicitud(formulario);
    setFormulario({ candidatoId: "", cargo: "", familiaCargo: "", responsable: "" });
    setMostrarFormulario(false);
    setMensaje("La solicitud se agregó correctamente.");
  }

  return (
    <section id="solicitudes" className="mt-4" aria-labelledby="titulo-solicitudes">
      <div className="d-flex flex-column flex-md-row justify-content-between gap-2 mb-3">
        <div>
          <h2 id="titulo-solicitudes" className="h4 mb-1">
            Solicitudes de evaluación
          </h2>
          <p className="text-secondary small mb-0">
            Busca, filtra y actualiza el estado de las solicitudes de prueba.
          </p>
        </div>
        <button
          className="btn btn-primary align-self-start"
          type="button"
          onClick={() => {
            setMostrarFormulario((visible) => !visible);
            setMensaje("");
          }}
          aria-expanded={mostrarFormulario}
          aria-controls="formulario-solicitud"
        >
          {mostrarFormulario ? "Cancelar" : "Nueva solicitud"}
        </button>
      </div>

      {mensaje && (
        <div className="alert alert-info py-2" role="status">
          {mensaje}
        </div>
      )}

      {mostrarFormulario && (
        <form id="formulario-solicitud" className="card card-body mb-4" onSubmit={enviarFormulario}>
          <h3 className="h5 mb-3">Registrar solicitud</h3>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label htmlFor="candidatoId" className="form-label">Candidato</label>
              <select
                id="candidatoId"
                name="candidatoId"
                className="form-select"
                value={formulario.candidatoId}
                onChange={seleccionarCandidato}
                required
              >
                <option value="">Selecciona un candidato</option>
                {candidatos.map((candidato) => (
                  <option key={candidato.id} value={candidato.id}>
                    {candidato.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="cargo" className="form-label">Cargo al que postula</label>
              <input
                id="cargo"
                name="cargo"
                className="form-control"
                value={formulario.cargo}
                onChange={actualizarCampo}
                maxLength={100}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="familiaCargo" className="form-label">Familia de cargo</label>
              <input
                id="familiaCargo"
                name="familiaCargo"
                className="form-control"
                value={formulario.familiaCargo}
                onChange={actualizarCampo}
                maxLength={100}
                required
              />
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="responsable" className="form-label">Profesional responsable</label>
              <input
                id="responsable"
                name="responsable"
                className="form-control"
                value={formulario.responsable}
                onChange={actualizarCampo}
                maxLength={100}
                placeholder="Ej. Laura Pérez"
                required
              />
            </div>

            <div className="col-12 d-flex justify-content-end">
              <button className="btn btn-success" type="submit">
                Crear solicitud
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-8">
          <label htmlFor="buscarSolicitud" className="form-label visually-hidden">
            Buscar solicitudes
          </label>
          <input
            id="buscarSolicitud"
            type="search"
            className="form-control"
            placeholder="Buscar candidato, cargo o responsable..."
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>
        <div className="col-12 col-md-4">
          <label htmlFor="filtroEstado" className="form-label visually-hidden">
            Filtrar por estado
          </label>
          <select
            id="filtroEstado"
            className="form-select"
            value={filtroEstado}
            onChange={(evento) => setFiltroEstado(evento.target.value)}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-responsive bg-white border rounded-3">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th scope="col">Candidato</th>
              <th scope="col">Cargo</th>
              <th scope="col">Estado</th>
              <th scope="col" className="d-none d-lg-table-cell">Responsable</th>
              <th scope="col" className="d-none d-md-table-cell">Fecha</th>
              <th scope="col">Actualizar estado</th>
            </tr>
          </thead>
          <tbody>
            {solicitudesFiltradas.map((solicitud) => (
              <tr key={solicitud.id}>
                <td>{solicitud.candidato}</td>
                <td>
                  <span>{solicitud.cargo}</span>
                  <span className="d-block small text-secondary">{solicitud.familiaCargo}</span>
                </td>
                <td>
                  <span className={`badge ${claseEstado(solicitud.estado)}`}>
                    {solicitud.estado}
                  </span>
                </td>
                <td className="d-none d-lg-table-cell">{solicitud.responsable}</td>
                <td className="d-none d-md-table-cell">{solicitud.fechaSolicitud}</td>
                <td>
                  <label className="visually-hidden" htmlFor={`estado-${solicitud.id}`}>
                    Cambiar estado de la solicitud de {solicitud.candidato}
                  </label>
                  <select
                    id={`estado-${solicitud.id}`}
                    className="form-select form-select-sm status-select"
                    value={solicitud.estado}
                    onChange={(evento) => onCambiarEstado(solicitud.id, evento.target.value)}
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}

            {solicitudesFiltradas.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center text-secondary py-4">
                  No hay solicitudes que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="small text-secondary mt-2 mb-0">
        Mostrando {solicitudesFiltradas.length} de {solicitudes.length} solicitudes.
      </p>
    </section>
  );
}

export default SolicitudesPanel;
