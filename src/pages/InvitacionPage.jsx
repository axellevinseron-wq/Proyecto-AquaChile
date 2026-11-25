import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../apiClient";

const ETIQUETAS_ROL = {
  ADMIN: "Administrador",
  ANALISTA_RECLUTAMIENTO: "Analista de reclutamiento",
  EVALUADOR: "Evaluador",
};

export default function InvitacionPage() {
  const { token } = useParams();
  const [invitacion, setInvitacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [completada, setCompletada] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activa = true;
    document.title = "Configurar acceso | AquaChile";
    apiFetch(`/api/publico/invitaciones/${encodeURIComponent(token)}`)
      .then((datos) => {
        if (activa) setInvitacion(datos);
      })
      .catch((err) => {
        if (activa) setError(err.message || "La invitación no está disponible.");
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
      document.title = "Evaluaciones psicolaborales";
    };
  }, [token]);

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("La contraseña no puede superar 72 bytes UTF-8.");
      return;
    }

    setEnviando(true);
    try {
      await apiFetch(`/api/publico/invitaciones/${encodeURIComponent(token)}/aceptar`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setCompletada(true);
      setPassword("");
      setConfirmacion("");
    } catch (err) {
      setError(err.message || "No se pudo configurar la contraseña.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-card" aria-labelledby="titulo-invitacion">
          <h1 className="login-titulo" id="titulo-invitacion">
            {cargando ? "Comprobando invitación..." : completada ? "Acceso configurado" : "Configura tu acceso"}
          </h1>
          {cargando ? (
            <p role="status">Comprobando invitación...</p>
          ) : completada ? (
            <>
              <p>Tu contraseña quedó configurada. Ya puedes ingresar al sistema.</p>
              <Link className="login-boton d-block text-center text-decoration-none" to="/inicio">Ir al inicio de sesión</Link>
            </>
          ) : !invitacion ? (
            <>
              <p className="login-mensaje" role="alert">{error || "La invitación no existe o ya no es válida."}</p>
              <p>Solicita al administrador que te envíe una nueva invitación.</p>
              <Link to="/solicitud" className="login-olvido">Ir a solicitudes de acceso</Link>
            </>
          ) : (
            <>
              <p>Hola {invitacion.nombre}. Estás configurando la cuenta <strong>{invitacion.correo}</strong>.</p>
              <p className="small text-secondary">Rol: {ETIQUETAS_ROL[invitacion.rol] || invitacion.rol}. Esta invitación vence el {new Date(invitacion.expira).toLocaleString("es-CL")}.</p>
              {error && <p className="login-mensaje" role="alert">{error}</p>}
              <form onSubmit={enviar}>
                <div className="login-campo">
                  <label className="visually-hidden" htmlFor="invitacion-password">Crea una contraseña</label>
                  <input
                    id="invitacion-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={72}
                    required
                    placeholder="Crea una contraseña (mínimo 12 caracteres)"
                    value={password}
                    onChange={(evento) => setPassword(evento.target.value)}
                  />
                </div>
                <div className="login-campo">
                  <label className="visually-hidden" htmlFor="invitacion-confirmacion">Confirma la contraseña</label>
                  <input
                    id="invitacion-confirmacion"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={72}
                    required
                    placeholder="Confirma la contraseña"
                    value={confirmacion}
                    onChange={(evento) => setConfirmacion(evento.target.value)}
                  />
                </div>
                <button className="login-boton" type="submit" disabled={enviando}>
                  {enviando ? "Guardando..." : "Configurar contraseña"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
