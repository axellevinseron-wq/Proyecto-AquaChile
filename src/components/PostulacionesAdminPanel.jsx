import { useEffect, useState } from "react";
import { pedir } from "../api";

const ESTADOS = ["Recibida", "En revisión", "Entrevista", "Seleccionada", "No seleccionada"];

function PostulacionesAdminPanel() {
  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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
              <thead><tr><th>Postulante</th><th>Oferta</th><th>Fecha</th><th>Estado</th><th>Mensaje</th></tr></thead>
              <tbody>
                {postulaciones.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.nombre}</strong><small className="d-block"><a href={`mailto:${item.correo}`}>{item.correo}</a></small><small className="d-block text-secondary">{item.telefono}</small></td>
                    <td>{item.ofertaTitulo}</td>
                    <td>{new Date(item.fecha).toLocaleDateString("es-CL")}</td>
                    <td>
                      <label className="visually-hidden" htmlFor={`postulacion-estado-${item.id}`}>Estado de {item.nombre}</label>
                      <select id={`postulacion-estado-${item.id}`} className="form-select form-select-sm" value={item.estado} onChange={(evento) => cambiarEstado(item.id, evento.target.value)}>
                        {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
                      </select>
                    </td>
                    <td className="admin-empleos__mensaje">{item.mensaje || "—"}</td>
                  </tr>
                ))}
                {postulaciones.length === 0 && <tr><td colSpan="5" className="text-center text-secondary py-4">Aún no hay postulaciones recibidas.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default PostulacionesAdminPanel;
