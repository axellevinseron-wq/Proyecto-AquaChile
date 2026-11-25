import { useEffect, useState } from "react";
import { pedir } from "../api";

const FORMULARIO_VACIO = {
  titulo: "",
  area: "",
  ubicacion: "",
  modalidad: "Presencial",
  jornada: "Jornada completa",
  descripcion: "",
  requisitos: "",
  fechaCierre: "",
  estado: "Publicada",
};

function OfertasAdminPanel() {
  const [ofertas, setOfertas] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [editando, setEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function cargar() {
    const [respuestaOfertas, respuestaPostulaciones] = await Promise.all([
      pedir("GET", "/admin/ofertas"),
      pedir("GET", "/admin/postulaciones"),
    ]);
    if (!respuestaOfertas.ok || !respuestaPostulaciones.ok) {
      setError(respuestaOfertas.datos?.error ?? respuestaPostulaciones.datos?.error ?? "No se pudieron cargar los datos.");
      setCargando(false);
      return;
    }
    setOfertas(respuestaOfertas.datos.items);
    setPostulaciones(respuestaPostulaciones.datos.items);
    setError("");
    setCargando(false);
  }

  useEffect(() => {
    let activo = true;
    Promise.all([
      pedir("GET", "/admin/ofertas"),
      pedir("GET", "/admin/postulaciones"),
    ]).then(([respuestaOfertas, respuestaPostulaciones]) => {
      if (!activo) return;
      if (!respuestaOfertas.ok || !respuestaPostulaciones.ok) {
        setError(respuestaOfertas.datos?.error ?? respuestaPostulaciones.datos?.error ?? "No se pudieron cargar los datos.");
        setCargando(false);
        return;
      }
      setOfertas(respuestaOfertas.datos.items);
      setPostulaciones(respuestaPostulaciones.datos.items);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  function iniciarNueva() {
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setMostrarFormulario(true);
    setError("");
    setAviso("");
  }

  function iniciarEdicion(oferta) {
    setEditando(oferta.id);
    setFormulario({
      titulo: oferta.titulo,
      area: oferta.area,
      ubicacion: oferta.ubicacion,
      modalidad: oferta.modalidad,
      jornada: oferta.jornada,
      descripcion: oferta.descripcion,
      requisitos: oferta.requisitos,
      fechaCierre: oferta.fechaCierre,
      estado: oferta.estado,
    });
    setMostrarFormulario(true);
    setError("");
    setAviso("");
  }

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    const respuesta = await pedir(
      editando ? "PATCH" : "POST",
      editando ? `/admin/ofertas/${editando}` : "/admin/ofertas",
      formulario,
    );
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.datos?.error ?? "No se pudo guardar la oferta.");
      return;
    }
    setMostrarFormulario(false);
    setEditando(null);
    setFormulario(FORMULARIO_VACIO);
    setAviso(editando ? "Oferta actualizada." : "Oferta creada.");
    await cargar();
  }

  async function cambiarEstado(oferta) {
    const estado = oferta.estado === "Publicada" ? "Cerrada" : "Publicada";
    const respuesta = await pedir("PATCH", `/admin/ofertas/${oferta.id}`, { ...oferta, estado });
    if (!respuesta.ok) {
      setError(respuesta.datos?.error ?? "No se pudo actualizar la oferta.");
      return;
    }
    setAviso(`Oferta ${estado === "Cerrada" ? "cerrada" : "publicada"}.`);
    setError("");
    await cargar();
  }

  function postulacionesDe(ofertaId) {
    return postulaciones.filter((item) => item.ofertaId === ofertaId).length;
  }

  return (
    <section className="admin-empleos" aria-labelledby="titulo-admin-ofertas">
      <div className="admin-empleos__encabezado">
        <div>
          <h1 className="h3 mb-1" id="titulo-admin-ofertas">Ofertas de trabajo</h1>
          <p className="text-secondary mb-0">Publica oportunidades y administra su vigencia.</p>
        </div>
        <button type="button" className="btn btn-success" onClick={iniciarNueva}>Nueva oferta</button>
      </div>

      {aviso && <p className="alert alert-success py-2" role="status">{aviso}</p>}
      {error && <p className="alert alert-danger py-2" role="alert">{error}</p>}

      {mostrarFormulario && (
        <form className="card card-body caja caja--azul mb-3" onSubmit={guardar}>
          <h2 className="h5">{editando ? "Editar oferta" : "Crear oferta"}</h2>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="oferta-titulo">Cargo</label>
              <input id="oferta-titulo" className="form-control" value={formulario.titulo} maxLength={160} required onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="oferta-area">Área</label>
              <input id="oferta-area" className="form-control" value={formulario.area} maxLength={160} required onChange={(e) => setFormulario({ ...formulario, area: e.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="oferta-ubicacion">Ubicación</label>
              <input id="oferta-ubicacion" className="form-control" value={formulario.ubicacion} maxLength={160} required onChange={(e) => setFormulario({ ...formulario, ubicacion: e.target.value })} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="oferta-modalidad">Modalidad</label>
              <select id="oferta-modalidad" className="form-select" value={formulario.modalidad} onChange={(e) => setFormulario({ ...formulario, modalidad: e.target.value })}>
                <option>Presencial</option><option>Híbrida</option><option>Remota</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="oferta-jornada">Jornada</label>
              <input id="oferta-jornada" className="form-control" value={formulario.jornada} maxLength={160} required onChange={(e) => setFormulario({ ...formulario, jornada: e.target.value })} />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="oferta-descripcion">Descripción</label>
              <textarea id="oferta-descripcion" className="form-control" rows="4" value={formulario.descripcion} maxLength={5000} required onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="oferta-requisitos">Requisitos</label>
              <textarea id="oferta-requisitos" className="form-control" rows="3" value={formulario.requisitos} maxLength={5000} onChange={(e) => setFormulario({ ...formulario, requisitos: e.target.value })} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="oferta-cierre">Cierre de postulaciones</label>
              <input id="oferta-cierre" type="date" className="form-control" value={formulario.fechaCierre} onChange={(e) => setFormulario({ ...formulario, fechaCierre: e.target.value })} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label" htmlFor="oferta-estado">Estado</label>
              <select id="oferta-estado" className="form-select" value={formulario.estado} onChange={(e) => setFormulario({ ...formulario, estado: e.target.value })}>
                <option>Publicada</option><option>Borrador</option><option>Cerrada</option>
              </select>
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? "Guardando..." : "Guardar oferta"}</button>
          </div>
        </form>
      )}

      {cargando ? (
        <p role="status">Cargando ofertas...</p>
      ) : (
        <div className="card card-body caja caja--azul">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead><tr><th>Oferta</th><th>Ubicación</th><th>Estado</th><th>Postulaciones</th><th>Acciones</th></tr></thead>
              <tbody>
                {ofertas.map((oferta) => (
                  <tr key={oferta.id}>
                    <td><strong>{oferta.titulo}</strong><small className="d-block text-secondary">{oferta.area}</small></td>
                    <td>{oferta.ubicacion}</td>
                    <td><span className={`badge ${oferta.estado === "Publicada" ? "text-bg-success" : oferta.estado === "Cerrada" ? "text-bg-secondary" : "text-bg-warning"}`}>{oferta.estado}</span></td>
                    <td>{postulacionesDe(oferta.id)}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => iniciarEdicion(oferta)}>Editar</button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => cambiarEstado(oferta)}
                        >
                          {oferta.estado === "Publicada" ? "Cerrar" : "Publicar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ofertas.length === 0 && <tr><td colSpan="5" className="text-center text-secondary py-4">Aún no hay ofertas.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default OfertasAdminPanel;
