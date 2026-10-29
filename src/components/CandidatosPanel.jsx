import { useState } from "react";
import BarrasEstado from "./BarrasEstado";
import Icon from "./Icon";
import { claveFecha } from "../fechas";
import { filtrarCandidatos, validarCandidato } from "../logica";

const FORMULARIO_VACIO = { nombre: "", correo: "", cargo: "", familiaCargo: "" };
const ESTADOS = ["Pendiente", "En proceso", "Finalizada", "Sin solicitud"];

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

// A la izquierda, resumen de las solicitudes del mes; a la derecha, la tabla de candidatos.
function CandidatosPanel({ candidatos, solicitudes, onNuevoCandidato }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const hoy = new Date();
  const prefijoMes = claveFecha(hoy).slice(0, 7);
  const nombreMes = hoy.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  const delMes = solicitudes.filter((s) => s.fechaSolicitud.startsWith(prefijoMes));

  const porDia = {};
  delMes.forEach((s) => {
    porDia[s.fechaSolicitud] = (porDia[s.fechaSolicitud] ?? 0) + 1;
  });
  const maximo = Math.max(0, ...Object.values(porDia));
  const diasTop = Object.keys(porDia)
    .filter((fecha) => porDia[fecha] === maximo)
    .sort()
    .map((fecha) => Number(fecha.slice(8)));

  const sinSolicitud = candidatos.filter((c) => c.estado === "Sin solicitud").length;

  const filtrados = filtrarCandidatos(candidatos, busqueda, filtroEstado);

  function actualizarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
    setError("");
  }

  function enviar(evento) {
    evento.preventDefault();

    const { nombre } = formulario;
    const errorFormulario = validarCandidato(formulario);
    if (errorFormulario) {
      setError(errorFormulario);
      return;
    }

    const resultado = onNuevoCandidato(formulario);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setAviso(`Candidato ${nombre.trim()} agregado.`);
    setFormulario(FORMULARIO_VACIO);
    setMostrarFormulario(false);
  }

  return (
    <section aria-labelledby="titulo-candidatos">
      <h1 className="h3 mb-3" id="titulo-candidatos">Candidatos</h1>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card card-body caja caja--azul h-100">
            <h2 className="h5 mb-0">Solicitudes del mes</h2>
            <p className="text-secondary small mes-titulo mb-3">{nombreMes}</p>

            <p className="display-5 fw-bold mb-0">{delMes.length}</p>
            <p className="text-secondary mb-3">
              {delMes.length === 1 ? "solicitud enviada" : "solicitudes enviadas"}
            </p>

            <BarrasEstado solicitudes={delMes} />

            <ul className="resumen-mes">
              <li>
                <span>Candidatos sin solicitud</span>
                <strong>{sinSolicitud}</strong>
              </li>
              <li>
                <span>Día con más solicitudes</span>
                <strong>{maximo > 0 ? `${diasTop.join(", ")} (${maximo})` : "—"}</strong>
              </li>
              <li>
                <span>Candidatos registrados</span>
                <strong>{candidatos.length}</strong>
              </li>
            </ul>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="card card-body caja caja--azul">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
              <h2 className="h5 mb-0">Candidatos registrados</h2>
              <button
                type="button"
                className="btn btn-success d-inline-flex align-items-center gap-1"
                onClick={() => {
                  setMostrarFormulario((abierto) => !abierto);
                  setAviso("");
                  setError("");
                }}
              >
                <Icon nombre="plus" size={16} /> {mostrarFormulario ? "Cancelar" : "Agregar candidato"}
              </button>
            </div>

            {aviso && (
              <div className="alert alert-success py-2" role="status">
                {aviso}
              </div>
            )}

            {mostrarFormulario && (
              <form className="border rounded p-3 mb-3 bg-body-tertiary" onSubmit={enviar} noValidate>
                <h3 className="h6 mb-3">Nuevo candidato</h3>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label htmlFor="cand-nombre" className="form-label">Nombre completo</label>
                    <input id="cand-nombre" name="nombre" className="form-control" value={formulario.nombre} onChange={actualizarCampo} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label htmlFor="cand-correo" className="form-label">Correo</label>
                    <input id="cand-correo" name="correo" type="email" className="form-control" value={formulario.correo} onChange={actualizarCampo} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label htmlFor="cand-cargo" className="form-label">Cargo</label>
                    <input id="cand-cargo" name="cargo" className="form-control" value={formulario.cargo} onChange={actualizarCampo} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label htmlFor="cand-familia" className="form-label">Familia de cargo</label>
                    <input id="cand-familia" name="familiaCargo" className="form-control" value={formulario.familiaCargo} onChange={actualizarCampo} />
                  </div>
                </div>

                {error && (
                  <p className="text-danger small mt-3 mb-0" role="alert">
                    {error}
                  </p>
                )}

                <div className="mt-3">
                  <button type="submit" className="btn btn-primary">
                    Guardar candidato
                  </button>
                </div>
              </form>
            )}

            <div className="row g-2 mb-3">
              <div className="col-12 col-md-8">
                <label className="visually-hidden" htmlFor="cand-buscar">Buscar candidato</label>
                <input
                  id="cand-buscar"
                  className="form-control"
                  placeholder="Buscar candidato, correo o cargo..."
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="visually-hidden" htmlFor="cand-estado">Filtrar por estado</label>
                <select
                  id="cand-estado"
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

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 tabla-sgsst">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Candidato</th>
                    <th scope="col" className="d-none d-md-table-cell">Cargo</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-secondary py-4">
                        No hay candidatos que coincidan.
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((c, indice) => (
                      <tr key={c.id}>
                        <td>{indice + 1}</td>
                        <td>
                          {c.nombre}
                          <small className="d-block text-secondary">{c.correo}</small>
                        </td>
                        <td className="d-none d-md-table-cell">
                          {c.cargo}
                          <small className="d-block text-secondary">{c.familiaCargo}</small>
                        </td>
                        <td>
                          <span className={`badge ${claseEstado(c.estado)}`}>{c.estado}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="small text-secondary mt-2 mb-0">
              Mostrando {filtrados.length} de {candidatos.length} candidatos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CandidatosPanel;