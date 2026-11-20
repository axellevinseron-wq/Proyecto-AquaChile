import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../apiClient";

const ESTADOS = ["Pendiente", "En proceso", "Finalizada"];
const normalizar = (valor) => {
  const v = String(valor || "").toUpperCase();
  if (v.includes("FINAL") || v.includes("COMPLET")) return "Finalizada";
  if (v.includes("PROCES") || v.includes("EVALUACION")) return "En proceso";
  return "Pendiente";
};
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const estadoApi = (v) => ({ Pendiente: "PENDIENTE", "En proceso": "EN_PROCESO", Finalizada: "FINALIZADA" })[v];

export default function GestionPostgreSQL({ vista, sesion }) {
  const [datos, setDatos] = useState({ postulantes: [], postulaciones: [], ofertas: [], solicitudes: [] });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [formCandidato, setFormCandidato] = useState(false);
  const [formSolicitud, setFormSolicitud] = useState(false);
  const [candidato, setCandidato] = useState({ nombre: "", correo: "", telefono: "", rut: "" });
  const [solicitud, setSolicitud] = useState({ postulacionId: "", evaluadorId: "", observaciones: "" });
  const [guardando, setGuardando] = useState(false);

  async function actualizar() {
    setCargando(true);
    setError("");
    try {
      const [postulantes, postulaciones, ofertas, solicitudes] = await Promise.all([
        apiFetch("/api/postulantes"), apiFetch("/api/postulaciones"),
        apiFetch("/api/ofertas"), apiFetch("/api/solicitudes"),
      ]);
      setDatos({ postulantes, postulaciones, ofertas, solicitudes });
    } catch (e) { setError(e.message || "No fue posible cargar PostgreSQL."); }
    finally { setCargando(false); }
  }
  useEffect(() => { actualizar(); }, []);

  const personas = useMemo(() => new Map(datos.postulantes.map(p => [p.id, p])), [datos.postulantes]);
  const ofertas = useMemo(() => new Map(datos.ofertas.map(o => [o.id, o])), [datos.ofertas]);
  const postulaciones = useMemo(() => datos.postulaciones.map(p => ({
    ...p, persona: personas.get(p.postulanteId), oferta: ofertas.get(p.ofertaId),
    solicitud: datos.solicitudes.find(s => s.postulacionId === p.id),
  })), [datos, personas, ofertas]);
  const filasCandidatos = useMemo(() => datos.postulantes.filter(p =>
    `${p.nombre} ${p.correo}`.toLowerCase().includes(busqueda.toLowerCase())
  ), [datos.postulantes, busqueda]);
  const filasSolicitudes = useMemo(() => datos.solicitudes.map(s => ({
    ...s, postulacion: postulaciones.find(p => p.id === s.postulacionId),
  })).filter(s => `${s.postulacion?.persona?.nombre || ""} ${s.postulacion?.oferta?.titulo || ""} ${s.estado}`.toLowerCase().includes(busqueda.toLowerCase())), [datos.solicitudes, postulaciones, busqueda]);

  async function ejecutar(accion, mensaje) {
    setGuardando(true); setError(""); setAviso("");
    try { await accion(); await actualizar(); setAviso(mensaje); return true; }
    catch (e) { setError(e.message || "No fue posible guardar."); return false; }
    finally { setGuardando(false); }
  }
  async function agregarCandidato(e) {
    e.preventDefault();
    if (datos.postulantes.some(p => p.correo?.toLowerCase() === candidato.correo.trim().toLowerCase())) {
      setError("Ya existe un candidato con ese correo."); return;
    }
    if (await ejecutar(() => apiFetch("/api/postulantes", { method: "POST", body: JSON.stringify(candidato) }), "Candidato guardado en PostgreSQL.")) {
      setFormCandidato(false);
      setCandidato({ nombre: "", correo: "", telefono: "", rut: "" });
    }
  }
  async function agregarSolicitud(e) {
    e.preventDefault();
    const body = { postulacionId: solicitud.postulacionId, evaluadorId: solicitud.evaluadorId || null,
      observaciones: solicitud.observaciones, estado: "PENDIENTE", fechaSolicitud: hoy(), fechaEvaluacion: null };
    if (await ejecutar(() => apiFetch("/api/solicitudes", { method: "POST", body: JSON.stringify(body) }), "Solicitud de evaluación guardada en PostgreSQL.")) setFormSolicitud(false);
  }
  async function cambiarEstado(s, estado) {
    const body = { postulacionId: s.postulacionId, evaluadorId: s.evaluadorId || null,
      observaciones: s.observaciones || "", estado: estadoApi(estado), fechaSolicitud: s.fechaSolicitud || hoy(),
      fechaEvaluacion: estado === "Finalizada" ? hoy() : s.fechaEvaluacion || null };
    await ejecutar(() => apiFetch(`/api/solicitudes/${s.id}`, { method: "PUT", body: JSON.stringify(body) }), "Estado actualizado en PostgreSQL.");
  }
  const campo = (label, name, valor, setter, requerido = false) => (
    <label className="form-label d-block" key={name}>{label}
      <input className="form-control" value={valor[name]} required={requerido}
        onChange={e => setter(prev => ({ ...prev, [name]: e.target.value }))} />
    </label>
  );
  return <section>
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 className="h3 mb-0">{vista === "candidatos" ? "Candidatos" : "Solicitudes de evaluación"}</h1>
      <button className="btn btn-outline-primary btn-sm" onClick={actualizar}>Actualizar desde PostgreSQL</button>
    </div>
    {error && <div role="alert" className="alert alert-danger">{error}</div>}
    {aviso && <div role="status" className="alert alert-success">{aviso}</div>}
    {cargando && <p role="status">Cargando registros reales…</p>}
    {!cargando && <>
      <div className="card card-body caja caja--azul mb-3">
        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
          <input aria-label="Buscar registros" className="form-control" style={{ maxWidth: 390 }} placeholder="Buscar por nombre, correo, oferta o estado" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {vista === "candidatos" ? <button className="btn btn-success" onClick={() => setFormCandidato(v => !v)}>+ Agregar candidato</button>
            : <button className="btn btn-success" onClick={() => setFormSolicitud(v => !v)}>+ Nueva solicitud</button>}
        </div>
        {vista === "candidatos" && formCandidato && <form onSubmit={agregarCandidato} className="border rounded p-3 mb-3">
          <h2 className="h5">Registrar postulante en PostgreSQL</h2>
          {campo("Nombre completo", "nombre", candidato, setCandidato, true)}
          {campo("Correo", "correo", candidato, setCandidato, true)}
          {campo("Teléfono", "telefono", candidato, setCandidato)}
          {campo("RUT", "rut", candidato, setCandidato)}
          <button className="btn btn-primary" disabled={guardando}>Guardar candidato</button>
        </form>}
        {vista === "solicitudes" && formSolicitud && <form onSubmit={agregarSolicitud} className="border rounded p-3 mb-3">
          <h2 className="h5">Crear solicitud de evaluación</h2>
          <label className="form-label d-block">Postulación
            <select className="form-select" required value={solicitud.postulacionId} onChange={e => setSolicitud(s => ({ ...s, postulacionId: e.target.value }))}>
              <option value="">Seleccionar postulación</option>
              {postulaciones.filter(p => !p.solicitud).map(p => <option key={p.id} value={p.id}>{p.persona?.nombre || "Postulante"} — {p.oferta?.titulo || "Oferta"}</option>)}
            </select>
          </label>
          <label className="form-label d-block">Observaciones
            <textarea className="form-control" value={solicitud.observaciones} onChange={e => setSolicitud(s => ({ ...s, observaciones: e.target.value }))}/>
          </label>
          <p className="small text-secondary">El evaluador se podrá asignar posteriormente. Se registra con estado Pendiente.</p>
          <button className="btn btn-primary" disabled={guardando}>Guardar solicitud</button>
        </form>}
        {vista === "candidatos" ? <>
          <p className="text-secondary small">{datos.postulantes.length} postulantes registrados en PostgreSQL.</p>
          <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th>Nombre</th><th>Correo</th><th>RUT</th><th>Postulaciones</th></tr></thead><tbody>
            {filasCandidatos.map(p => <tr key={p.id}><td>{p.nombre}</td><td>{p.correo}</td><td>{p.rut || "—"}</td><td>{postulaciones.filter(x => x.postulanteId === p.id).length}</td></tr>)}
          </tbody></table></div>
        </> : <>
          <p className="text-secondary small">{datos.solicitudes.length} solicitudes de evaluación y {postulaciones.length} postulaciones reales. Las postulaciones sin solicitud aún pueden evaluarse con IA.</p>
          <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th>Postulante</th><th>Oferta</th><th>Estado</th><th>Fecha</th><th>Actualizar estado</th></tr></thead><tbody>
            {filasSolicitudes.map(s => <tr key={s.id}><td>{s.postulacion?.persona?.nombre || "Postulante"}</td><td>{s.postulacion?.oferta?.titulo || "Oferta"}</td><td>{normalizar(s.estado)}</td><td>{s.fechaSolicitud || "—"}</td><td><select aria-label={`Estado de ${s.postulacion?.persona?.nombre || s.id}`} className="form-select form-select-sm" disabled={guardando} value={normalizar(s.estado)} onChange={e => cambiarEstado(s, e.target.value)}>{ESTADOS.map(v => <option key={v}>{v}</option>)}</select></td></tr>)}
          </tbody></table></div>
          {filasSolicitudes.length === 0 && <p>No hay solicitudes de evaluación registradas. Puedes crear una a partir de una postulación.</p>}
        </>}
      </div>
    </>}
  </section>;
}
