import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function OportunidadesPage() {
  const [ofertas, setOfertas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/api/publico/ofertas`, { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error("No se pudieron cargar las ofertas"); return r.json(); })
      .then(setOfertas)
      .catch((e) => { if (e.name !== "AbortError") setMensaje(e.message); })
      .finally(() => setCargando(false));
    return () => controller.abort();
  }, []);
  const filtradas = useMemo(() => ofertas.filter((o) =>
    `${o.titulo} ${o.ubicacion} ${o.descripcion}`.toLowerCase().includes(busqueda.toLowerCase())
  ), [ofertas, busqueda]);
  async function postular(evento) {
    evento.preventDefault();
    setMensaje("");
    const form = new FormData(evento.currentTarget);
    if (!form.get("cv")?.size) { setMensaje("Adjunta tu CV de prueba."); return; }
    try {
      const response = await fetch(`${API}/api/publico/postulaciones`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No fue posible enviar la postulación");
      setMensaje(`Postulación recibida. Código: ${data.postulacionId}`);
      setSeleccion(null);
    } catch (error) { setMensaje(error.message); }
  }
  return (
    <main className="container py-5" style={{ maxWidth: 900 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Oportunidades laborales</h1><Link to="/inicio">Acceso interno</Link>
      </div>
      <p>Explora las ofertas publicadas y postula con antecedentes ficticios para la demostración.</p>
      <label htmlFor="buscar-ofertas" className="form-label">Buscar por cargo o ubicación</label>
      <input id="buscar-ofertas" className="form-control mb-4" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      {cargando && <p>Cargando ofertas…</p>}
      {mensaje && <div role="status" className="alert alert-info">{mensaje}</div>}
      {!cargando && filtradas.length === 0 && <p>No hay ofertas disponibles.</p>}
      <div className="row g-3">
        {filtradas.map(o => <div className="col-md-6" key={o.id}><article className="card h-100"><div className="card-body">
          <h2 className="h5">{o.titulo}</h2><p>{o.ubicacion}</p><p>{o.descripcion}</p>
          <button className="btn btn-primary" onClick={() => { setSeleccion(o); setMensaje(""); }}>Ver detalle y postular</button>
        </div></article></div>)}
      </div>
      {seleccion && <section className="card mt-4" aria-label="Formulario de postulación"><div className="card-body">
        <h2 className="h4">Postular a {seleccion.titulo}</h2><p>{seleccion.descripcion}</p>
        <form onSubmit={postular}>
          <input type="hidden" name="ofertaId" value={seleccion.id} />
          <label className="form-label" htmlFor="post-nombre">Nombre</label>
          <input className="form-control mb-2" id="post-nombre" name="nombre" required maxLength={150} />
          <label className="form-label" htmlFor="post-correo">Correo</label>
          <input className="form-control mb-2" id="post-correo" name="correo" type="email" required />
          <label className="form-label" htmlFor="post-telefono">Teléfono</label>
          <input className="form-control mb-2" id="post-telefono" name="telefono" />
          <label className="form-label" htmlFor="post-rut">RUT</label>
          <input className="form-control mb-2" id="post-rut" name="rut" />
          <label className="form-label" htmlFor="post-cv">CV de prueba (PDF o DOCX, máximo 5 MB)</label>
          <input className="form-control mb-3" id="post-cv" name="cv" type="file" accept=".pdf,.docx" required />
          <button className="btn btn-success" type="submit">Enviar postulación</button>{" "}
          <button className="btn btn-outline-secondary" type="button" onClick={() => setSeleccion(null)}>Cancelar</button>
        </form>
      </div></section>}
    </main>
  );
}
