import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoAquachile from "../assets/logo-aquachile.png";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080";

function modalidadTexto(valor) {
  if (valor === "HIBRIDA") {
    return "Híbrida";
  }

  if (valor === "REMOTA") {
    return "Remota";
  }

  if (valor === "PRESENCIAL") {
    return "Presencial";
  }

  return valor || "No informada";
}

export default function OportunidadesPage({ ofertaId }) {
  const navigate = useNavigate();

  const [ofertas, setOfertas] =
    useState([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [categoria, setCategoria] =
    useState("");

  const [seleccion, setSeleccion] =
    useState(null);

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  useEffect(() => {
    let activa = true;
    document.title = ofertaId ? "Oferta laboral | AquaChile" : "Empleos | AquaChile";
    const ruta = ofertaId
      ? `${API}/api/publico/ofertas/${encodeURIComponent(ofertaId)}`
      : `${API}/api/publico/ofertas`;
    fetch(ruta)
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok) {
          throw new Error(datos.message || "No se pudieron cargar las ofertas.");
        }
        if (!activa) return;
        if (ofertaId) {
          setSeleccion(datos);
        } else {
          setSeleccion(null);
          setOfertas(Array.isArray(datos) ? datos : []);
        }
        setMensaje("");
      })
      .catch((error) => {
        if (activa) setMensaje(error.message);
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, [ofertaId]);

  const categorias = useMemo(() => {

    return [
      ...new Set(
        ofertas
          .map(
            (oferta) =>
              oferta.categoria
          )
          .filter(Boolean)
      ),
    ];

  }, [ofertas]);

  const filtradas = useMemo(() => {

    const texto =
      busqueda.toLowerCase();

    return ofertas.filter(
      (oferta) => {

        const coincideBusqueda =
          !texto ||
          [
            oferta.titulo,
            oferta.ubicacion,
            oferta.descripcion,
            oferta.categoria,
          ].some((valor) =>
            String(valor || "")
              .toLowerCase()
              .includes(texto)
          );

        const coincideCategoria =
          !categoria ||
          oferta.categoria === categoria;

        return (
          coincideBusqueda &&
          coincideCategoria
        );
      }
    );

  }, [
    ofertas,
    busqueda,
    categoria,
  ]);

  function verDetalle(oferta) {
    setMensaje("");
    setMostrarFormulario(false);
    setCargando(true);
    navigate(`/empleos/${encodeURIComponent(oferta.id)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function postular(evento) {

    evento.preventDefault();

    setMensaje("");

    const formulario =
      new FormData(
        evento.currentTarget
      );

    const cv = formulario.get("cv");
    if (cv?.size) {
      if (!cv.name.toLowerCase().endsWith(".pdf") || (cv.type && cv.type !== "application/pdf")) {
        setMensaje("El CV debe ser un archivo PDF.");
        return;
      }
      if (cv.size > 10 * 1024 * 1024) {
        setMensaje("El CV no puede superar los 10 MB.");
        return;
      }
    }

    try {

      const respuesta =
        await fetch(
          `${API}/api/publico/postulaciones`,
          {
            method: "POST",
            body: formulario,
          }
        );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.message ||
          "No fue posible postular."
        );
      }

      setMensaje(
        `Postulación enviada correctamente. Código: ${datos.postulacionId}`
      );

      setMostrarFormulario(false);

    } catch (error) {
      setMensaje(error.message);
    }
  }

  return (
    <div className="portal-empleo">

      <header className="portal-header">
        <div className="container py-3 d-flex justify-content-between align-items-center">
          <Link className="portal-brand" to="/empleos" aria-label="AquaChile Empleos">
            <img src={logoAquachile} alt="" />
            <span>AquaChile <strong>Empleos</strong></span>
          </Link>
          <Link to="/acceso" className="btn btn-outline-light">Acceso equipo</Link>
        </div>
      </header>

      <section className="portal-hero">

        <div className="container py-5 text-center">

          <h1 className="display-5 fw-bold">
            Oportunidades laborales
          </h1>

          <p className="lead">
            Encuentra oportunidades para
            formar parte de AquaChile.
          </p>

          {!seleccion && (

            <div className="row g-2 justify-content-center mt-4">

              <div className="col-12 col-md-6">

                <input
                  type="search"
                  className="form-control form-control-lg"
                  placeholder="Buscar cargo o ubicación..."
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="col-12 col-md-4">

                <select
                  className="form-select form-select-lg"
                  value={categoria}
                  onChange={(e) =>
                    setCategoria(
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Todas las categorías
                  </option>

                  {categorias.map(
                    (item) => (

                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>

                    )
                  )}

                </select>

              </div>

            </div>

          )}

        </div>

      </section>

      <main className="container py-4">

        {mensaje && (

          <div className="alert alert-info">
            {mensaje}
          </div>

        )}

        {seleccion ? (

          <>

            <section className="card shadow-sm border-0 mb-4">

              <div className="card-body p-4">

                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm mb-3"
                  onClick={() => {
                    setSeleccion(null);
                    setMostrarFormulario(false);
                    setCargando(true);
                    navigate("/empleos");
                  }}
                >
                  ← Volver a oportunidades
                </button>

                <span className="badge text-bg-primary mb-2">
                  {seleccion.categoria}
                </span>

                <h2>
                  {seleccion.titulo}
                </h2>

                <p className="text-secondary">
                  {seleccion.ubicacion}
                  {" · "}
                  {modalidadTexto(
                    seleccion.modalidad
                  )}
                </p>

                <div className="row g-3 my-3">

                  <div className="col-md-4">
                    <strong>
                      Cupos
                    </strong>

                    <p>
                      {seleccion.cupos}
                    </p>
                  </div>

                  <div className="col-md-4">
                    <strong>
                      Publicación
                    </strong>

                    <p>
                      {
                        seleccion.fechaPublicacion
                      }
                    </p>
                  </div>

                  <div className="col-md-4">
                    <strong>
                      Rango salarial
                    </strong>

                    <p>
                      {
                        seleccion.rangoSalarial
                      }
                    </p>
                  </div>

                </div>

                <h3 className="h5">
                  Descripción
                </h3>

                <p>
                  {seleccion.descripcion}
                </p>

                <h3 className="h5">
                  Funciones principales
                </h3>

                <p>
                  {
                    seleccion.funcionesPrincipales
                  }
                </p>

                <h3 className="h5">
                  Requisitos
                </h3>

                <p>
                  {seleccion.requisitos}
                </p>

                <h3 className="h5">
                  Beneficios
                </h3>

                <p>
                  {seleccion.beneficios}
                </p>

                <button
                  type="button"
                  className="btn btn-success btn-lg"
                  onClick={() =>
                    setMostrarFormulario(true)
                  }
                >
                  Postular a esta oferta
                </button>

              </div>

            </section>

            {mostrarFormulario && (

              <section className="card shadow-sm">

                <div className="card-body">

                  <h2 className="h4">
                    Postular a{" "}
                    {seleccion.titulo}
                  </h2>

                  <form
                    onSubmit={postular}
                  >

                    <input
                      type="hidden"
                      name="ofertaId"
                      value={seleccion.id}
                    />

                    <label className="form-label" htmlFor="postulacion-nombre">
                      Nombre completo
                    </label>

                    <input
                      id="postulacion-nombre"
                      name="nombre"
                      className="form-control mb-3"
                      required
                    />

                    <label className="form-label" htmlFor="postulacion-correo">
                      Correo
                    </label>

                    <input
                      id="postulacion-correo"
                      name="correo"
                      type="email"
                      className="form-control mb-3"
                      required
                    />

                    <label className="form-label">
                      Teléfono
                    </label>

                    <input
                      name="telefono"
                      className="form-control mb-3"
                    />

                    <label className="form-label">
                      RUT
                    </label>

                    <input
                      name="rut"
                      className="form-control mb-3"
                    />

                    <label className="form-label" htmlFor="postulacion-mensaje">
                      Cuéntanos brevemente sobre ti <span className="text-secondary">(opcional)</span>
                    </label>
                    <textarea
                      id="postulacion-mensaje"
                      name="mensaje"
                      rows="4"
                      maxLength={1500}
                      className="form-control mb-3"
                    />

                    <label className="form-label">
                      CV en PDF (opcional, máximo 10 MB)
                    </label>

                    <input
                      name="cv"
                      type="file"
                      accept=".pdf,application/pdf"
                      className="form-control mb-3"
                    />
                    <p className="small text-secondary">
                      Puedes adjuntarlo ahora o continuar sin CV.
                    </p>

                    <button
                      type="submit"
                      className="btn btn-success"
                    >
                      Enviar postulación
                    </button>

                  </form>

                </div>

              </section>

            )}

          </>

        ) : (

          <>

            <div className="d-flex justify-content-between mb-3">

              <h2 className="h4">
                Ofertas disponibles
              </h2>

              <span className="text-secondary">
                {filtradas.length} resultado(s)
              </span>

            </div>

            {cargando && (
              <p>
                Cargando ofertas...
              </p>
            )}

            <div className="row g-3">

              {filtradas.map(
                (oferta) => (

                  <div
                    className="col-12 col-md-6 col-lg-4"
                    key={oferta.id}
                  >

                    <article className="card h-100 shadow-sm border-0 oferta-publica-card">

                      <div className="card-body d-flex flex-column">

                        <span className="badge text-bg-light border align-self-start mb-3">
                          {
                            oferta.categoria
                          }
                        </span>

                        <h3 className="h5">
                          {oferta.titulo}
                        </h3>

                        <p className="text-secondary">
                          {oferta.ubicacion}
                        </p>

                        <p className="text-secondary">
                          {modalidadTexto(
                            oferta.modalidad
                          )}
                        </p>

                        <p className="flex-grow-1">
                          {
                            oferta.descripcion
                          }
                        </p>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() =>
                            verDetalle(
                              oferta
                            )
                          }
                        >
                          Ver detalle
                        </button>

                      </div>

                    </article>

                  </div>

                )
              )}

            </div>

          </>

        )}

      </main>

      <footer className="portal-footer">

        <div className="container py-4 text-center">
          AquaChile · Portal público de
          oportunidades laborales
        </div>

      </footer>

    </div>
  );
}

