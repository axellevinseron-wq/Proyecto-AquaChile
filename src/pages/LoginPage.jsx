import { useState } from "react";
import Icon from "../components/Icon";
import { crearSolicitudCuenta, iniciarSesion, tieneSolicitudPendiente } from "../auth";

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
  const [modoRegistro, setModoRegistro] = useState(false);
  const [clave2, setClave2] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [correo, setCorreo] = useState("");
  const [aviso, setAviso] = useState("");

  function cambiarModo() {
    setModoRegistro((actual) => !actual);
    setClave("");
    setClave2("");
    setMensaje("");
    setAviso("");
  }

  function enviar(evento) {
    evento.preventDefault();
    const nombre = usuario.trim();

    if (!nombre || !clave) {
      setMensaje(modoRegistro ? "Elige un usuario y una contraseña." : "Ingresa tu usuario y contraseña.");
      return;
    }

    if (modoRegistro) {
      if (!nombreCompleto.trim() || !correo.trim()) {
        setMensaje("Ingresa tu nombre completo y tu correo.");
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(correo.trim())) {
        setMensaje("Ingresa un correo válido.");
        return;
      }
      if (clave.length < 4) {
        setMensaje("La contraseña debe tener al menos 4 caracteres.");
        return;
      }
      if (clave !== clave2) {
        setMensaje("Las contraseñas no coinciden.");
        return;
      }
      const resultado = crearSolicitudCuenta({ nombre: nombreCompleto, correo, usuario: nombre, clave });
      if (!resultado.ok) {
        setMensaje(resultado.error);
        return;
      }
      // La cuenta queda pendiente hasta que un administrador la acepte.
      cambiarModo();
      setNombreCompleto("");
      setCorreo("");
      setAviso("Solicitud enviada. Podrás ingresar cuando un administrador la acepte.");
      return;
    }

    const sesion = iniciarSesion(nombre, clave);
    if (!sesion) {
      setMensaje(
        tieneSolicitudPendiente(nombre)
          ? "Tu solicitud de cuenta aún está pendiente de aprobación."
          : "Usuario o contraseña incorrectos.",
      );
      return;
    }
    guardarUsuarioRecordado(recordar ? nombre : "");
    onLogin(sesion);
  }

  return (
    <main className="login-page">
      <div className="login-shell">
      <form className="login-card" onSubmit={enviar} noValidate>

        <h1 className="login-titulo">
          {modoRegistro ? "Crear cuenta" : "Iniciar sesión"}
        </h1>

        {modoRegistro && (
          <>
            <div className="login-campo">
              <span className="login-campo__icono" aria-hidden="true">
                <Icon nombre="user" size={16} />
              </span>
              <label className="visually-hidden" htmlFor="login-nombre">Nombre completo</label>
              <input
                id="login-nombre"
                type="text"
                autoComplete="name"
                placeholder="Nombre completo"
                value={nombreCompleto}
                onChange={(evento) => {
                  setNombreCompleto(evento.target.value);
                  setMensaje("");
                }}
              />
            </div>

            <div className="login-campo">
              <span className="login-campo__icono" aria-hidden="true">
                <Icon nombre="mail" size={16} />
              </span>
              <label className="visually-hidden" htmlFor="login-correo">Correo</label>
              <input
                id="login-correo"
                type="email"
                autoComplete="email"
                placeholder="Correo"
                value={correo}
                onChange={(evento) => {
                  setCorreo(evento.target.value);
                  setMensaje("");
                }}
              />
            </div>
          </>
        )}

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
            autoComplete={modoRegistro ? "new-password" : "current-password"}
            placeholder="Contraseña"
            value={clave}
            onChange={(evento) => {
              setClave(evento.target.value);
              setMensaje("");
            }}
          />
        </div>

        {modoRegistro && (
          <div className="login-campo">
            <span className="login-campo__icono" aria-hidden="true">
              <Icon nombre="lock" size={16} />
            </span>
            <label className="visually-hidden" htmlFor="login-clave2">Repetir contraseña</label>
            <input
              id="login-clave2"
              type="password"
              autoComplete="new-password"
              placeholder="Repetir contraseña"
              value={clave2}
              onChange={(evento) => {
                setClave2(evento.target.value);
                setMensaje("");
              }}
            />
          </div>
        )}

        {aviso && (
          <p className="login-aviso" role="status">
            {aviso}
          </p>
        )}

        {mensaje && (
          <p className="login-mensaje" role="alert">
            {mensaje}
          </p>
        )}

        <div className="login-opciones">
          {modoRegistro ? (
            <span />
          ) : (
            <label className="login-recordar">
              <input
                type="checkbox"
                checked={recordar}
                onChange={(evento) => setRecordar(evento.target.checked)}
              />
              Recordarme
            </label>
          )}
          <button type="button" className="login-olvido" onClick={cambiarModo}>
            {modoRegistro ? "Ya tengo cuenta" : "Crear cuenta"}
          </button>
        </div>

        <button type="submit" className="login-boton">
          {modoRegistro ? "SOLICITAR CUENTA" : "INGRESAR"}
        </button>
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
