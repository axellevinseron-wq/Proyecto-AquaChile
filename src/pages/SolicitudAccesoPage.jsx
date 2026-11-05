import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { FechaHora } from "../components/Reloj";
import { useToast } from "../components/Toast";
import { consultarSolicitud, crearSolicitudAcceso, ejemplosConsulta, nombreCompleto } from "../auth";
import { correoValido, rutValido, telefonoValido } from "../logica";

const TABS = ["enviar", "estado"];

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function claseEstado(estado) {
  if (estado === "Aceptada") return "text-bg-success";
  if (estado === "Rechazada") return "text-bg-danger";
  return "text-bg-warning";
}

// Ilustración simple para el bloque de color de cada tarjeta.
function Ilustracion({ tipo }) {
  return (
    <svg viewBox="0 0 160 120" className="pub-ilustracion" aria-hidden="true" focusable="false">
      <rect x="28" y="22" width="104" height="70" rx="8" fill="#fff" opacity="0.95" />
      <rect x="28" y="22" width="104" height="14" rx="8" fill="#fff" />
      <circle cx="38" cy="29" r="2.5" fill="#4296fd" />
      <circle cx="47" cy="29" r="2.5" fill="#4296fd" />
      <circle cx="56" cy="29" r="2.5" fill="#4296fd" />
      {tipo === "enviar" ? (
        <>
          <rect x="40" y="46" width="52" height="6" rx="3" fill="#9cc3f5" />
          <rect x="40" y="58" width="80" height="6" rx="3" fill="#c9ddf8" />
          <rect x="40" y="70" width="38" height="6" rx="3" fill="#c9ddf8" />
          <polygon points="104,44 128,56 114,58 110,70" fill="#153e6d" />
        </>
      ) : (
        <>
          <circle cx="62" cy="62" r="14" fill="none" stroke="#153e6d" strokeWidth="5" />
          <line x1="72" y1="72" x2="88" y2="88" stroke="#153e6d" strokeWidth="6" strokeLinecap="round" />
          <rect x="92" y="50" width="30" height="6" rx="3" fill="#9cc3f5" />
          <rect x="92" y="62" width="22" height="6" rx="3" fill="#c9ddf8" />
        </>
      )}
      <rect x="14" y="96" width="132" height="8" rx="4" fill="#fff" opacity="0.8" />
    </svg>
  );
}

