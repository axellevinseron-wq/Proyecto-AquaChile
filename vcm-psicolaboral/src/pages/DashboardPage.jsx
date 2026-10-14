import { useMemo, useState } from "react";
import IndicadorCard from "../components/IndicadorCard";
import CandidatoCard from "../components/CandidatoCard";
import SolicitudesPanel from "../components/SolicitudesPanel";

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

function DashboardPage() {
  const candidatos = candidatosIniciales;
  const [solicitudes, setSolicitudes] = useState(solicitudesIniciales);

  // Los indicadores se calculan desde las solicitudes en lugar de escribir
  // manualmente sus valores. Así se actualizan al crear o cambiar registros.
  const indicadores = useMemo(
    () => [
      {
        id: "candidatos",
        valor: candidatos.length,
        titulo: "Candidatos registrados",
      },
      {
        id: "pendientes",
        valor: solicitudes.filter((solicitud) => solicitud.estado === "Pendiente").length,
        titulo: "Solicitudes pendientes",
      },
      {
        id: "en-proceso",
        valor: solicitudes.filter((solicitud) => solicitud.estado === "En proceso").length,
        titulo: "Solicitudes en proceso",
      },
      {
        id: "finalizadas",
        valor: solicitudes.filter((solicitud) => solicitud.estado === "Finalizada").length,
        titulo: "Evaluaciones finalizadas",
      },
    ],
    [candidatos.length, solicitudes],
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
    setSolicitudes((solicitudesActuales) =>
      solicitudesActuales.map((solicitud) =>
        solicitud.id === solicitudId
          ? { ...solicitud, estado: nuevoEstado }
          : solicitud,
      ),
    );
  }

  return (
    <main id="inicio" className="container dashboard-container py-4">
      <section className="mb-4">
        <p className="text-secondary mb-1">Proyecto VcM · Full Stack II</p>
        <h1 className="h3 mb-2">Dashboard de evaluaciones psicolaborales</h1>
        <p className="text-secondary mb-0">
          Vista general del proceso. Los registros de esta demostración son ficticios.
        </p>
      </section>

      <section className="row g-3 mb-5" aria-label="Indicadores del proceso">
        {indicadores.map((indicador) => (
          <IndicadorCard
            key={indicador.id}
            valor={indicador.valor}
            titulo={indicador.titulo}
          />
        ))}
      </section>

      <section id="candidatos" className="mb-5">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-end gap-2 mb-3">
          <div>
            <h2 className="h4 mb-1">Candidatos recientes</h2>
            <p className="text-secondary mb-0 small">
              Información de ejemplo para la demostración del MVP.
            </p>
          </div>
          <span className="small text-secondary">{candidatos.length} candidatos</span>
        </div>

        <div className="row g-3">
          {candidatosConEstado.map((candidato) => (
            <CandidatoCard
              key={candidato.id}
              nombre={candidato.nombre}
              cargo={candidato.cargo}
              estado={candidato.estado}
            />
          ))}
        </div>
      </section>

      <SolicitudesPanel
        solicitudes={solicitudes}
        candidatos={candidatos}
        onNuevaSolicitud={handleNuevaSolicitud}
        onCambiarEstado={handleCambiarEstado}
      />

      <p className="small text-secondary mt-4 mb-0">
        Prototipo académico: los cambios se mantienen en memoria mientras la página está abierta.
        La persistencia se implementará al integrar el backend y la base de datos.
      </p>
    </main>
  );
}

export default DashboardPage;
