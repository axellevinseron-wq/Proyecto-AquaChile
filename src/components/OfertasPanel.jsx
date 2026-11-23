import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../apiClient";

// se agrego CATEGORIAS por que agregar una familia mal escrita se agrega como nueva
const CATEGORIAS=[
    "Tecnología",
    "Operaciones",
    "Recursos Humanos",
    "Logistica",
    "Produccion",
    "Administracion",
];


const FORM_INICIAL = {
  titulo: "",
  categoria: "",
  ubicacion: "",
  modalidad: "PRESENCIAL",
  fechaPublicacion: "",
  cupos: 1,
  descripcion: "",
  funcionesPrincipales: "",
  requisitos: "",
  beneficios: "",
  rangoSalarial: "",
  publicada: false,
};

function normalizarFormulario(oferta = {}) {
  return {
    titulo: oferta.titulo || "",
    categoria: oferta.categoria || "",
    ubicacion: oferta.ubicacion || "",
    modalidad: oferta.modalidad || "PRESENCIAL",
    fechaPublicacion: oferta.fechaPublicacion || "",
    cupos: oferta.cupos ?? 1,
    descripcion: oferta.descripcion || "",
    funcionesPrincipales: oferta.funcionesPrincipales || "",
    requisitos: oferta.requisitos || "",
    beneficios: oferta.beneficios || "",
    rangoSalarial: oferta.rangoSalarial || "",
    publicada: Boolean(oferta.publicada),
  };
}

function crearPayload(formulario, publicada = formulario.publicada) {
  return {
    titulo: formulario.titulo.trim(),
    categoria: formulario.categoria.trim(),
    ubicacion: formulario.ubicacion.trim(),
    modalidad: formulario.modalidad,
    fechaPublicacion: formulario.fechaPublicacion || null,
    cupos: Number(formulario.cupos),
    descripcion: formulario.descripcion.trim(),
    funcionesPrincipales:
      formulario.funcionesPrincipales.trim(),
    requisitos: formulario.requisitos.trim(),
    beneficios: formulario.beneficios.trim(),
    rangoSalarial: formulario.rangoSalarial.trim(),
    publicada,
  };
}

