import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { iniciarSesion } from "../auth";

const CLAVE_USUARIO = "vcm-usuario-recordado";

function leerUsuarioRecordado() {
  try {
    return localStorage.getItem(CLAVE_USUARIO) ?? "";
  } catch {
    return "";
  }
}

function guardarUsuarioRecordado(valor) {
  try {
    if (valor) {
      localStorage.setItem(CLAVE_USUARIO, valor);
    } else {
      localStorage.removeItem(CLAVE_USUARIO);
    }
  } catch {
    
  }
}

function LoginPage({ onLogin }) {
  const [usuario, setUsuario] = useState(leerUsuarioRecordado);
  const [clave, setClave] = useState("");
  const [recordar, setRecordar] = useState(() => leerUsuarioRecordado() !== "");
  const [mensaje, setMensaje] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    const nombre = usuario.trim();

    if (!nombre || !clave) {
      setMensaje("Ingresa tu usuario y contraseña.");
      return;
    }

    setEntrando(true);
    const resultado = await iniciarSesion(nombre, clave);
    setEntrando(false);
    if (!resultado.ok) {
      setMensaje(
        resultado.pendiente
          ? "Tu solicitud de cuenta aún está pendiente de aprobación."
          : resultado.error,
      );
      return;
    }
    guardarUsuarioRecordado(recordar ? nombre : "");
    onLogin(resultado.sesion);
  }

  return (
    <main className="login-page">
      <div className="login-shell">
      <form className="login-card" onSubmit={enviar} noValidate>

        <h1 className="login-titulo">Iniciar sesión</h1>

        <div className="login-campo">
          <span className="login-campo__icono" aria-hidden="true">
            <Icon nombre="user" size={16} />
          </span>
          <label className="visually-hidden" htmlFor="login-usuario">Usuario</label>
          <input
            id="login-usuario"
            type="text"
            autoComplete="username"
            placeholder="Usuario"
            value={usuario}
            onChange={(evento) => {
              setUsuario(evento.target.value);
              setMensaje("");
            }}
          />
        </div>

        <div className="login-campo">
          <span className="login-campo__icono" aria-hidden="true">
            <Icon nombre="lock" size={16} />
          </span>
          <label className="visually-hidden" htmlFor="login-clave">Contraseña</label>
          <input
            id="login-clave"
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña"
            value={clave}
            onChange={(evento) => {
              setClave(evento.target.value);
              setMensaje("");
            }}
          />
        </div>

        {mensaje && (
          <p className="login-mensaje" role="alert">
            {mensaje}
          </p>
        )}

        <div className="login-opciones">
          <label className="login-recordar">
            <input
              type="checkbox"
              checked={recordar}
              onChange={(evento) => setRecordar(evento.target.checked)}
            />
            Recordarme
          </label>
        </div>

        <button type="submit" className="login-boton" disabled={entrando}>
          INGRESAR
        </button>

        <div className="login-accesos">
          <Link to="/solicitud?tab=enviar" className="login-olvido">
            Enviar una solicitud de acceso
          </Link>
          <Link to="/solicitud?tab=estado" className="login-olvido">
            Ver el estado de mi solicitud
          </Link>
        </div>
      </form>

      <aside className="login-hero" aria-hidden="true">
        <h2 className="login-hero__titulo">Bienvenido.</h2>
        <p className="login-hero__texto">
          Gestiona candidatos, indicadores y solicitudes del proceso psicolaboral en un solo lugar.
        </p>
      </aside>
      </div>
    </main>
  );
}

export default LoginPage;
