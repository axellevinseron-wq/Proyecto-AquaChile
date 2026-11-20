import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import IndicadorCard from "../components/IndicadorCard";
import GestionPostgreSQL from "../components/GestionPostgreSQL";
import Calendario from "../components/Calendario";
import EstadisticaDia from "../components/EstadisticaDia";
import BarrasEstado from "../components/BarrasEstado";
import GraficoDiasMes from "../components/GraficoDiasMes";

import UltimasSolicitudes from "../components/UltimasSolicitudes";
import AccesoAdminPanel from "../components/AccesoAdminPanel";
import UsuariosPanel from "../components/UsuariosPanel";
import EvaluacionCvPage from "./EvaluacionCvPage";

import { apiFetch } from "../apiClient";
import { hoyClave } from "../fechas";
import { calcularIndicadores } from "../logica";

const VISTAS = ["inicio", "indicadores", "candidatos", "solicitudes", "evaluacion-cv"];
// Secciones que solo ven los administradores.
const VISTAS_ADMIN = ["cuentas", "usuarios"];

function DashboardPage({ sesion }) {
  const esAdmin = sesion.rol === "Administrador";
  // La sección que se muestra viene de la URL (/inicio, /candidatos, ...)
  const { vista } = useParams();
  const navigate = useNavigate();

  // Indicadores reales: PostgreSQL es la fuente de verdad. Las listas locales
  // siguen existiendo solo para los formularios heredados de otras secciones.
  const [datosReales, setDatosReales] = useState({ postulantes: [], postulaciones: [], solicitudes: [] });
  const [cargandoIndicadores, setCargandoIndicadores] = useState(true);
  const [errorIndicadores, setErrorIndicadores] = useState("");

  useEffect(() => {
    if (vista !== "inicio" && vista !== "indicadores") return undefined;
    let activo = true;
    Promise.all([
      apiFetch("/api/postulantes"),
      apiFetch("/api/postulaciones"),
      apiFetch("/api/solicitudes"),
    ]).then(([postulantes, postulaciones, solicitudesApi]) => {
      if (activo) {
        setDatosReales({ postulantes, postulaciones, solicitudes: solicitudesApi });
        setErrorIndicadores("");
        setCargandoIndicadores(false);
      }
    }).catch((error) => {
      if (activo) {
        setErrorIndicadores(error.message || "No se pudieron consultar los indicadores.");
        setCargandoIndicadores(false);
      }
    });
    return () => { activo = false; };
  }, [vista]);

  // Se presentan las postulaciones reales, incluidas las cargadas al iniciar
  // Spring Boot. Si una postulación tiene solicitud de evaluación, se usa
  // su estado y fecha. Las postulaciones sin solicitud cuentan como pendientes.
  const solicitudesReales = useMemo(() => {
    const nombres = new Map(datosReales.postulantes.map((p) => [p.id, p.nombre]));
    const evaluaciones = new Map(datosReales.solicitudes.map((s) => [s.postulacionId, s]));
    return datosReales.postulaciones.map((p) => {
      const evaluacion = evaluaciones.get(p.id);
      const estadoCrudo = String(evaluacion?.estado || p.estado || "PENDIENTE").toUpperCase();
      const estado = estadoCrudo.includes("FINAL") || estadoCrudo.includes("COMPLET") || estadoCrudo.includes("APROB")
          ? "Finalizada"
          : estadoCrudo.includes("PROCES") || estadoCrudo.includes("EVALUACION")
              ? "En proceso" : "Pendiente";
      return {
        id: p.id,
        candidatoId: p.postulanteId,
        candidato: nombres.get(p.postulanteId) || "Postulante",
        cargo: "Postulación",
        estado,
        // La entidad Postulacion no almacena fecha de creación. No inventar fechas.
        fechaSolicitud: evaluacion?.fechaSolicitud || "",
      };
    });
  }, [datosReales]);

  const indicadoresReales = useMemo(() => calcularIndicadores(datosReales.postulantes, solicitudesReales), [datosReales.postulantes, solicitudesReales]);
  const conteosReales = useMemo(() => {
    const conteos = {};
    solicitudesReales.forEach((s) => {
      if (s.fechaSolicitud) conteos[s.fechaSolicitud] = (conteos[s.fechaSolicitud] || 0) + 1;
    });
    return conteos;
  }, [solicitudesReales]);

  const [diaElegido, setDiaElegido] = useState(hoyClave);

  // Si la URL no es una sección válida, o el usuario no tiene permiso para verla, vuelve al inicio.
  const esVistaAdmin = VISTAS_ADMIN.includes(vista);
  const permitida =
      vista === "inicio" ||
      (VISTAS.includes(vista) && sesion.permisos?.[vista === "evaluacion-cv" ? "candidatos" : vista] !== false) ||
      (esVistaAdmin && esAdmin);
  if (!permitida) {
    return <Navigate to="/inicio" replace />;
  }

  const estadoIndicadores = cargandoIndicadores
      ? <p role="status">Cargando indicadores desde PostgreSQL…</p>
      : errorIndicadores
          ? <div role="alert" className="alert alert-danger">No se pudieron cargar los indicadores: {errorIndicadores}</div>
          : null;

  const tarjetas = (
      <section className="row g-3 mb-4" aria-label="Indicadores del proceso">
        {indicadoresReales.map((indicador) => (
            <IndicadorCard
                key={indicador.id}
                valor={indicador.valor}
                titulo={indicador.titulo}
                color={indicador.color}
            />
        ))}
      </section>
  );

  return (
      <main className="contenido">
        {vista === "inicio" && (
            <>
              <h1 className="h3 mb-3">Inicio</h1>
              {estadoIndicadores}
              {!cargandoIndicadores && !errorIndicadores && tarjetas}

              {!cargandoIndicadores && !errorIndicadores && <section className="row g-3" aria-label="Calendario y estadística diaria">
                <div className="col-12 col-lg-5">
                  <div className="card card-body caja caja--azul h-100">
                    <h2 className="h5 mb-3">Calendario</h2>
                    <Calendario
                        seleccionada={diaElegido}
                        onSeleccionar={setDiaElegido}
                        conteos={conteosReales}
                    />
                  </div>
                </div>
                <div className="col-12 col-lg-7">
                  <div className="card card-body caja caja--azul h-100">
                    <EstadisticaDia
                        fecha={diaElegido}
                        solicitudes={solicitudesReales}
                        totalCandidatos={datosReales.postulantes.length}
                    />
                  </div>
                </div>
              </section>}
            </>
        )}

        {vista === "indicadores" && (
            <>
              <h1 className="h3 mb-3">Indicadores</h1>
              {estadoIndicadores}
              {!cargandoIndicadores && !errorIndicadores && tarjetas}

              {!cargandoIndicadores && !errorIndicadores && <p className="small text-secondary">Las postulaciones se cuentan desde PostgreSQL. Las fechas solo aparecen cuando existe una solicitud de evaluación con fecha registrada.</p>}
              {!cargandoIndicadores && !errorIndicadores && <div className="row g-3">
                <div className="col-12 col-lg-6 d-flex flex-column gap-3">
                  <div className="card card-body caja caja--azul">
                    <h2 className="h5 mb-3">Postulaciones por estado</h2>
                    <BarrasEstado solicitudes={solicitudesReales} />
                  </div>

                  <div className="card card-body caja caja--azul">
                    <h2 className="h5 mb-3">Solicitudes de evaluación por día</h2>
                    <GraficoDiasMes solicitudes={solicitudesReales.filter((s) => s.fechaSolicitud)} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="card card-body caja caja--azul h-100">
                    <h2 className="h5 mb-3">Últimas solicitudes de evaluación</h2>
                    <UltimasSolicitudes solicitudes={solicitudesReales.filter((s) => s.fechaSolicitud)} />
                  </div>
                </div>
              </div>}
            </>
        )}

        {(vista === "candidatos" || vista === "solicitudes") && (
            <>
              <div className="gestion-cambio" role="group" aria-label="Cambiar entre candidatos y solicitudes">
                {[
                  { id: "candidatos", texto: "Candidatos" },
                  { id: "solicitudes", texto: "Solicitudes" },
                ]
                    .filter((opcion) => sesion.permisos?.[opcion.id] !== false)
                    .map((opcion) => (
                        <button
                            key={opcion.id}
                            type="button"
                            className={vista === opcion.id ? "gestion-cambio__boton activo" : "gestion-cambio__boton"}
                            aria-pressed={vista === opcion.id}
                            onClick={() => navigate("/" + opcion.id)}
                        >
                          {opcion.texto}
                        </button>
                    ))}
              </div>
              <GestionPostgreSQL key={vista} vista={vista} sesion={sesion} />
            </>
        )}

        {vista === "evaluacion-cv" && <EvaluacionCvPage />}

        {vista === "cuentas" && <AccesoAdminPanel autor={sesion.usuario} />}

        {vista === "usuarios" && <UsuariosPanel usuarioActual={sesion.usuario} />}

        <p className="small text-secondary mt-4 mb-0">
          Los postulantes, postulaciones, solicitudes de evaluación y solicitudes de acceso se consultan en PostgreSQL. Algunas preferencias auxiliares pueden permanecer en el navegador.
        </p>
      </main>
  );
}

export default DashboardPage;
