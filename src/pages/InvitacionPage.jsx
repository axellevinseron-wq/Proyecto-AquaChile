import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { aceptarInvitacion, consultarInvitacion } from "../auth";

function InvitacionPage() {
  const { token } = useParams();
  const [invitacion, setInvitacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [clave, setClave] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [completada, setCompletada] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activa = true;
    document.title = "Configurar acceso | AquaChile";
    consultarInvitacion(token).then((resultado) => {
      if (!activa) return;
      setCargando(false);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setInvitacion(resultado.invitacion);
    });
    return () => {
      activa = false;
      document.title = "Evaluaciones psicolaborales";
    };
  }, [token]);

  async function enviar(evento) {
    evento.preventDefault();
    setError("");
    if (clave !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (clave.length < 12) {
      setError("Usa una contraseña de al menos 12 caracteres.");
      return;
    }

    setEnviando(true);
    const resultado = await aceptarInvitacion(token, clave);
    setEnviando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setCompletada(true);
    setClave("");
    setConfirmacion("");
  }

  return (
    <main className="invitacion-page">
      <section className="invitacion-card">
        <Link className="invitacion-marca" to="/">
          <span aria-hidden="true">A</span>
          AquaChile
        </Link>

        {cargando ? (
          <p role="status">Comprobando invitación...</p>
        ) : completada ? (
          <>
            <h1>Acceso configurado</h1>
            <p>Tu contraseña quedó configurada. Ya puedes ingresar al sistema.</p>
            <Link className="invitacion-boton" to="/acceso">Ir al inicio de sesión</Link>
          </>
        ) : !invitacion ? (
          <>
            <h1>Invitación no disponible</h1>
            <p className="invitacion-error" role="alert">{error}</p>
            <p>Solicita al administrador que te envíe una nueva invitación.</p>
            <Link className="invitacion-boton invitacion-boton--secundario" to="/acceso">Ir al inicio de sesión</Link>
          </>
        ) : (
          <>
            <span className="invitacion-etiqueta">INVITACIÓN AL SISTEMA</span>
            <h1>Configura tu acceso</h1>
            <p>
              Hola {invitacion.nombre}. Estás configurando la cuenta <strong>{invitacion.usuario}</strong>.
            </p>
            <p className="invitacion-expira">
              Esta invitación vence el {new Date(invitacion.expira).toLocaleString("es-CL")}.
            </p>
            {error && <p className="invitacion-error" role="alert">{error}</p>}
            <form onSubmit={enviar}>
              <label htmlFor="invitacion-clave">Crea una contraseña</label>
              <input
                id="invitacion-clave"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={clave}
                onChange={(evento) => setClave(evento.target.value)}
              />
              <small>Debe tener entre 12 y 128 caracteres.</small>
              <label htmlFor="invitacion-confirmacion">Confirma la contraseña</label>
              <input
                id="invitacion-confirmacion"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={confirmacion}
                onChange={(evento) => setConfirmacion(evento.target.value)}
              />
              <button className="invitacion-boton" type="submit" disabled={enviando}>
                {enviando ? "Guardando..." : "Configurar contraseña"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default InvitacionPage;
