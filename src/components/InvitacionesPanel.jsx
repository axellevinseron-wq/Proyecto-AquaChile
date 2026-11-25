import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../apiClient";
import { useToast } from "./Toast";

const ROLES = [
  { value: "ADMIN", label: "Administrador" },
  { value: "ANALISTA_RECLUTAMIENTO", label: "Analista de reclutamiento" },
  { value: "EVALUADOR", label: "Evaluador" },
];

const VACIO = { nombre: "", correo: "", rol: "EVALUADOR" };

function fecha(iso) {
  return iso ? new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function estado(invitacion) {
  if (invitacion.usada) return "Aceptada";
  if (invitacion.revocada) return "Revocada";
  if (new Date(invitacion.expira) <= new Date()) return "Vencida";
  return "Pendiente";
}

export default function InvitacionesPanel() {
  const { notificar } = useToast();
  const [invitaciones, setInvitaciones] = useState([]);
  const [formulario, setFormulario] = useState(VACIO);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await apiFetch("/api/admin/invitaciones");
      setInvitaciones(Array.isArray(datos) ? datos : []);
      setError("");
    } catch (err) {
      setError(err.message || "No se pudieron cargar las invitaciones.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let activa = true;
    apiFetch("/api/admin/invitaciones")
      .then((datos) => {
        if (activa) {
          setInvitaciones(Array.isArray(datos) ? datos : []);
          setError("");
        }
      })
      .catch((err) => {
        if (activa) setError(err.message || "No se pudieron cargar las invitaciones.");
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => { activa = false; };
  }, []);

  async function crear(evento) {
    evento.preventDefault();
    setOcupado(true);
    setError("");
    setResultado(null);
    try {
      const datos = await apiFetch("/api/admin/invitaciones", {
        method: "POST",
        body: JSON.stringify({
          nombre: formulario.nombre.trim(),
          correo: formulario.correo.trim(),
          rol: formulario.rol,
        }),
      });
      setResultado(datos);
      setFormulario(VACIO);
      await cargar();
      notificar(`Invitación creada para ${datos.invitacion.nombre}.`);
    } catch (err) {
      setError(err.message || "No se pudo crear la invitación.");
    } finally {
      setOcupado(false);
    }
  }

  async function revocar(invitacion) {
    if (!window.confirm(`¿Revocar la invitación de ${invitacion.correo}?`)) return;
    setOcupado(true);
    setError("");
    try {
      await apiFetch(`/api/admin/invitaciones/${invitacion.id}/revocar`, { method: "POST" });
      await cargar();
      setResultado(null);
      notificar("Invitación revocada.");
    } catch (err) {
      setError(err.message || "No se pudo revocar la invitación.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby="titulo-invitaciones">
      <div className="card card-body caja caja--azul mb-3">
        <h1 className="h4 mb-1" id="titulo-invitaciones">Invitaciones de acceso</h1>
        <p className="small text-secondary mb-3">Los enlaces vencen en 24 horas y solo se pueden usar una vez.</p>
        {error && <p className="alert alert-danger py-2" role="alert">{error}</p>}
        {resultado && (
          <div className={`alert ${resultado.correoEnviado ? "alert-success" : "alert-warning"}`} role="status">
            <p className="mb-1">{resultado.aviso}</p>
            {resultado.enlace && (
              <label className="small d-block">
                Enlace de invitación (compártelo solo con la persona indicada):
                <input className="form-control form-control-sm mt-1" readOnly value={resultado.enlace}
                  onFocus={(evento) => evento.target.select()} />
              </label>
            )}
          </div>
        )}
        <form className="row g-2 align-items-end" onSubmit={crear}>
          <div className="col-12 col-md-4">
            <label htmlFor="invitacion-nombre" className="form-label">Nombre completo</label>
            <input id="invitacion-nombre" className="form-control" maxLength={120} required
              value={formulario.nombre}
              onChange={(evento) => setFormulario((actual) => ({ ...actual, nombre: evento.target.value }))} />
          </div>
          <div className="col-12 col-md-4">
            <label htmlFor="invitacion-correo" className="form-label">Correo</label>
            <input id="invitacion-correo" type="email" className="form-control" maxLength={254} required
              value={formulario.correo}
              onChange={(evento) => setFormulario((actual) => ({ ...actual, correo: evento.target.value }))} />
          </div>
          <div className="col-12 col-md-2">
            <label htmlFor="invitacion-rol" className="form-label">Rol</label>
            <select id="invitacion-rol" className="form-select" value={formulario.rol}
              onChange={(evento) => setFormulario((actual) => ({ ...actual, rol: evento.target.value }))}>
              {ROLES.map((rol) => <option key={rol.value} value={rol.value}>{rol.label}</option>)}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <button type="submit" className="btn btn-primary w-100" disabled={ocupado}>
              {ocupado ? "Procesando..." : "Invitar"}
            </button>
          </div>
        </form>
      </div>

      <div className="card card-body caja caja--azul">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0">Invitaciones enviadas</h2>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cargar} disabled={cargando}>Actualizar</button>
        </div>
        {cargando ? <p role="status">Cargando invitaciones...</p> : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead><tr><th>Invitado</th><th>Rol</th><th>Creada</th><th>Vence</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {invitaciones.map((invitacion) => (
                  <tr key={invitacion.id}>
                    <td>{invitacion.nombre}<small className="d-block text-secondary">{invitacion.correo}</small></td>
                    <td>{ROLES.find((rol) => rol.value === invitacion.rol)?.label || invitacion.rol}</td>
                    <td>{fecha(invitacion.creada)}</td>
                    <td>{fecha(invitacion.expira)}</td>
                    <td>{estado(invitacion)}</td>
                    <td>{estado(invitacion) === "Pendiente" && (
                      <button type="button" className="btn btn-sm btn-outline-danger"
                        disabled={ocupado} onClick={() => revocar(invitacion)}>Revocar</button>
                    )}</td>
                  </tr>
                ))}
                {invitaciones.length === 0 && <tr><td colSpan="6" className="text-center text-secondary">No hay invitaciones registradas.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
