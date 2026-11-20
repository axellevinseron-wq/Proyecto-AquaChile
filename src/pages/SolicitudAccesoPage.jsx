import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FechaHora } from "../components/Reloj";
import { correoValido, rutValido, telefonoValido } from "../logica";
import { crearSolicitudAccesoApi, consultarSolicitudAccesoApi } from "../solicitudesAccesoApi";
import "./SolicitudAccesoPage.css";

const INICIAL = { nombre: "", apellido: "", rut: "", telefono: "", correo: "", usuario: "", motivo: "" };

function formatearRut(valor) {
  const limpio = String(valor || "").replace(/[^\dkK]/g, "").toUpperCase().slice(0, 9);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${limpio.slice(-1)}`;
}

function formatearFecha(fecha) {
  if (!fecha) return "";
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime()) ? "" : valor.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function etiquetaEstado(estado) {
  return { PENDIENTE: "Pendiente", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada" }[estado] || estado;
}

function Formulario({ alCrear }) {
  const [datos, setDatos] = useState(INICIAL);
  const [error, setError] = useState("");
  const [cv, setCv] = useState(null);
  const [cargando, setCargando] = useState(false);
  const cambiar = (e) => {
    const { name, value } = e.target;
    setDatos((actual) => ({ ...actual, [name]: name === "rut" ? formatearRut(value) : value }));
    setError("");
  };

  async function enviar(e) {
    e.preventDefault();
    if (Object.values(datos).some((v) => !v.trim())) return setError("Completa todos los campos.");
    if (!cv) return setError("Debes adjuntar tu currículum vitae en PDF.");
    if (cv.size > 10 * 1024 * 1024) return setError("El CV no puede superar 10 MB.");
    if (!cv.name.toLowerCase().endsWith(".pdf") || cv.type && cv.type !== "application/pdf") return setError("El CV debe ser un archivo PDF.");
    if (!rutValido(datos.rut)) return setError("El RUT ingresado no es válido. Comprueba su dígito verificador.");
    if (!telefonoValido(datos.telefono)) return setError("Ingresa un teléfono válido, por ejemplo +56 9 1234 5678.");
    if (!correoValido(datos.correo)) return setError("Ingresa un correo electrónico válido.");
    if (/\s/.test(datos.usuario.trim())) return setError("El nombre de usuario no debe contener espacios.");
    setCargando(true);
    try {
      const resultado = await crearSolicitudAccesoApi(datos, cv);
      if (!resultado.codigoSeguimiento) throw new Error("El servidor no devolvió un código de seguimiento.");
      alCrear({ correo: datos.correo.trim(), codigo: resultado.codigoSeguimiento });
      setDatos(INICIAL);
    } catch (err) {
      setError(err.message || "No se pudo registrar la solicitud.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="sa-form">
      <div className="sa-form-grid">
        <label>Nombre <input name="nombre" autoComplete="given-name" value={datos.nombre} onChange={cambiar} required maxLength={100} /></label>
        <label>Apellido <input name="apellido" autoComplete="family-name" value={datos.apellido} onChange={cambiar} required maxLength={100} /></label>
        <label>RUT <input name="rut" placeholder="12.345.678-5" value={datos.rut} onChange={cambiar} required maxLength={12} /></label>
        <label>Teléfono <input name="telefono" type="tel" placeholder="+56 9 1234 5678" autoComplete="tel" value={datos.telefono} onChange={cambiar} required /></label>
        <label>Correo electrónico <input name="correo" type="email" autoComplete="email" value={datos.correo} onChange={cambiar} required maxLength={200} /></label>
        <label>Usuario solicitado <input name="usuario" autoComplete="off" value={datos.usuario} onChange={cambiar} required maxLength={80} /></label>
        <label className="sa-full">Motivo de la solicitud <textarea name="motivo" value={datos.motivo} onChange={cambiar} required rows={4} maxLength={2000} placeholder="Explica brevemente por qué necesitas acceder al sistema." /></label>
        <label className="sa-full sa-cv-label">Currículum vitae (obligatorio)
          <span className="sa-cv-hint">Adjunta tu CV en formato PDF, máximo 10 MB. Solo el administrador podrá descargarlo.</span>
          <input type="file" accept=".pdf,application/pdf" required onChange={(e) => { setCv(e.target.files?.[0] || null); setError(""); }} />
          {cv && <span className="sa-cv-selected">Archivo seleccionado: {cv.name}</span>}
        </label>
      </div>
      {error && <p className="sa-error" role="alert">{error}</p>}
      <div className="sa-actions"><button type="submit" disabled={cargando}>{cargando ? "Enviando solicitud…" : "Enviar solicitud"}</button></div>
    </form>
  );
}

function Estado({ inicial }) {
  const [correo, setCorreo] = useState(inicial.correo || "");
  const [codigo, setCodigo] = useState(inicial.codigo || "");
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function consultar(e) {
    e.preventDefault();
    setError("");
    setResultado(null);
    if (!correoValido(correo)) return setError("Ingresa un correo válido.");
    if (!codigo.trim()) return setError("Ingresa el código de seguimiento.");
    setCargando(true);
    try {
      setResultado(await consultarSolicitudAccesoApi(correo, codigo));
    } catch (err) {
      setError(err.message || "No fue posible consultar la solicitud.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <form className="sa-form" onSubmit={consultar}>
        <div className="sa-form-grid">
          <label>Correo electrónico <input type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required /></label>
          <label>Código de seguimiento <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} autoComplete="off" required placeholder="Código entregado al enviar" /></label>
        </div>
        {error && <p className="sa-error" role="alert">{error}</p>}
        <div className="sa-actions"><button type="submit" disabled={cargando}>{cargando ? "Consultando…" : "Consultar estado"}</button></div>
      </form>
      {resultado && <section className="sa-result" aria-live="polite">
        <div className="sa-result-head"><h3>Resultado de tu solicitud</h3><span className={`sa-status sa-status-${resultado.estado?.toLowerCase()}`}>{etiquetaEstado(resultado.estado)}</span></div>
        {resultado.fechaCreacion && <p><strong>Fecha de envío:</strong> {formatearFecha(resultado.fechaCreacion)}</p>}
        <p><strong>Comentarios del administrador:</strong> {resultado.comentarioAdministrador || "Todavía no hay comentarios."}</p>
        {resultado.estado === "ACEPTADA" && <p>Tu solicitud fue aceptada. Contacta al administrador para coordinar tus credenciales. <Link to="/">Volver al login</Link>.</p>}
      </section>}
    </>
  );
}

export default function SolicitudAccesoPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "estado" ? "estado" : "enviar";
  const [reciente, setReciente] = useState({ correo: "", codigo: "" });
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  const cambiarTab = (nuevo) => setParams({ tab: nuevo });
  const creada = (datos) => {
    setReciente(datos);
    setMostrarCodigo(true);
    cambiarTab("estado");
  };

  return (
    <div className="sa-page">
      <header className="sa-header">
        <Link to="/" className="sa-back">← Volver al inicio de sesión</Link>
        <span className="sa-brand">AquaChile · Acceso</span>
      </header>
      <main className="sa-main">
        <div className="sa-intro"><FechaHora /><h1>Solicitud de acceso</h1><p>Solicita una cuenta para acceder al sistema o consulta el estado de una solicitud existente.</p></div>
        <nav className="sa-tabs" aria-label="Solicitud de acceso">
          <button type="button" className={tab === "enviar" ? "sa-tab active" : "sa-tab"} aria-current={tab === "enviar" ? "page" : undefined} onClick={() => cambiarTab("enviar")}>Solicitud</button>
          <button type="button" className={tab === "estado" ? "sa-tab active" : "sa-tab"} aria-current={tab === "estado" ? "page" : undefined} onClick={() => cambiarTab("estado")}>Estado de solicitud</button>
        </nav>
        <section className="sa-card">
          <div className="sa-card-heading"><div className="sa-symbol" aria-hidden="true">{tab === "enviar" ? "✉" : "⌕"}</div><div><h2>{tab === "enviar" ? "Formulario de solicitud" : "Consulta tu solicitud"}</h2><p>{tab === "enviar" ? "Completa tus datos. Un administrador revisará tu solicitud." : "Ingresa tu correo y el código recibido al registrarte."}</p></div></div>
          {tab === "enviar" ? <Formulario alCrear={creada} /> : <>
            {mostrarCodigo && <div className="sa-success" role="status"><strong>Solicitud registrada correctamente.</strong><p>Guarda tu código de seguimiento. Lo necesitarás para consultar el estado de tu solicitud.</p><div className="sa-code">{reciente.codigo}</div><button type="button" className="sa-copy" onClick={() => navigator.clipboard?.writeText(reciente.codigo)}>Copiar código</button><p className="sa-small">Por ahora, el código se muestra aquí; el backend todavía no envía correos automáticamente.</p></div>}
            <Estado key={`${reciente.correo}-${reciente.codigo}`} inicial={reciente} />
          </>}
        </section>
      </main>
    </div>
  );
}
