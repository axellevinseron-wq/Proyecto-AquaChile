import { useEffect, useState } from "react";
import { apiFetch, leerSesionApi } from "../apiClient";


function textoInforme(valor) {
  if (valor == null) return "";
  if (typeof valor === "string") return valor;
  if (Array.isArray(valor)) return valor.map(textoInforme).filter(Boolean).join("\n\n");
  if (typeof valor === "object") {
    if (typeof valor.resultado === "string") return valor.resultado;
    if (typeof valor.analisis === "string") return valor.analisis;
    if (typeof valor.resumen === "string") return valor.resumen;
    return Object.entries(valor)
      .filter(([clave]) => !["modelo", "modo", "proveedor", "advertencia", "revisionHumanaObligatoria"].includes(clave))
      .map(([clave, dato]) => `${clave.replace(/([A-Z])/g, " $1").replace(/^./, x => x.toUpperCase())}:\n${textoInforme(dato)}`)
      .filter(Boolean).join("\n\n");
  }
  return String(valor);
}

// Convierte el Markdown sencillo del backend en contenido accesible sin HTML inseguro.
function fragmentosEnNegrita(texto) {
  return String(texto).split(/(\*\*[^*]+\*\*)/g).map((parte, indice) =>
    parte.startsWith("**") && parte.endsWith("**")
      ? <strong key={indice}>{parte.slice(2, -2)}</strong>
      : <span key={indice}>{parte}</span>
  );
}

function bloquesInforme(analisis) {
  const texto = textoInforme(analisis)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  const lineas = texto.split("\n");
  const bloques = [];
  let indice = 0;
  while (indice < lineas.length) {
    const linea = lineas[indice].trim();
    if (!linea) { indice++; continue; }
    const titulo = linea.match(/^#{1,5}\s+(.+)$/);
    if (titulo) {
      bloques.push({ tipo: "titulo", texto: titulo[1] });
      indice++;
      continue;
    }
    if (/^[-*•]\s+/.test(linea) || /^\d+[.)]\s+/.test(linea)) {
      const numerada = /^\d+[.)]\s+/.test(linea);
      const items = [];
      while (indice < lineas.length) {
        const actual = lineas[indice].trim();
        if (!(numerada ? /^\d+[.)]\s+/ : /^[-*•]\s+/).test(actual)) break;
        items.push(actual.replace(numerada ? /^\d+[.)]\s+/ : /^[-*•]\s+/, ""));
        indice++;
      }
      bloques.push({ tipo: numerada ? "numerada" : "lista", items });
      continue;
    }
    const parrafo = [linea];
    indice++;
    while (indice < lineas.length) {
      const siguiente = lineas[indice].trim();
      if (!siguiente || /^#{1,5}\s+/.test(siguiente) || /^[-*•]\s+/.test(siguiente) || /^\d+[.)]\s+/.test(siguiente)) break;
      parrafo.push(siguiente);
      indice++;
    }
    bloques.push({ tipo: "parrafo", texto: parrafo.join(" ") });
  }
  return bloques;
}

function InformeFormateado({ analisis }) {
  const bloques = bloquesInforme(analisis);
  return <div aria-live="polite" style={{ overflowWrap: "anywhere", lineHeight: 1.7 }}>
    {bloques.map((bloque, indice) => {
      if (bloque.tipo === "titulo") return (
        <h3 key={indice} className="h6 fw-bold mt-4 mb-2 pb-2 border-bottom"
          style={{ color: "var(--color-sistema, #087c72)" }}>
          {fragmentosEnNegrita(bloque.texto)}
        </h3>
      );
      if (bloque.tipo === "lista" || bloque.tipo === "numerada") {
        const Lista = bloque.tipo === "numerada" ? "ol" : "ul";
        return <Lista key={indice} className="mb-3 ps-4">
          {bloque.items.map((item, i) => <li key={i} className="mb-2">{fragmentosEnNegrita(item)}</li>)}
        </Lista>;
      }
      return <p key={indice} className="mb-3">{fragmentosEnNegrita(bloque.texto)}</p>;
    })}
  </div>;
}

