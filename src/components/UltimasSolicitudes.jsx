import { textoFechaCorta } from "../fechas";

// Avance de cada solicitud según su estado.
const AVANCE = {
  Pendiente: { ancho: 33, clase: "barra--amarillo" },
  "En proceso": { ancho: 66, clase: "barra--azul" },
  Finalizada: { ancho: 100, clase: "barra--verde" },
};

// Gráfico de barras horizontales con las últimas solicitudes enviadas.
function UltimasSolicitudes({ solicitudes }) {
  const ultimas = [...solicitudes]
    .sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud) || b.id - a.id)
    .slice(0, 10);

  if (ultimas.length === 0) {
    return <p className="text-secondary mb-0">Todavía no hay solicitudes.</p>;
  }

  return (
    <div className="ultimas-contenedor">
      <ul className="ultimas" aria-label="Últimas solicitudes">
        {ultimas.map((s) => {
          const avance = AVANCE[s.estado] ?? AVANCE.Pendiente;
          return (
            <li key={s.id} className="ultimas__fila">
              <span className="ultimas__nombre">
                <strong>{s.candidato}</strong>
                <small className="text-secondary">{textoFechaCorta(s.fechaSolicitud)}</small>
              </span>
              <span className="barras__pista">
                <span
                  className={`barras__relleno ${avance.clase}`}
                  style={{ width: `${avance.ancho}%` }}
                />
              </span>
              <span className="ultimas__estado">{s.estado}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-secondary small mb-0 mt-2">
        La barra muestra el avance: pendiente, en proceso y finalizada.
      </p>
    </div>
  );
}

export default UltimasSolicitudes;
