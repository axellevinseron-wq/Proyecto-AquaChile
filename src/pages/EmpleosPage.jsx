import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { pedir } from "../api";
import Icon from "../components/Icon";
import logoAquachile from "../assets/logo-aquachile.png";

function claseArea(area) {
  const nombre = area.trim().toLocaleLowerCase("es-CL");
  if (nombre.includes("oper")) return "empleos__chip--operaciones";
  if (nombre.includes("mant")) return "empleos__chip--mantencion";
  if (nombre.includes("person")) return "empleos__chip--personas";
  return "empleos__chip--default";
}

function EmpleosPage() {
  const { ofertaId } = useParams();
  const [ofertas, setOfertas] = useState([]);
  const [oferta, setOferta] = useState(null);
  const [estadoCarga, setEstadoCarga] = useState("cargando");
  const [busqueda, setBusqueda] = useState("");
  const [formulario, setFormulario] = useState({ nombre: "", correo: "", telefono: "", mensaje: "" });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = oferta ? `${oferta.titulo} | AquaChile Empleos` : "AquaChile Empleos";
    return () => {
      document.title = tituloAnterior;
    };
  }, [oferta, ofertaId]);

  useEffect(() => {
    let activo = true;
    const ruta = ofertaId ? `/ofertas/${ofertaId}` : "/ofertas";
    pedir("GET", ruta).then((respuesta) => {
      if (!activo) return;
      if (!respuesta.ok) {
        setError(respuesta.datos?.error ?? "No se pudieron cargar las ofertas.");
        setEstadoCarga("error");
        return;
      }
      if (ofertaId) {
        setOferta(respuesta.datos.oferta);
      } else {
        setOfertas(respuesta.datos.items);
      }
      setEstadoCarga("listo");
    });
    return () => {
      activo = false;
    };
  }, [ofertaId]);

  const ofertasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es-CL");
    if (!texto) return ofertas;
    return ofertas.filter((item) =>
      [item.titulo, item.area, item.ubicacion].some((valor) =>
        valor.toLocaleLowerCase("es-CL").includes(texto),
      ),
    );
  }, [busqueda, ofertas]);

  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
    setError("");
  }

  async function postular(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError("");
    const respuesta = await pedir("POST", "/postulaciones", {
      ofertaId: oferta.id,
      ...formulario,
    });
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.datos?.error ?? "No se pudo enviar tu postulación.");
      return;
    }
    setMensaje("¡Listo! Recibimos tu postulación. Gracias por tu interés.");
    setFormulario({ nombre: "", correo: "", telefono: "", mensaje: "" });
  }

  return (
    <div className="empleos">
      <header className="empleos__barra">
        <Link className="empleos__marca" to="/empleos" aria-label="AquaChile Empleos">
          <img className="empleos__logo" src={logoAquachile} alt="" />
          <span className="empleos__marca-texto">AquaChile <strong>Empleos</strong></span>
        </Link>
        <Link className="empleos__acceso" to="/acceso">Acceso equipo</Link>
      </header>

      <main className="empleos__contenido">
        {!ofertaId ? (
          <>
            <section className="empleos__hero">
              <span className="empleos__eyebrow">PERSONAS QUE HACEN LA DIFERENCIA</span>
              <h1>Encuentra tu próximo desafío</h1>
              <p>Revisa las oportunidades disponibles y postula para ser parte de nuestro equipo.</p>
              <label className="empleos__busqueda">
                <span className="visually-hidden">Buscar ofertas</span>
                <span className="empleos__busqueda-icono" aria-hidden="true">
                  <Icon nombre="search" size={21} />
                </span>
                <input
                  type="search"
                  placeholder="Cargo, área o ubicación"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                />
              </label>
            </section>

            <section className="empleos__resultados" aria-labelledby="titulo-ofertas">
              <div className="empleos__encabezado-lista">
                <div>
                  <h2 id="titulo-ofertas">Oportunidades laborales</h2>
                  <p>Explora las vacantes que tenemos disponibles.</p>
                </div>
                {estadoCarga === "listo" && (
                  <span className="empleos__contador">{ofertasFiltradas.length} ofertas</span>
                )}
              </div>

              {estadoCarga === "cargando" && <p role="status">Cargando ofertas...</p>}
              {estadoCarga === "error" && <p className="empleos__error" role="alert">{error}</p>}
              {estadoCarga === "listo" && ofertasFiltradas.length === 0 && (
                <div className="empleos__vacio">
                  <h3>No encontramos ofertas</h3>
                  <p>Prueba con otro término o vuelve más adelante para ver nuevas oportunidades.</p>
                </div>
              )}
              {estadoCarga === "listo" && ofertasFiltradas.length > 0 && (
                <div className="empleos__rejilla">
                  {ofertasFiltradas.map((item) => (
                    <article className="empleos__tarjeta" key={item.id}>
                      <div className="empleos__tarjeta-top">
                        <span className="empleos__icono" aria-hidden="true">↗</span>
                        <div className="empleos__etiquetas-superiores">
                          <span className={`empleos__chip ${claseArea(item.area)}`}>{item.area}</span>
                        </div>
                      </div>
                      <h3>{item.titulo}</h3>
                      <p className="empleos__ubicacion">{item.ubicacion}</p>
                      <div className="empleos__etiquetas">
                        <span className={`empleos__chip empleos__chip--dato empleos__chip--${item.modalidad.toLocaleLowerCase("es-CL")}`}>
                          {item.modalidad}
                        </span>
                        <span className="empleos__chip empleos__chip--dato">{item.jornada}</span>
                      </div>
                      <Link className="empleos__ver" to={`/empleos/${item.id}`}>
                        <span>Ver oferta</span>
                        <span className="empleos__ver-flecha" aria-hidden="true">→</span>
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="empleos__detalle">
            <Link to="/empleos" className="empleos__volver">← Volver a las ofertas</Link>
            {estadoCarga === "cargando" && <p role="status">Cargando oferta...</p>}
            {estadoCarga === "error" && <p className="empleos__error" role="alert">{error}</p>}
            {estadoCarga === "listo" && oferta && (
              <>
                <div className="empleos__detalle-cabecera">
                  <div className="empleos__etiquetas-superiores">
                    <span className={`empleos__chip empleos__chip--detalle ${claseArea(oferta.area)}`}>{oferta.area}</span>
                  </div>
                  <h1>{oferta.titulo}</h1>
                  <p>{oferta.ubicacion}</p>
                  <div className="empleos__detalle-meta" aria-label="Condiciones del cargo">
                    <span className="empleos__chip empleos__chip--detalle-dato">{oferta.modalidad}</span>
                    <span className="empleos__chip empleos__chip--detalle-dato">{oferta.jornada}</span>
                  </div>
                </div>
                <div className="empleos__detalle-grid">
                  <article className="empleos__descripcion">
                    <h2>Sobre el cargo</h2>
                    <p>{oferta.descripcion}</p>
                    {oferta.requisitos && (
                      <>
                        <h2>Requisitos</h2>
                        <p>{oferta.requisitos}</p>
                      </>
                    )}
                    {oferta.fechaCierre && <p className="empleos__cierre">Postulaciones hasta el {oferta.fechaCierre}</p>}
                  </article>
                  <form className="empleos__formulario" onSubmit={postular}>
                    <h2>Postula a esta oferta</h2>
                    <p>Déjanos tus datos y el equipo de selección se pondrá en contacto contigo.</p>
                    {mensaje && (
                      <div className="empleos__exito" role="status">
                        <Icon nombre="check" size={18} />
                        <span>{mensaje}</span>
                      </div>
                    )}
                    <label>
                      Nombre completo
                      <input name="nombre" value={formulario.nombre} onChange={cambiarCampo} maxLength={120} required />
                    </label>
                    <label>
                      Correo electrónico
                      <input name="correo" type="email" autoComplete="email" value={formulario.correo} onChange={cambiarCampo} maxLength={200} required />
                    </label>
                    <label>
                      Teléfono
                      <input name="telefono" type="tel" autoComplete="tel" value={formulario.telefono} onChange={cambiarCampo} maxLength={40} required />
                    </label>
                    <label>
                      Cuéntanos brevemente sobre ti <span>(opcional)</span>
                      <textarea name="mensaje" rows="4" value={formulario.mensaje} onChange={cambiarCampo} maxLength={1500} />
                    </label>
                    {error && <p className="empleos__error" role="alert">{error}</p>}
                    <button type="submit" disabled={enviando}>
                      {enviando ? "Enviando..." : "Enviar postulación"}
                    </button>
                    <small>Al postular, autorizas al equipo de selección a contactarte sobre esta oportunidad.</small>
                  </form>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <footer className="empleos__pie">
        <span>AquaChile Empleos</span>
        <span>Oportunidades para crecer y aportar.</span>
      </footer>
    </div>
  );
}

export default EmpleosPage;