// Los datos de esta pantalla provienen de Spring Boot, no de localStorage.
export default function EvaluacionCvPage() {
  const [postulaciones, setPostulaciones] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [postulantes, setPostulantes] = useState([]);
  const [seleccion, setSeleccion] = useState("");
  const [analisis, setAnalisis] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [analizando, setAnalizando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [similitud, setSimilitud] = useState(null);
  const [comparando, setComparando] = useState(false);
  const [error, setError] = useState("");

  async function cargarDatos() {
    setCargando(true);
    setError("");
    try {
      const [p, o, c] = await Promise.all([
        apiFetch("/api/postulaciones"),
        apiFetch("/api/ofertas"),
        apiFetch("/api/postulantes"),
      ]);
      if (!Array.isArray(p) || !Array.isArray(o) || !Array.isArray(c)) {
        throw new Error("El servidor devolvió un formato de datos inesperado.");
      }
      setPostulaciones(p);
      setOfertas(o);
      setPostulantes(c);
      setSeleccion((actual) => p.some((item) => String(item.id) === actual)
        ? actual : (p[0]?.id ? String(p[0].id) : ""));
    } catch (e) {
      setError(e.message || "No se pudieron cargar las postulaciones.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // La carga inicial se ejecuta una sola vez.
    let vigente = true;
    Promise.all([
      apiFetch("/api/postulaciones"),
      apiFetch("/api/ofertas"),
      apiFetch("/api/postulantes"),
    ]).then(([p, o, c]) => {
      if (!vigente) return;
      if (!Array.isArray(p) || !Array.isArray(o) || !Array.isArray(c)) {
        throw new Error("El servidor devolvió un formato de datos inesperado.");
      }
      setPostulaciones(p);
      setOfertas(o);
      setPostulantes(c);
      setSeleccion(p[0]?.id ? String(p[0].id) : "");
    }).catch((e) => {
      if (vigente) setError(e.message || "No se pudieron cargar las postulaciones.");
    }).finally(() => {
      if (vigente) setCargando(false);
    });
    return () => { vigente = false; };
  }, []);

  const postulacion = postulaciones.find((p) => String(p.id) === seleccion);
  const oferta = ofertas.find((o) => String(o.id) === String(postulacion?.ofertaId));
  const postulante = postulantes.find((p) => String(p.id) === String(postulacion?.postulanteId));

  async function descargarCv() {
    if (!seleccion || descargando) return;
    setDescargando(true);
    setError("");
    try {
      const token = leerSesionApi()?.token;
      if (!token) throw new Error("La sesión ha expirado. Inicia sesión nuevamente.");
      const base = import.meta.env.VITE_API_URL || "http://localhost:8080";
      const respuesta = await fetch(`${base}/api/postulaciones/${encodeURIComponent(seleccion)}/cv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!respuesta.ok) {
        if (respuesta.status === 404) throw new Error("Esta postulación no tiene un CV disponible para descargar.");
        if (respuesta.status === 401 || respuesta.status === 403) throw new Error("No tienes autorización para descargar este CV.");
        throw new Error(`No se pudo descargar el CV (HTTP ${respuesta.status}).`);
      }
      const archivo = await respuesta.blob();
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `CV-${seleccion}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message || "No se pudo descargar el CV.");
    } finally {
      setDescargando(false);
    }
  }

  async function comprobarSimilitud() {
    if (!seleccion) return;
    setComparando(true);
    setSimilitud(null);
    setError("");
    try {
      const datos = await apiFetch(`/api/ia/postulaciones/${encodeURIComponent(seleccion)}/similitud-cv`);
      setSimilitud(datos);
    } catch (e) {
      setError(e.message || "No fue posible comprobar la similitud.");
    } finally {
      setComparando(false);
    }
  }

  async function analizarCv() {
    if (!seleccion) return;
    setAnalizando(true);
    setError("");
    setAnalisis(null);
    try {
      const respuesta = await apiFetch(`/api/ia/postulaciones/${encodeURIComponent(seleccion)}/analizar-cv`, {
        method: "POST",
      });
      setAnalisis(respuesta);
    } catch (e) {
      setError(e.message || "No se pudo analizar el CV.");
    } finally {
      setAnalizando(false);
    }
  }

  return (
    <section aria-label="Evaluación de CV con IA">
      <h1 className="h3 mb-2">Evaluación de CV con IA</h1>
      <p className="text-secondary mb-4">
        Revisa postulaciones reales con apoyo de inteligencia artificial. La decisión final es humana.
      </p>

      <div className="row g-3 align-items-start mb-3">
      <div className="col-12 col-lg-6">
      <div className="card card-body caja caja--azul h-100">
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">
          <h2 className="h5 mb-0">Seleccionar postulación</h2>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={cargarDatos} disabled={cargando || analizando}>
            Actualizar lista
          </button>
        </div>
        {cargando ? <p role="status">Cargando postulaciones...</p> : (
          <>
            <label htmlFor="postulacion-ia" className="form-label">Postulación</label>
            <select
              id="postulacion-ia"
              className="form-select mb-3"
              value={seleccion}
              onChange={(e) => { setSeleccion(e.target.value); setAnalisis(null); setSimilitud(null); setError(""); }}
              disabled={analizando || postulaciones.length === 0}
            >
              {postulaciones.length === 0 && <option value="">No hay postulaciones registradas</option>}
              {postulaciones.map((p) => {
                const candidato = postulantes.find((x) => String(x.id) === String(p.postulanteId));
                const vacante = ofertas.find((x) => String(x.id) === String(p.ofertaId));
                return (
                  <option key={p.id} value={String(p.id)}>
                    {candidato?.nombre || "Postulante sin nombre"} — {vacante?.titulo || "Oferta sin título"} ({p.estado || "Sin estado"})
                  </option>
                );
              })}
            </select>
            {postulacion && (
              <div className="mb-3">
                <p className="mb-1"><strong>Postulante:</strong> {postulante?.nombre || "No disponible"}</p>
                <p className="mb-1"><strong>Oferta:</strong> {oferta?.titulo || "No disponible"}</p>
                <p className="mb-1"><strong>Estado:</strong> {postulacion.estado || "No disponible"}</p>
                <p className="small text-secondary mb-0">ID de postulación: {seleccion}</p>
              </div>
            )}
            <div className="d-grid gap-2">
              <button type="button" className="btn btn-primary" disabled={!seleccion || analizando} onClick={analizarCv}>
                {analizando ? "Analizando CV..." : "Analizar CV con IA"}
              </button>
              <button type="button" className="btn btn-outline-primary" disabled={!seleccion || descargando} onClick={descargarCv}>
                {descargando ? "Descargando CV..." : "Descargar CV original"}
              </button>
            </div>
          </>
        )}
        {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
      </div>

      </div>
      <div className="col-12 col-lg-6">
        <div className="card card-body caja caja--azul h-100">
          <h2 className="h5 fw-bold mb-2">Informe de evaluación</h2>
          <p className="small text-secondary">Texto generado por IA. Comprueba sus afirmaciones con el CV original.</p>
          {analisis === null ? (
            <p className="text-secondary">Selecciona una postulación y pulsa «Analizar CV con IA» para ver el informe aquí.</p>
          ) : (
            <div aria-live="polite">
              <div className="d-flex flex-wrap gap-2 mb-3">
                <span className="badge text-bg-light border">Informe orientativo</span>
                <span className="badge text-bg-light border">Revisión humana requerida</span>
              </div>
              <InformeFormateado analisis={analisis} />
            </div>
          )}
          <hr />
          <h3 className="h6 fw-bold">Similitud y posibles duplicados</h3>
          <button type="button" className="btn btn-outline-primary btn-sm mb-3"
            disabled={!seleccion || comparando} onClick={comprobarSimilitud}>
            {comparando ? "Comparando CV..." : "Comprobar similitud con otros CV"}
          </button>
          {similitud === null ? (
            <p className="small text-secondary mb-0">Comparación pendiente. No se debe concluir que existe copia sin verificar los documentos.</p>
          ) : (
            <div aria-live="polite">
              <p className="mb-2"><strong>Estado:</strong> {similitud.estado === "COMPLETO" ? "Comparación completada" : "Comparación parcial"}</p>
              <p className="small mb-2">CV comparados: {similitud.comparados}. Omitidos: {similitud.omitidos}.</p>
              {similitud.coincidencias?.length ? (
                <ul className="ps-4">
                  {similitud.coincidencias.map((item, i) => (
                    <li key={i} className="mb-2">
                      <strong>{item.tipo === "ARCHIVO_IDENTICO" ? "Archivo PDF idéntico" : "Posible similitud de texto"}</strong>
                      {` — ${item.similitud}% de coincidencia. Postulación: ${item.postulacionId}`}
                    </li>
                  ))}
                </ul>
              ) : <p className="mb-2">No se encontraron coincidencias por encima del umbral entre los CV comparados.</p>}
              <p className="small text-secondary mb-0">{similitud.advertencia}</p>
            </div>
          )}
        </div>
      </div>
      </div>
      <div className="alert alert-info" role="note">
        <strong>Revisión humana obligatoria.</strong> El análisis de IA puede contener errores u omisiones.
        No aprueba, rechaza ni modifica automáticamente el estado de una postulación.
        Actualmente el análisis automático solo admite CV en PDF.
      </div>
    </section>
  );
}

