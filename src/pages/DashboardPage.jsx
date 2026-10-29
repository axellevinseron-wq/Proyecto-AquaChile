import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import IndicadorCard from "../components/IndicadorCard";
import SolicitudesPanel from "../components/SolicitudesPanel";
import Calendario from "../components/Calendario";
import EstadisticaDia from "../components/EstadisticaDia";
import BarrasEstado from "../components/BarrasEstado";
import GraficoDiasMes from "../components/GraficoDiasMes";
import CandidatosPanel from "../components/CandidatosPanel";
import UltimasSolicitudes from "../components/UltimasSolicitudes";
import SolicitudesCuentaPanel from "../components/SolicitudesCuentaPanel";
import { leerSolicitudesCuenta, resolverSolicitudCuenta } from "../auth";
import { useAlmacenLocal } from "../useAlmacenLocal";
import { hoyClave } from "../fechas";
import { calcularIndicadores, cambiarEstadoSolicitud, existeCorreo } from "../logica";

const VISTAS = ["inicio", "indicadores", "candidatos", "solicitudes"];

const candidatosIniciales = [
  {
    id: 1,
    nombre: "Daniela Ríos",
    correo: "daniela.rios@example.test",
    cargo: "Analista de Datos",
    familiaCargo: "Datos y Tecnología",
  },
  {
    id: 2,
    nombre: "Matías Fuentes",
    correo: "matias.fuentes@example.test",
    cargo: "Supervisor de Operaciones",
    familiaCargo: "Operaciones",
  },
  {
    id: 3,
    nombre: "Camila Soto",
    correo: "camila.soto@example.test",
    cargo: "Psicóloga Organizacional",
    familiaCargo: "Personas",
  },
  {
    id: 4,
    nombre: "Nicolás Pérez",
    correo: "nicolas.perez@example.test",
    cargo: "Técnico de Mantención",
    familiaCargo: "Mantención",
  },
];

const solicitudesIniciales = [
  {
    id: 1,
    candidatoId: 1,
    candidato: "Daniela Ríos",
    cargo: "Analista de Datos",
    familiaCargo: "Datos y Tecnología",
    estado: "Pendiente",
    responsable: "Laura Pérez",
    fechaSolicitud: "2026-10-12",
  },
  {
    id: 2,
    candidatoId: 2,
    candidato: "Matías Fuentes",
    cargo: "Supervisor de Operaciones",
    familiaCargo: "Operaciones",
    estado: "En proceso",
    responsable: "Carlos Díaz",
    fechaSolicitud: "2026-10-10",
  },
  {
    id: 3,
    candidatoId: 3,
    candidato: "Camila Soto",
    cargo: "Psicóloga Organizacional",
    familiaCargo: "Personas",
    estado: "Finalizada",
    responsable: "Laura Pérez",
    fechaSolicitud: "2026-10-08",
  },
];

function DashboardPage({ esAdmin }) {
  // La sección que se muestra viene de la URL (/inicio, /candidatos, ...)
  const { vista } = useParams();

  const [candidatos, setCandidatos] = useAlmacenLocal("vcm-candidatos", candidatosIniciales);
  const [solicitudes, setSolicitudes] = useAlmacenLocal("vcm-solicitudes", solicitudesIniciales);
  const [solicitudesCuenta, setSolicitudesCuenta] = useState(leerSolicitudesCuenta);

  const [diaElegido, setDiaElegido] = useState(() => {
    const hoy = hoyClave();
    if (solicitudes.some((s) => s.fechaSolicitud === hoy)) {
      return hoy;
    }
    return solicitudes.map((s) => s.fechaSolicitud).sort().at(-1) ?? hoy;
  });

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

  function handleResolverCuenta(id, decision) {
    setSolicitudesCuenta(resolverSolicitudCuenta(id, decision));
  }

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
  }

  function handleCambiarEstado(solicitudId, nuevoEstado) {
    setSolicitudes((actuales) => cambiarEstadoSolicitud(actuales, solicitudId, nuevoEstado));
  }

  // Si la URL no es una sección válida (ej. /cualquiera), vuelve al inicio.
  if (!VISTAS.includes(vista)) {
    return <Navigate to="/inicio" replace />;
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
          panelCuentas={
            esAdmin ? (
              <div className="card card-body caja caja--azul h-100">
                <h2 className="h5 mb-3">Solicitudes de cuentas</h2>
                <SolicitudesCuentaPanel
                  solicitudes={solicitudesCuenta}
                  onResolver={handleResolverCuenta}
                />
              </div>
            ) : null
          }
        />
      )}

      <p className="small text-secondary mt-4 mb-0">
        Prototipo académico: los datos se guardan solo en este navegador (localStorage).
      </p>
    </main>
  );
}

export default DashboardPage;