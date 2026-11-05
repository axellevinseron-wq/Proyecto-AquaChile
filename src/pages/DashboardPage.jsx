import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import IndicadorCard from "../components/IndicadorCard";
import SolicitudesPanel from "../components/SolicitudesPanel";
import Calendario from "../components/Calendario";
import EstadisticaDia from "../components/EstadisticaDia";
import BarrasEstado from "../components/BarrasEstado";
import GraficoDiasMes from "../components/GraficoDiasMes";
import CandidatosPanel from "../components/CandidatosPanel";
import UltimasSolicitudes from "../components/UltimasSolicitudes";
import AccesoAdminPanel from "../components/AccesoAdminPanel";
import UsuariosPanel from "../components/UsuariosPanel";
import { useToast } from "../components/Toast";
import { useAlmacenApi } from "../useAlmacenApi";
import { hoyClave } from "../fechas";
import { calcularIndicadores, cambiarEstadoSolicitud, existeCorreo } from "../logica";

const VISTAS = ["inicio", "indicadores", "candidatos", "solicitudes"];
// Secciones que solo ven los administradores.
const VISTAS_ADMIN = ["cuentas", "usuarios"];

// Candidatos y solicitudes de evaluación se cargan desde el servidor (los datos de ejemplo están en server/seed.js).
const LISTA_VACIA = [];

