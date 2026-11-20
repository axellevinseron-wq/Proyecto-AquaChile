import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "./Toast";
import { apiFetch, leerSesionApi } from "../apiClient";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const ESTADOS = ["PENDIENTE", "ACEPTADA", "RECHAZADA"];
const ETIQUETAS = { PENDIENTE: "Pendiente", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada" };
const CLASES = { PENDIENTE: "text-bg-warning", ACEPTADA: "text-bg-success", RECHAZADA: "text-bg-danger" };

function fecha(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}
function normalizar(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function nombre(s) { return `${s.nombre ?? ""} ${s.apellido ?? ""}`.trim(); }

export default function AccesoAdminPanel() {
  const { notificar } = useToast();
  const [solicitudes, setSolicitudes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("");
  const [seleccionId, setSeleccionId] = useState(null);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [rolNuevo, setRolNuevo] = useState("EVALUADOR");
  const [credenciales, setCredenciales] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const datos = await apiFetch("/api/admin/solicitudes-acceso");
      setSolicitudes(Array.isArray(datos) ? datos : []);
      setError("");
    } catch (e) { setError(e.message || "No se pudieron cargar las solicitudes."); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => solicitudes.filter((s) => {
    if (filtro && s.estado !== filtro) return false;
    const q = normalizar(busqueda).replace(/^@/, "");
    return !q || [nombre(s), s.usuarioSolicitado, s.correo, s.rut, s.telefono].some((v) => normalizar(v).includes(q));
  }), [solicitudes, busqueda, filtro]);
  const seleccionada = visibles.find((s) => s.id === seleccionId) ?? visibles[0] ?? null;

  async function aprobarCuenta() {
    if (!seleccionada || ocupado) return;
    if (!window.confirm(`¿Crear una cuenta real para ${nombre(seleccionada)} con rol ${rolNuevo}? La contraseña se mostrará una sola vez.`)) return;
    setOcupado(true);
    setError("");
    setCredenciales(null);
    try {
      const resultado = await apiFetch(`/api/admin/solicitudes-acceso/${seleccionada.id}/aprobar`, {
        method: "PATCH", body: JSON.stringify({ rol: rolNuevo }),
      });
      setCredenciales({ correo: resultado.correo, password: resultado.passwordTemporal });
      await cargar();
      notificar("Cuenta creada en PostgreSQL y solicitud aprobada.");
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  }

  async function actualizarEstado(estado) {
    if (!seleccionada || ocupado || estado === seleccionada.estado || estado === "ACEPTADA") return;
    setOcupado(true);
    try {
      await apiFetch(`/api/admin/solicitudes-acceso/${seleccionada.id}/estado`, {
        method: "PATCH", body: JSON.stringify({ estado }),
      });
      await cargar();
      notificar(`Solicitud marcada como ${ETIQUETAS[estado].toLowerCase()}.`);
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  }

  async function enviarComentario(e) {
    e.preventDefault();
    if (!seleccionada || !comentario.trim() || ocupado) return;
    setOcupado(true);
    try {
      await apiFetch(`/api/admin/solicitudes-acceso/${seleccionada.id}/comentario`, {
        method: "PATCH", body: JSON.stringify({ comentario: comentario.trim() }),
      });
      setComentario("");
      await cargar();
      notificar("Comentario guardado en PostgreSQL.");
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  }

  async function descargarCv() {
    if (!seleccionada || ocupado) return;
    setOcupado(true);
    try {
      const token = leerSesionApi()?.token;
      const r = await fetch(`${API}/api/admin/solicitudes-acceso/${seleccionada.id}/cv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`No se pudo descargar el CV (HTTP ${r.status}).`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "curriculum.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  }

  return (
    <section aria-labelledby="titulo-acceso">
      <div className="card card-body caja caja--azul mb-3">
        <div className="d-flex justify-content-between align-items-center gap-2">
          <h1 id="titulo-acceso" className="h4 mb-1">Solicitudes de acceso</h1>
          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => { setCargando(true); cargar(); }}>Actualizar</button>
        </div>
        <p className="small text-secondary mb-3">Solicitudes reales registradas en PostgreSQL.</p>
        <div className="row g-2">
          <div className="col-12 col-md-8">
            <input aria-label="Buscar solicitudes" className="form-control" placeholder="Buscar por nombre, usuario, correo o RUT..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="col-12 col-md-4">
            <select aria-label="Filtrar por estado" className="form-select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{ETIQUETAS[e]}</option>)}
            </select>
          </div>
        </div>
        <p className="small text-secondary mt-2 mb-0">{visibles.length} de {solicitudes.length} solicitudes</p>
        {error && <p className="alert alert-danger mt-2 mb-0" role="alert">{error}</p>}
      </div>
      <div className="row g-3 align-items-start">
        <div className="col-12 col-lg-4">
          <div className="card caja caja--azul overflow-hidden">
            <div className="card-header fw-semibold">Solicitantes</div>
            <div className="list-group list-group-flush" style={{ maxHeight: "65vh", overflowY: "auto" }}>
              {visibles.map((s) => (
                <button key={s.id} type="button" onClick={() => { setSeleccionId(s.id); setComentario(""); setError(""); setCredenciales(null); }}
                  className={`list-group-item list-group-item-action text-start ${seleccionada?.id === s.id ? "active" : ""}`}>
                  <div className="d-flex justify-content-between gap-2"><strong>{nombre(s)}</strong><span className={`badge ${CLASES[s.estado] || "text-bg-secondary"}`}>{ETIQUETAS[s.estado] || s.estado}</span></div>
                  <small className="d-block">@{s.usuarioSolicitado}</small>
                  <small className="d-block text-truncate">{s.correo}</small>
                  <small className="d-block">{fecha(s.fechaCreacion)}</small>
                </button>
              ))}
              {cargando && <p className="p-3 text-secondary">Cargando solicitudes...</p>}
              {!cargando && visibles.length === 0 && <p className="p-3 text-secondary mb-0">No hay solicitudes que mostrar.</p>}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-8">
          <div className="card card-body caja caja--azul">
            {!seleccionada ? <p className="text-secondary mb-0">Selecciona una solicitud para revisar sus datos.</p> : <>
              <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                <div><h2 className="h5 mb-1">{nombre(seleccionada)}</h2><span className="small text-secondary">@{seleccionada.usuarioSolicitado} · {fecha(seleccionada.fechaCreacion)}</span></div>
                <span className={`badge ${CLASES[seleccionada.estado] || "text-bg-secondary"}`}>{ETIQUETAS[seleccionada.estado] || seleccionada.estado}</span>
              </div>
              <h3 className="h6">Datos del solicitante</h3>
              <dl className="row small mb-3">
                <dt className="col-sm-3">Correo</dt><dd className="col-sm-9 text-break">{seleccionada.correo}</dd>
                <dt className="col-sm-3">RUT</dt><dd className="col-sm-9">{seleccionada.rut}</dd>
                <dt className="col-sm-3">Teléfono</dt><dd className="col-sm-9">{seleccionada.telefono}</dd>
                <dt className="col-sm-3">Motivo</dt><dd className="col-sm-9">{seleccionada.motivo}</dd>
              </dl>
              <div className="mb-3">
                <h3 className="h6">Currículum vitae</h3>
                {seleccionada.cvNombre ? <button type="button" className="btn btn-outline-primary btn-sm" disabled={ocupado} onClick={descargarCv}>Descargar CV (PDF)</button> : <span className="text-secondary small">Sin CV adjunto</span>}
              </div>
              <h3 className="h6">Resolver solicitud</h3>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {ESTADOS.map((e) => <button key={e} type="button" className={`btn btn-sm ${seleccionada.estado === e ? "btn-secondary" : "btn-outline-primary"}`} disabled={ocupado || seleccionada.estado === e || e === "ACEPTADA" || seleccionada.estado === "ACEPTADA"} onClick={() => actualizarEstado(e)}>{ETIQUETAS[e]}</button>)}
              </div>
              {seleccionada.estado !== "RECHAZADA" && <div className="border rounded p-3 mb-3">
                <label htmlFor="rol-cuenta" className="form-label fw-semibold">Crear cuenta real y aprobar solicitud</label>
                <select id="rol-cuenta" className="form-select mb-2" value={rolNuevo} onChange={(e) => setRolNuevo(e.target.value)} disabled={ocupado}>
                  <option value="EVALUADOR">Evaluador</option>
                  <option value="ANALISTA_RECLUTAMIENTO">Analista de reclutamiento</option>
                </select>
                <button type="button" className="btn btn-success btn-sm" disabled={ocupado} onClick={aprobarCuenta}>
                  {seleccionada.estado === "ACEPTADA" ? "Crear cuenta pendiente" : "Aprobar y crear cuenta"}
                </button>
                <p className="small text-secondary mt-2 mb-0">La contraseña temporal se muestra solo al administrador una vez. Entrégala por un canal seguro y solicita su cambio.</p>
              </div>}
              {credenciales && <div className="alert alert-success" role="status">
                <strong>Cuenta creada. Copia estas credenciales ahora; no volverán a mostrarse.</strong>
                <div>Correo: <code>{credenciales.correo}</code></div>
                <div>Contraseña temporal: <code>{credenciales.password}</code></div>
                <button type="button" className="btn btn-sm btn-outline-success mt-2" onClick={() => navigator.clipboard.writeText(`Correo: ${credenciales.correo}\nContraseña temporal: ${credenciales.password}`)}>Copiar credenciales</button>
                <button type="button" className="btn btn-sm btn-outline-secondary mt-2 ms-2" onClick={() => setCredenciales(null)}>Ocultar</button>
              </div>}
              <h3 className="h6">Comentario visible para el solicitante</h3>
              <p className="small">{seleccionada.comentarioAdministrador || "Todavía no hay comentario."}</p>
              <form onSubmit={enviarComentario}>
                <label className="form-label" htmlFor="comentario-acceso">Actualizar comentario</label>
                <textarea id="comentario-acceso" className="form-control mb-2" rows={3} maxLength={4000} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Escribe una respuesta..." />
                <button type="submit" className="btn btn-primary btn-sm" disabled={ocupado || !comentario.trim()}>Guardar comentario</button>
              </form>
            </>}
          </div>
        </div>
      </div>
    </section>
  );
}
