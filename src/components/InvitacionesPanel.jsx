import { useState } from "react";
import { crearInvitacion, obtenerInvitaciones, PERMISOS, revocarInvitacion, ROLES } from "../auth";
import { useDatosAcceso } from "../useDatosAcceso";
import { useToast } from "./Toast";

const PERMISOS_VACIOS = Object.fromEntries(PERMISOS.map((permiso) => [permiso.id, false]));
const FORMULARIO_VACIO = {
  usuario: "",
  nombre: "",
  correo: "",
  rol: "Usuario",
  permisos: PERMISOS_VACIOS,
};

function fecha(iso) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function InvitacionesPanel() {
  const { notificar } = useToast();
  useDatosAcceso();
  const invitaciones = obtenerInvitaciones();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [revocando, setRevocando] = useState(null);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
    setError("");
  }

  async function invitar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError("");
    const respuesta = await crearInvitacion(formulario);
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setResultado(respuesta);
    setFormulario(FORMULARIO_VACIO);
    setMostrarFormulario(false);
    notificar(`Invitación creada para ${respuesta.invitacion.nombre}.`);
  }

  async function revocar(id, usuario) {
    setRevocando(id);
    const respuesta = await revocarInvitacion(id);
    setRevocando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setError("");
    setResultado(null);
    notificar(`Invitación de ${usuario} revocada.`);
  }

  const pendientes = invitaciones.filter(
    (invitacion) => !invitacion.usadaEn && !invitacion.revocadaEn && new Date(invitacion.expira) > new Date(),
  );

  return (
    <section className="card card-body caja caja--azul mb-3" aria-labelledby="titulo-invitaciones">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h2 className="h5 mb-1" id="titulo-invitaciones">Invitaciones de acceso</h2>
          <p className="text-secondary small mb-0">
            Solo un administrador puede invitar usuarios. Cada enlace sirve una vez y vence en 24 horas.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-success btn-sm"
          onClick={() => {
            setMostrarFormulario((visible) => !visible);
            setError("");
            setResultado(null);
          }}
        >
          {mostrarFormulario ? "Cancelar" : "Invitar usuario"}
        </button>
      </div>

      {error && <p className="alert alert-danger py-2" role="alert">{error}</p>}
      {resultado && (
        <div className={`alert ${resultado.correoEnviado ? "alert-success" : "alert-warning"}`} role="status">
          <p className="mb-1">{resultado.aviso}</p>
          {resultado.enlace && (
            <label className="d-block small">
              Enlace de invitación (compártelo solo con la persona indicada):
              <input className="form-control form-control-sm mt-1" readOnly value={resultado.enlace} onFocus={(evento) => evento.target.select()} />
            </label>
          )}
        </div>
      )}

      {mostrarFormulario && (
        <form className="border rounded p-3 mb-3" onSubmit={invitar}>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="inv-usuario">Nombre de usuario</label>
              <input id="inv-usuario" name="usuario" className="form-control" autoComplete="off" maxLength={50} required value={formulario.usuario} onChange={cambiarCampo} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="inv-nombre">Nombre completo</label>
              <input id="inv-nombre" name="nombre" className="form-control" autoComplete="name" maxLength={120} required value={formulario.nombre} onChange={cambiarCampo} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="inv-correo">Correo de invitación</label>
              <input id="inv-correo" name="correo" type="email" className="form-control" autoComplete="email" maxLength={200} required value={formulario.correo} onChange={cambiarCampo} />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="inv-rol">Rol</label>
              <select id="inv-rol" name="rol" className="form-select" value={formulario.rol} onChange={cambiarCampo}>
                {ROLES.map((rol) => <option key={rol}>{rol}</option>)}
              </select>
            </div>
            <fieldset className="col-12 col-md-8">
              <legend className="form-label">Permisos iniciales</legend>
              {formulario.rol === "Administrador" ? (
                <p className="small text-secondary mb-0">Los administradores tienen acceso a todas las secciones.</p>
              ) : (
                <div className="d-flex flex-wrap gap-3">
                  {PERMISOS.map((permiso) => (
                    <div className="form-check" key={permiso.id}>
                      <input
                        id={`inv-perm-${permiso.id}`}
                        type="checkbox"
                        className="form-check-input"
                        checked={formulario.permisos[permiso.id]}
                        onChange={(evento) => setFormulario((actual) => ({
                          ...actual,
                          permisos: { ...actual.permisos, [permiso.id]: evento.target.checked },
                        }))}
                      />
                      <label className="form-check-label" htmlFor={`inv-perm-${permiso.id}`}>{permiso.texto}</label>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>
          </div>
          <div className="d-flex justify-content-end mt-3">
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? "Creando invitación..." : "Crear invitación"}
            </button>
          </div>
        </form>
      )}

      <div>
        <h3 className="h6">Pendientes ({pendientes.length})</h3>
        {pendientes.length === 0 ? (
          <p className="small text-secondary mb-0">No hay invitaciones pendientes.</p>
        ) : (
          <ul className="list-group">
            {pendientes.map((invitacion) => (
              <li key={invitacion.id} className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2">
                <span>
                  <strong>{invitacion.nombre}</strong> · @{invitacion.usuario}
                  <small className="d-block text-secondary">{invitacion.correo} · vence {fecha(invitacion.expira)}</small>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  disabled={revocando === invitacion.id}
                  onClick={() => revocar(invitacion.id, invitacion.usuario)}
                >
                  {revocando === invitacion.id ? "Revocando..." : "Revocar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default InvitacionesPanel;