function DashboardPage({ sesion }) {
  const esAdmin = sesion.rol === "Administrador";
  const { notificar } = useToast();
  // La sección que se muestra viene de la URL (/inicio, /candidatos, ...)
  const { vista } = useParams();
  const navigate = useNavigate();

  const avisarError = (mensaje) => notificar(mensaje, "error");
  const [candidatos, setCandidatos, estadoCandidatos] = useAlmacenApi("candidatos", LISTA_VACIA, avisarError);
  const [solicitudes, setSolicitudes, estadoSolicitudes] = useAlmacenApi("solicitudes", LISTA_VACIA, avisarError);

  // Mientras no elijas un día en el calendario, se muestra hoy (o el último día con solicitudes).
  const [diaManual, setDiaElegido] = useState(null);
  const diaElegido = useMemo(() => {
    if (diaManual) {
      return diaManual;
    }
    const hoy = hoyClave();
    if (solicitudes.some((s) => s.fechaSolicitud === hoy)) {
      return hoy;
    }
    return solicitudes.map((s) => s.fechaSolicitud).sort().at(-1) ?? hoy;
  }, [diaManual, solicitudes]);

  const solicitudesPorDia = useMemo(() => {
    const conteos = {};
    solicitudes.forEach((s) => {
      conteos[s.fechaSolicitud] = (conteos[s.fechaSolicitud] ?? 0) + 1;
    });
    return conteos;
  }, [solicitudes]);

  // Los indicadores se calculan desde las listas en lugar de escribir
  // manualmente sus valores. Así se actualizan al crear o cambiar registros.
  const indicadores = useMemo(
    () => calcularIndicadores(candidatos, solicitudes),
    [candidatos, solicitudes],
  );

  const candidatosConEstado = useMemo(
    () =>
      candidatos.map((candidato) => {
        const ultimaSolicitud = solicitudes.find(
          (solicitud) => solicitud.candidatoId === candidato.id,
        );
        return {
          ...candidato,
          estado: ultimaSolicitud?.estado ?? "Sin solicitud",
        };
      }),
    [candidatos, solicitudes],
  );

  function handleNuevoCandidato(datos) {
    const correo = datos.correo.trim();
    if (existeCorreo(candidatos, correo)) {
      return { ok: false, error: "Ya existe un candidato con ese correo." };
    }

    const nuevo = {
      id: candidatos.length ? Math.max(...candidatos.map((c) => c.id)) + 1 : 1,
      nombre: datos.nombre.trim(),
      correo,
      cargo: datos.cargo.trim(),
      familiaCargo: datos.familiaCargo.trim(),
    };
    setCandidatos((actuales) => [...actuales, nuevo]);
    notificar(`Candidato ${nuevo.nombre} guardado con éxito.`);
    return { ok: true };
  }

  function handleNuevaSolicitud(datosFormulario) {
    const candidatoSeleccionado = candidatos.find(
      (candidato) => candidato.id === Number(datosFormulario.candidatoId),
    );

    if (!candidatoSeleccionado) {
      return;
    }

    const hoy = new Date();
    const fechaLocal = [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, "0"),
      String(hoy.getDate()).padStart(2, "0"),
    ].join("-");

    const nuevaSolicitud = {
      id: solicitudes.length
        ? Math.max(...solicitudes.map((solicitud) => solicitud.id)) + 1
        : 1,
      candidatoId: candidatoSeleccionado.id,
      candidato: candidatoSeleccionado.nombre,
      cargo: datosFormulario.cargo.trim(),
      familiaCargo: datosFormulario.familiaCargo.trim(),
      estado: "Pendiente",
      responsable: datosFormulario.responsable.trim(),
      fechaSolicitud: fechaLocal,
    };

    setSolicitudes((solicitudesActuales) => [nuevaSolicitud, ...solicitudesActuales]);
    notificar("Solicitud de evaluación registrada con éxito.");
  }

  function handleCambiarEstado(solicitudId, nuevoEstado) {
    setSolicitudes((actuales) => cambiarEstadoSolicitud(actuales, solicitudId, nuevoEstado));
    notificar(`Estado actualizado a ${nuevoEstado}.`);
  }

  // Si la URL no es una sección válida, o el usuario no tiene permiso para verla, vuelve al inicio.
  const esVistaAdmin = VISTAS_ADMIN.includes(vista);
  const permitida =
    vista === "inicio" ||
    (VISTAS.includes(vista) && sesion.permisos?.[vista] !== false) ||
    (esVistaAdmin && esAdmin);
  if (!permitida) {
    return <Navigate to="/inicio" replace />;
  }

  // Las secciones del sistema usan estas dos listas: se espera a tenerlas antes de mostrarlas.
  if (estadoCandidatos === "error" || estadoSolicitudes === "error") {
    return (
      <main className="contenido">
        <p className="alert alert-danger" role="alert">
          No se pudieron cargar los datos. Revisa que el servidor esté encendido y vuelve a intentarlo.
        </p>
      </main>
    );
  }
  if (estadoCandidatos === "cargando" || estadoSolicitudes === "cargando") {
    return (
      <main className="contenido">
        <p className="text-secondary" role="status">Cargando datos...</p>
      </main>
    );
  }

  const tarjetas = (
    <section className="row g-3 mb-4" aria-label="Indicadores del proceso">
      {indicadores.map((indicador) => (
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
          {tarjetas}

          <section className="row g-3" aria-label="Calendario y estadística diaria">
            <div className="col-12 col-lg-5">
              <div className="card card-body caja caja--azul h-100">
                <h2 className="h5 mb-3">Calendario</h2>
                <Calendario
                  seleccionada={diaElegido}
                  onSeleccionar={setDiaElegido}
                  conteos={solicitudesPorDia}
                />
              </div>
            </div>
            <div className="col-12 col-lg-7">
              <div className="card card-body caja caja--azul h-100">
                <EstadisticaDia
                  fecha={diaElegido}
                  solicitudes={solicitudes}
                  totalCandidatos={candidatos.length}
                />
              </div>
            </div>
          </section>
        </>
      )}

      {vista === "indicadores" && (
        <>
          <h1 className="h3 mb-3">Indicadores</h1>
          {tarjetas}

          <div className="row g-3">
            <div className="col-12 col-lg-6 d-flex flex-column gap-3">
              <div className="card card-body caja caja--azul">
                <h2 className="h5 mb-3">Solicitudes por estado</h2>
                <BarrasEstado solicitudes={solicitudes} />
              </div>

              <div className="card card-body caja caja--azul">
                <h2 className="h5 mb-3">Solicitudes por día del mes</h2>
                <GraficoDiasMes solicitudes={solicitudes} />
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card card-body caja caja--azul h-100">
                <h2 className="h5 mb-3">Últimas solicitudes</h2>
                <UltimasSolicitudes solicitudes={solicitudes} />
              </div>
            </div>
          </div>
        </>
      )}

      {(vista === "candidatos" || vista === "solicitudes") && (
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
                className={`gestion-cambio__boton ${vista === opcion.id ? "activo" : ""}`}
                aria-pressed={vista === opcion.id}
                onClick={() => navigate(`/${opcion.id}`)}
              >
                {opcion.texto}
              </button>
            ))}
        </div>
      )}

      {vista === "candidatos" && (
        <CandidatosPanel
          candidatos={candidatosConEstado}
          solicitudes={solicitudes}
          onNuevoCandidato={handleNuevoCandidato}
        />
      )}

      {vista === "solicitudes" && (
        <SolicitudesPanel
          solicitudes={solicitudes}
          candidatos={candidatos}
          onNuevaSolicitud={handleNuevaSolicitud}
          onCambiarEstado={handleCambiarEstado}
        />
      )}

      {vista === "cuentas" && <AccesoAdminPanel />}

      {vista === "usuarios" && <UsuariosPanel usuarioActual={sesion.usuario} />}

      <p className="small text-secondary mt-4 mb-0">
        Prototipo académico: los datos se guardan en el servidor Express (archivo server/data/db.json).
      </p>
    </main>
  );
}

export default DashboardPage;