function OfertasPanel({ sesion }) {
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("TODAS");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [editandoId, setEditandoId] = useState(null);

  const [formulario, setFormulario] =
    useState(FORM_INICIAL);

  const [guardando, setGuardando] = useState(false);

  const puedeAdministrar = [
    "ADMIN",
    "ANALISTA_RECLUTAMIENTO",
  ].includes(sesion?.rolApi);

  async function cargarOfertas() {
    setCargando(true);
    setError("");

    try {
      const datos = await apiFetch("/api/ofertas");

      setOfertas(
        Array.isArray(datos) ? datos : []
      );
    } catch (error) {
      setError(
        error.message ||
          "No se pudieron cargar las ofertas."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarOfertas();
  }, []);

  const ofertasFiltradas = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    return ofertas.filter((oferta) => {
      const coincideTexto =
        !texto ||
        [
          oferta.titulo,
          oferta.categoria,
          oferta.ubicacion,
          oferta.modalidad,
        ].some((valor) =>
          String(valor || "")
            .toLowerCase()
            .includes(texto)
        );

      const coincideEstado =
        estado === "TODAS" ||
        (estado === "PUBLICADAS" &&
          oferta.publicada) ||
        (estado === "BORRADOR" &&
          !oferta.publicada);

      return coincideTexto && coincideEstado;
    });
  }, [ofertas, busqueda, estado]);

  function nuevaOferta() {
    setEditandoId(null);
    setFormulario(FORM_INICIAL);
    setMensaje("");
    setMostrarFormulario(true);
  }

  function editarOferta(oferta) {
    setEditandoId(oferta.id);

    setFormulario(
      normalizarFormulario(oferta)
    );

    setMensaje("");
    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cambiarCampo(evento) {
    const {
      name,
      value,
      type,
      checked,
    } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  async function guardarOferta(evento) {
    evento.preventDefault();

    if (!puedeAdministrar) {
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const ruta = editandoId
        ? `/api/ofertas/${editandoId}`
        : "/api/ofertas";

      const method = editandoId
        ? "PUT"
        : "POST";

      await apiFetch(ruta, {
        method,
        body: JSON.stringify(
          crearPayload(formulario)
        ),
      });

      setMensaje(
        editandoId
          ? "Oferta actualizada correctamente."
          : "Oferta creada correctamente."
      );

      setMostrarFormulario(false);
      setEditandoId(null);
      setFormulario(FORM_INICIAL);

      await cargarOfertas();
    } catch (error) {
      setError(
        error.message ||
          "No fue posible guardar la oferta."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarPublicacion(oferta) {
    if (!puedeAdministrar) {
      return;
    }

    const publicar = !oferta.publicada;

    setError("");
    setMensaje("");

    try {
      await apiFetch(
        `/api/ofertas/${oferta.id}`,
        {
          method: "PUT",

          body: JSON.stringify(
            crearPayload(
              normalizarFormulario(oferta),
              publicar
            )
          ),
        }
      );

      setMensaje(
        publicar
          ? `La oferta "${oferta.titulo}" fue publicada y ya aparecerá en el portal público.`
          : `La oferta "${oferta.titulo}" fue despublicada.`
      );

      await cargarOfertas();
    } catch (error) {
      setError(
        error.message ||
          "No fue posible cambiar la publicación."
      );
    }
  }

  async function eliminarOferta(oferta) {
    if (!puedeAdministrar) {
      return;
    }

    const confirmar = window.confirm(
      `¿Eliminar la oferta "${oferta.titulo}"?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await apiFetch(
        `/api/ofertas/${oferta.id}`,
        {
          method: "DELETE",
        }
      );

      setMensaje(
        "Oferta eliminada correctamente."
      );

      await cargarOfertas();
    } catch (error) {
      setError(
        error.message ||
          "No fue posible eliminar la oferta."
      );
    }
  }

  return (
    <section aria-labelledby="titulo-ofertas">

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">

        <div>
          <h1
            className="h3 mb-1"
            id="titulo-ofertas"
          >
            Ofertas laborales
          </h1>

          <p className="text-secondary mb-0">
            Administra las oportunidades que
            aparecerán en el portal público.
          </p>
        </div>

        {puedeAdministrar && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={nuevaOferta}
          >
            + Nueva oferta
          </button>
        )}

      </div>

      {mensaje && (
        <div
          className="alert alert-success"
          role="status"
        >
          {mensaje}
        </div>
      )}

      {error && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      )}

      {mostrarFormulario &&
        puedeAdministrar && (

          <form
            className="card card-body caja caja--azul mb-4"
            onSubmit={guardarOferta}
          >

            <div className="d-flex justify-content-between align-items-center mb-3">

              <h2 className="h5 mb-0">
                {editandoId
                  ? "Editar oferta"
                  : "Nueva oferta"}
              </h2>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() =>
                  setMostrarFormulario(false)
                }
              >
                Cerrar
              </button>

            </div>

            <div className="row g-3">

              <div className="col-12 col-md-6">
                <label
                  htmlFor="oferta-titulo"
                  className="form-label"
                >
                  Cargo
                </label>

                <input
                  id="oferta-titulo"
                  name="titulo"
                  className="form-control"
                  value={formulario.titulo}
                  onChange={cambiarCampo}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label
                  htmlFor="oferta-categoria"
                  className="form-label"
                >
                  Categoría / familia
                </label>

                <select
                    id="oferta-categoria"
                    name="categoria"
                    className="form-select"
                    value={formulario.categoria}
                    onChange={cambiarCampo}
                    required
                    >
                    <option value="">
                        Seleccione una categoría
                    </option>

                    {CATEGORIAS.map((categoria) => (
                        <option
                            key={categoria}
                            value={categoria}
                           >
                        {categoria}
                    </option>
                    ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label
                  htmlFor="oferta-ubicacion"
                  className="form-label"
                >
                  Ubicación
                </label>

                <input
                  id="oferta-ubicacion"
                  name="ubicacion"
                  className="form-control"
                  value={formulario.ubicacion}
                  onChange={cambiarCampo}
                  placeholder="Ej.: Puerto Montt"
                  required
                />
              </div>

              <div className="col-12 col-md-3">
                <label
                  htmlFor="oferta-modalidad"
                  className="form-label"
                >
                  Modalidad
                </label>

                <select
                  id="oferta-modalidad"
                  name="modalidad"
                  className="form-select"
                  value={formulario.modalidad}
                  onChange={cambiarCampo}
                >
                  <option value="PRESENCIAL">
                    Presencial
                  </option>

                  <option value="HIBRIDA">
                    Híbrida
                  </option>

                  <option value="REMOTA">
                    Remota
                  </option>

                </select>
              </div>

              <div className="col-12 col-md-3">
                <label
                  htmlFor="oferta-cupos"
                  className="form-label"
                >
                  Cupos
                </label>

                <input
                  id="oferta-cupos"
                  name="cupos"
                  type="number"
                  min="1"
                  className="form-control"
                  value={formulario.cupos}
                  onChange={cambiarCampo}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label
                  htmlFor="oferta-sueldo"
                  className="form-label"
                >
                  Sueldo o rango salarial
                </label>

                <input
                  id="oferta-sueldo"
                  name="rangoSalarial"
                  className="form-control"
                  value={formulario.rangoSalarial}
                  onChange={cambiarCampo}
                  placeholder="$1.300.000 - $1.600.000"
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label
                  htmlFor="oferta-fecha"
                  className="form-label"
                >
                  Fecha de publicación
                </label>

                <input
                  id="oferta-fecha"
                  name="fechaPublicacion"
                  type="date"
                  className="form-control"
                  value={formulario.fechaPublicacion}
                  onChange={cambiarCampo}
                />
              </div>

              <div className="col-12">
                <label
                  htmlFor="oferta-descripcion"
                  className="form-label"
                >
                  Descripción
                </label>

                <textarea
                  id="oferta-descripcion"
                  name="descripcion"
                  className="form-control"
                  rows="3"
                  value={formulario.descripcion}
                  onChange={cambiarCampo}
                  required
                />
              </div>

              <div className="col-12">
                <label
                  htmlFor="oferta-funciones"
                  className="form-label"
                >
                  Funciones principales
                </label>

                <textarea
                  id="oferta-funciones"
                  name="funcionesPrincipales"
                  className="form-control"
                  rows="3"
                  value={
                    formulario.funcionesPrincipales
                  }
                  onChange={cambiarCampo}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label
                  htmlFor="oferta-requisitos"
                  className="form-label"
                >
                  Requisitos
                </label>

                <textarea
                  id="oferta-requisitos"
                  name="requisitos"
                  className="form-control"
                  rows="4"
                  value={formulario.requisitos}
                  onChange={cambiarCampo}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label
                  htmlFor="oferta-beneficios"
                  className="form-label"
                >
                  Beneficios
                </label>

                <textarea
                  id="oferta-beneficios"
                  name="beneficios"
                  className="form-control"
                  rows="4"
                  value={formulario.beneficios}
                  onChange={cambiarCampo}
                  required
                />
              </div>

              <div className="col-12">

                <div className="form-check">

                  <input
                    id="oferta-publicada"
                    name="publicada"
                    type="checkbox"
                    className="form-check-input"
                    checked={formulario.publicada}
                    onChange={cambiarCampo}
                  />

                  <label
                    className="form-check-label"
                    htmlFor="oferta-publicada"
                  >
                    Publicar inmediatamente
                  </label>

                </div>

              </div>

            </div>

            <div className="mt-4">

              <button
                type="submit"
                className="btn btn-primary"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar oferta"}
              </button>

            </div>

          </form>
        )}

      <div className="card card-body caja caja--azul">

        <div className="row g-2 mb-3">

          <div className="col-12 col-md-8">

            <input
              type="search"
              className="form-control"
              placeholder="Buscar oferta..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
            />

          </div>

          <div className="col-12 col-md-4">

            <select
              className="form-select"
              value={estado}
              onChange={(e) =>
                setEstado(e.target.value)
              }
            >

              <option value="TODAS">
                Todas
              </option>

              <option value="PUBLICADAS">
                Publicadas
              </option>

              <option value="BORRADOR">
                Borradores
              </option>

            </select>

          </div>

        </div>

        {cargando ? (
          <p>Cargando ofertas...</p>
        ) : (

          <div className="table-responsive">

            <table className="table align-middle">

              <thead>
                <tr>
                  <th>Cargo</th>
                  <th>Categoría</th>
                  <th>Ubicación</th>
                  <th>Modalidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>

                {ofertasFiltradas.map(
                  (oferta) => (

                    <tr key={oferta.id}>

                      <td>
                        <strong>
                          {oferta.titulo}
                        </strong>
                      </td>

                      <td>
                        {oferta.categoria}
                      </td>

                      <td>
                        {oferta.ubicacion}
                      </td>

                      <td>
                        {oferta.modalidad}
                      </td>

                      <td>

                        <span
                          className={
                            oferta.publicada
                              ? "badge text-bg-success"
                              : "badge text-bg-secondary"
                          }
                        >
                          {oferta.publicada
                            ? "Publicada"
                            : "Borrador"}
                        </span>

                      </td>

                      <td>

                        <div className="d-flex flex-wrap gap-1">

                          {puedeAdministrar && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() =>
                                  editarOferta(oferta)
                                }
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                className={
                                  oferta.publicada
                                    ? "btn btn-sm btn-outline-warning"
                                    : "btn btn-sm btn-outline-success"
                                }
                                onClick={() =>
                                  cambiarPublicacion(
                                    oferta
                                  )
                                }
                              >
                                {oferta.publicada
                                  ? "Despublicar"
                                  : "Publicar"}
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                  eliminarOferta(oferta)
                                }
                              >
                                Eliminar
                              </button>
                            </>
                          )}

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </section>
  );
}

export default OfertasPanel;