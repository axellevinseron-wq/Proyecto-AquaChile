import BarrasEstado from "./BarrasEstado";
import { textoFecha } from "../fechas";

function claseEstado(estado) {
  switch (estado) {
    case "Pendiente":
      return "text-bg-warning";
    case "En proceso":
      return "text-bg-primary";
    default:
      return "text-bg-success";
  }
}

// Estadística de los candidatos que enviaron solicitud en el día elegido.
function EstadisticaDia({ fecha, solicitudes, totalCandidatos }) {
  const delDia = solicitudes.filter((s) => s.fechaSolicitud === fecha);
  const candidatosDelDia = new Set(delDia.map((s) => s.candidatoId)).size;
  const porcentaje = totalCandidatos ? Math.round((candidatosDelDia / totalCandidatos) * 100) : 0;

  return (
    <div>
      <h3 className="h5 mb-1">Solicitudes del {textoFecha(fecha)}</h3>

      {delDia.length === 0 ? (
        <p className="text-secondary mb-0">
          Ningún candidato envió solicitud este día. Elige otro día en el calendario.
        </p>
      ) : (
        <>
          <p className="text-secondary mb-3">
            <strong>{candidatosDelDia}</strong> de {totalCandidatos} candidatos enviaron solicitud (
            {porcentaje}%).
          </p>

          <BarrasEstado solicitudes={delDia} />

          <ul className="lista-dia">
            {delDia.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.candidato}</strong>
                  <small className="d-block text-secondary">{s.cargo}</small>
                </span>
                <span className={`badge ${claseEstado(s.estado)}`}>{s.estado}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default EstadisticaDia;
