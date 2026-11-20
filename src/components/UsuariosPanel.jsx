import { useEffect, useMemo, useState } from "react";
import { apiFetch, leerSesionApi } from "../apiClient";
import { useToast } from "./Toast";

const ROLES = [
  { value: "ADMIN", label: "Administrador" },
  { value: "EVALUADOR", label: "Evaluador" },
  { value: "ANALISTA_RECLUTAMIENTO", label: "Analista de reclutamiento" },
];

function etiquetaRol(rol) {
  return ROLES.find((r) => r.value === rol)?.label || rol || "Sin rol";
}

function normalizar(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function UsuariosPanel() {
  const { notificar } = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const sesion = leerSesionApi();
  const correoActual = sesion?.correo?.toLowerCase();

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const datos = await apiFetch("/api/usuarios");
      if (!Array.isArray(datos)) throw new Error("El servidor no devolvió una lista de usuarios.");
      setUsuarios(datos);
    } catch (e) {
      setError(`No fue posible cargar los usuarios de PostgreSQL: ${e.message}`);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => usuarios.filter((u) =>
    [u.nombre, u.correo, u.rol, etiquetaRol(u.rol)]
      .some((valor) => normalizar(valor).includes(normalizar(busqueda.trim())))
  ), [usuarios, busqueda]);

  const seleccionado = usuarios.find((u) => u.id === seleccionadoId) || null;
  const esPropio = seleccionado?.correo?.toLowerCase() === correoActual;

  function elegir(usuario) {
    setSeleccionadoId(usuario.id);
    setFormulario({ nombre: usuario.nombre || "", correo: usuario.correo || "", rol: usuario.rol });
    setError("");
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (!seleccionado || !formulario || esPropio) return;
    setGuardando(true);
    setError("");
    try {
      const actualizado = await apiFetch(`/api/usuarios/${seleccionado.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: formulario.nombre.trim(),
          correo: formulario.correo.trim(),
          rol: formulario.rol,
        }),
      });
      setUsuarios((actuales) => actuales.map((u) => u.id === actualizado.id ? actualizado : u));
      setSeleccionadoId(actualizado.id);
      setFormulario({ nombre: actualizado.nombre, correo: actualizado.correo, rol: actualizado.rol });
      notificar("Usuario actualizado correctamente en PostgreSQL.");
    } catch (e) {
      setError(`No se pudieron guardar los cambios: ${e.message}`);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado() {
    if (!seleccionado || esPropio) return;
    if (!window.confirm(`¿${seleccionado.activo ? "Desactivar" : "Activar"} la cuenta de ${seleccionado.nombre}?`)) return;
    setGuardando(true);
    setError("");
    try {
      const actualizado = await apiFetch(`/api/usuarios/${seleccionado.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !seleccionado.activo }),
      });
      setUsuarios((actuales) => actuales.map((u) => u.id === actualizado.id ? actualizado : u));
      notificar(`Cuenta ${actualizado.activo ? "activada" : "desactivada"} correctamente.`);
    } catch (e) {
      setError(`No se pudo cambiar el estado: ${e.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-usuarios">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <div>
          <h1 id="titulo-usuarios" className="h4 mb-1">Usuarios y permisos</h1>
          <p className="text-secondary small mb-0">
            Cuentas reales de PostgreSQL. Los permisos se aplican según el rol del backend.
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm"
          onClick={cargar} disabled={cargando}>Actualizar lista</button>
      </div>

      {error && <div role="alert" className="alert alert-danger py-2">{error}</div>}
      {cargando && <p role="status" className="text-secondary">Cargando usuarios...</p>}

      <div className="row g-3 mt-1">
        <div className="col-12 col-lg-5">
          <div className="card card-body caja caja--azul">
            <h2 className="h5">Usuarios del sistema</h2>
            <p className="small text-secondary">{usuarios.length} cuentas registradas</p>
            <label htmlFor="buscar-usuarios-api" className="visually-hidden">Buscar usuario</label>
            <input id="buscar-usuarios-api" type="search" className="form-control mb-3"
              placeholder="Buscar nombre, correo o rol..."
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <div className="list-group">
              {filtrados.map((u) => (
                <button key={u.id} type="button"
                  className={`list-group-item list-group-item-action text-start ${seleccionadoId === u.id ? "active" : ""}`}
                  style={seleccionadoId === u.id ? {
                    backgroundColor: "var(--color-sistema, #0d6efd)",
                    borderColor: "var(--color-sistema, #0d6efd)",
                    color: "#fff",
                  } : undefined}
                  onClick={() => elegir(u)}>
                  <span className="d-flex justify-content-between gap-2">
                    <strong>{u.nombre}</strong>
                    <span className={`badge ${u.activo ? "text-bg-success" : "text-bg-secondary"}`}>
                      {u.activo ? "Activa" : "Inactiva"}
                    </span>
                  </span>
                  <small className="d-block">{u.correo}</small>
                  <small className="d-block">{etiquetaRol(u.rol)}</small>
                </button>
              ))}
              {!cargando && filtrados.length === 0 &&
                <p className="small text-secondary p-2">No hay usuarios que coincidan.</p>}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card card-body caja caja--azul">
            <h2 className="h5">Detalle del usuario</h2>
            {!seleccionado || !formulario ? (
              <p className="text-secondary">Selecciona un usuario de la lista para ver y editar su información.</p>
            ) : (
              <form onSubmit={guardar}>
                <p className="small text-secondary mb-3">
                  Identificador: <code>{seleccionado.id}</code>
                </p>
                <label htmlFor="usuario-nombre" className="form-label">Nombre</label>
                <input id="usuario-nombre" className="form-control mb-3" required maxLength={120}
                  value={formulario.nombre} disabled={esPropio || guardando}
                  onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} />
                <label htmlFor="usuario-correo" className="form-label">Correo electrónico</label>
                <input id="usuario-correo" type="email" className="form-control mb-3" required
                  value={formulario.correo} disabled={esPropio || guardando}
                  onChange={(e) => setFormulario((f) => ({ ...f, correo: e.target.value }))} />
                <label htmlFor="usuario-rol" className="form-label">Rol y permisos</label>
                <select id="usuario-rol" className="form-select mb-2" value={formulario.rol}
                  disabled={esPropio || guardando}
                  onChange={(e) => setFormulario((f) => ({ ...f, rol: e.target.value }))}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <p className="form-text">
                  Administrador: gestión completa. Evaluador: solicitudes y evaluaciones.
                  Analista: ofertas y reclutamiento. El servidor controla el acceso real.
                </p>
                <p className="small">
                  Estado de cuenta: <strong>{seleccionado.activo ? "Activa" : "Inactiva"}</strong>
                </p>
                {esPropio && <p className="small text-secondary">
                  Por seguridad, no puedes modificar tu propia cuenta desde este panel.
                </p>}
                <div className="d-flex flex-wrap gap-2">
                  <button className="btn btn-primary btn-sm" type="submit"
                    disabled={esPropio || guardando}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
                  <button className="btn btn-outline-secondary btn-sm" type="button"
                    disabled={esPropio || guardando} onClick={cambiarEstado}>
                    {seleccionado.activo ? "Desactivar cuenta" : "Activar cuenta"}
                  </button>
                </div>
              </form>
            )}
          </div>
          <p className="small text-secondary mt-2">
            Nota: «Activa» significa que la cuenta puede acceder al sistema; no indica que esté conectada en este momento.
            La presencia en línea requiere un servicio adicional.
          </p>
        </div>
      </div>
    </section>
  );
}