function FormularioEnvio({ onEnviada }) {
  const { notificar } = useToast();
  const [datos, setDatos] = useState({ nombre: "", apellido: "", rut: "", telefono: "", correo: "", usuario: "", motivo: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((actuales) => ({ ...actuales, [name]: value }));
    setError("");
  }

  async function enviar(evento) {
    evento.preventDefault();
    const campos = [datos.nombre, datos.apellido, datos.rut, datos.telefono, datos.correo, datos.usuario, datos.motivo];
    if (campos.some((campo) => !campo.trim())) {
      setError("Completa todos los campos.");
      return;
    }
    if (!rutValido(datos.rut)) {
      setError("Ingresa un RUT válido, por ejemplo 12.345.678-5.");
      return;
    }
    if (!telefonoValido(datos.telefono)) {
      setError("Ingresa un teléfono válido (8 a 12 dígitos).");
      return;
    }
    if (!correoValido(datos.correo)) {
      setError("Ingresa un correo válido.");
      return;
    }
    if (/\s/.test(datos.usuario.trim())) {
      setError("El usuario no puede tener espacios.");
      return;
    }
    setEnviando(true);
    const resultado = await crearSolicitudAcceso(datos);
    if (!resultado.ok) {
      setEnviando(false);
      setError(resultado.error);
      return;
    }
    setEnviando(false);
    notificar("Solicitud enviada correctamente.");
    onEnviada(resultado.solicitud);
  }

  return (
    <form className="pub-form" onSubmit={enviar} noValidate>
      <div className="row g-2">
        <div className="col-12 col-md-6">
          <label htmlFor="pub-nombre" className="form-label">Nombre</label>
          <input id="pub-nombre" name="nombre" className="form-control" autoComplete="given-name" value={datos.nombre} onChange={cambiar} />
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="pub-apellido" className="form-label">Apellido</label>
          <input id="pub-apellido" name="apellido" className="form-control" autoComplete="family-name" value={datos.apellido} onChange={cambiar} />
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="pub-rut" className="form-label">RUT</label>
          <input id="pub-rut" name="rut" className="form-control" placeholder="12.345.678-5" autoComplete="off" value={datos.rut} onChange={cambiar} />
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="pub-telefono" className="form-label">Teléfono</label>
          <input id="pub-telefono" name="telefono" type="tel" className="form-control" placeholder="+56 9 1234 5678" autoComplete="tel" value={datos.telefono} onChange={cambiar} />
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="pub-correo" className="form-label">Correo</label>
          <input id="pub-correo" name="correo" type="email" className="form-control" autoComplete="email" value={datos.correo} onChange={cambiar} />
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="pub-usuario" className="form-label">Usuario que quieres usar</label>
          <input id="pub-usuario" name="usuario" className="form-control" autoComplete="off" value={datos.usuario} onChange={cambiar} />
        </div>
        <div className="col-12">
          <label htmlFor="pub-motivo" className="form-label">Motivo de la solicitud</label>
          <textarea id="pub-motivo" name="motivo" rows="3" className="form-control" value={datos.motivo} onChange={cambiar} />
        </div>
      </div>
      {error && (
        <p className="pub-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn pub-boton mt-3" disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar mi solicitud"}
      </button>
    </form>
  );
}

function ConsultaEstado({ correoInicial, codigoInicial }) {
  const { notificar } = useToast();
  const [correo, setCorreo] = useState(correoInicial);
  const [codigo, setCodigo] = useState(codigoInicial);
  const [validado, setValidado] = useState(null); // { correo, codigo } ya comprobados
  const [error, setError] = useState("");

  const [solicitud, setSolicitud] = useState(null);
  const [ejemplos, setEjemplos] = useState([]);

  // Se vuelve a consultar al servidor cada pocos segundos, para ver los cambios del administrador.
  useEffect(() => {
    let activo = true;
    async function actualizar() {
      const [lista, actual] = await Promise.all([
        ejemplosConsulta(),
        validado ? consultarSolicitud(validado.correo, validado.codigo) : null,
      ]);
      if (!activo) return;
      setEjemplos(lista);
      if (validado) setSolicitud(actual);
    }
    actualizar();
    const intervalo = setInterval(actualizar, 10000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [validado]);

  async function validar(correoIngresado, codigoIngresado) {
    const encontrada = await consultarSolicitud(correoIngresado, codigoIngresado);
    if (!encontrada) {
      setValidado(null);
      setSolicitud(null);
      setError("El correo o el código no coinciden con ninguna solicitud.");
      return;
    }
    setError("");
    setSolicitud(encontrada);
    setValidado({ correo: correoIngresado, codigo: codigoIngresado });
    notificar("Código validado. Aquí está el estado de tu solicitud.");
  }

  function consultar(evento) {
    evento.preventDefault();
    validar(correo, codigo);
  }

  function usarEjemplo(ejemplo) {
    setCorreo(ejemplo.correo);
    setCodigo(ejemplo.codigo);
    validar(ejemplo.correo, ejemplo.codigo);
  }

  return (
    <>
      <form className="pub-form" onSubmit={consultar} noValidate>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-5">
            <label htmlFor="est-correo" className="form-label">Correo</label>
            <input id="est-correo" type="email" className="form-control" autoComplete="email" value={correo} onChange={(e) => { setCorreo(e.target.value); setError(""); }} />
          </div>
          <div className="col-7 col-md-4">
            <label htmlFor="est-codigo" className="form-label">Código</label>
            <input id="est-codigo" className="form-control text-uppercase" autoComplete="off" maxLength={6} value={codigo} onChange={(e) => { setCodigo(e.target.value); setError(""); }} />
          </div>
          <div className="col-5 col-md-3">
            <button type="submit" className="btn pub-boton w-100">Ver estado</button>
          </div>
        </div>
        {error && (
          <p className="pub-error" role="alert">
            {error}
          </p>
        )}
      </form>

      {ejemplos.length > 0 && (
        <details className="pub-ejemplos">
          <summary>Solicitudes de ejemplo para probar</summary>
          <p className="small text-secondary mb-2">
            Personas ya registradas en el sistema. Pulsa «Consultar» para ver su estado sin escribir el correo ni el código.
          </p>
          <div className="pub-ejemplos__lista">
            {ejemplos.map((ejemplo) => (
              <div key={ejemplo.id} className="pub-ejemplos__fila">
                <div className="pub-ejemplos__persona">
                  <strong>{ejemplo.nombre}</strong>
                  <span className="small text-secondary">{ejemplo.correo} · Código {ejemplo.codigo}</span>
                </div>
                <span className={`badge ${claseEstado(ejemplo.estado)}`}>{ejemplo.estado}</span>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => usarEjemplo(ejemplo)}
                  aria-label={`Consultar solicitud de ${ejemplo.nombre}`}
                >
                  Consultar
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {solicitud && (
        <div className="pub-resultado" aria-live="polite">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <h3 className="h5 mb-0">Solicitud de {nombreCompleto(solicitud)}</h3>
            <span className={`badge ${claseEstado(solicitud.estado)}`}>{solicitud.estado}</span>
          </div>
          <p className="small text-secondary mb-3">
            Usuario solicitado: <strong>{solicitud.usuario}</strong> · Enviada el {formatearFecha(solicitud.fecha)}
          </p>

          {solicitud.estado === "Aceptada" && solicitud.credenciales && (
            <div className="pub-credenciales">
              <h4 className="h6">¡Tu solicitud fue aprobada! Estos son tus datos para iniciar sesión:</h4>
              <dl className="pub-credenciales__datos">
                <dt>Usuario</dt>
                <dd>{solicitud.credenciales.usuario}</dd>
                <dt>Contraseña</dt>
                <dd>{solicitud.credenciales.clave}</dd>
              </dl>
              <Link to="/" className="btn pub-boton btn-sm">Ir al inicio de sesión</Link>
            </div>
          )}
          {solicitud.estado === "Rechazada" && (
            <p className="pub-aviso-rechazo">Tu solicitud no fue aprobada. Revisa los comentarios del administrador.</p>
          )}
          {solicitud.estado === "Pendiente" && (
            <p className="text-secondary">Tu solicitud está en revisión. Esta página se actualiza sola cuando el administrador la responda.</p>
          )}

          <h4 className="h6 mt-3">Comentarios</h4>
          {solicitud.comentarios.length === 0 ? (
            <p className="text-secondary small mb-0">Aún no hay comentarios.</p>
          ) : (
            <ul className="pub-comentarios">
              {solicitud.comentarios.map((c, i) => (
                <li key={i} className={c.sistema ? "pub-comentarios__sistema" : ""}>
                  <span className="pub-comentarios__meta">
                    {c.autor} · {formatearFecha(c.fecha)}
                  </span>
                  {c.texto}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function SolicitudAccesoPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab = TABS.includes(tabParam) ? tabParam : "enviar";

  // Datos de la última solicitud enviada, para no volver a escribirlos en las otras pestañas.
  const [reciente, setReciente] = useState({ correo: "", codigo: "" });

  function irA(nuevaTab) {
    setParams({ tab: nuevaTab });
  }

  const itemsNav = [
    { id: "enviar", texto: "Solicitar acceso", icono: "send" },
    { id: "estado", texto: "Estado de solicitud", icono: "search" },
  ];

  const titulos = {
    enviar: ["Solicitar acceso", "Completa el formulario. Un administrador revisará tu solicitud y te avisaremos por correo."],
    estado: ["Estado de solicitud", "Ingresa tu correo y el código que te enviamos para ver el estado y los comentarios."],
  };

  return (
    <div className="pub-app">
      <nav className="pub-rail" aria-label="Accesos rápidos">
        <button type="button" className="pub-rail__btn" aria-label="Ir al inicio de sesión" onClick={() => navigate("/")}>
          <Icon nombre="home" size={20} />
          <span className="pub-rail__texto">Inicio de sesión</span>
        </button>
        {itemsNav.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`pub-rail__btn ${tab === item.id ? "activo" : ""}`}
            aria-label={item.texto}
            onClick={() => irA(item.id)}
          >
            <Icon nombre={item.icono} size={20} />
            <span className="pub-rail__texto">{item.texto}</span>
          </button>
        ))}
      </nav>

      <div className="pub-cuerpo">
        <div className="pub-grid">
          <main className="pub-main">
            <FechaHora className="pub-fecha" />
            <h1 className="pub-titulo">{titulos[tab][0]}</h1>
            <p className="pub-intro">{titulos[tab][1]}</p>

            <section className="pub-tarjeta">
              <div className="pub-tarjeta__color">
                <Ilustracion tipo={tab === "estado" ? "estado" : "enviar"} />
              </div>
              <div className="pub-tarjeta__contenido">
                <h2 className="pub-tarjeta__titulo">
                  {tab === "enviar" ? "Formulario de solicitud" : "Consulta con tu código"}
                </h2>
                {tab === "enviar" && (
                  <FormularioEnvio
                    onEnviada={(solicitud) => {
                      setReciente({ correo: solicitud.correo, codigo: "" });
                      irA("estado");
                    }}
                  />
                )}
                {tab === "estado" && <ConsultaEstado correoInicial={reciente.correo} codigoInicial={reciente.codigo} />}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default SolicitudAccesoPage;
