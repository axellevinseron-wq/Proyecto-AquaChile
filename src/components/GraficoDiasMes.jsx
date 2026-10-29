import { useState } from "react";
import Icon from "./Icon";
import { claveFecha } from "../fechas";

// Gráfico de barras: cuántas solicitudes hubo cada día del mes.
function GraficoDiasMes({ solicitudes }) {
  const [mes, setMes] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });

  const anio = mes.getFullYear();
  const numeroMes = mes.getMonth();
  const diasDelMes = new Date(anio, numeroMes + 1, 0).getDate();

  const conteos = Array.from({ length: diasDelMes }, (_, i) => {
    const clave = claveFecha(new Date(anio, numeroMes, i + 1));
    return solicitudes.filter((s) => s.fechaSolicitud === clave).length;
  });

  const maximo = Math.max(...conteos);
  const diasTop = maximo > 0 ? conteos.flatMap((c, i) => (c === maximo ? [i + 1] : [])) : [];
  const titulo = mes.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  function cambiarMes(cantidad) {
    setMes(new Date(anio, numeroMes + cantidad, 1));
  }

  return (
    <div>
      <div className="calendario__cabecera">
        <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
          <Icon nombre="chevron" size={16} />
        </button>
        <strong className="mes-titulo">{titulo}</strong>
        <button
          type="button"
          className="calendario__siguiente"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
        >
          <Icon nombre="chevron" size={16} />
        </button>
      </div>

      <p className="text-secondary small mb-3">
        {maximo > 0
          ? `Más solicitudes: ${diasTop.length > 1 ? "días" : "día"} ${diasTop.join(", ")} (${maximo} ${
              maximo === 1 ? "solicitud" : "solicitudes"
            }).`
          : "No hay solicitudes en este mes."}
      </p>

      <div className="grafico">
        <div className="grafico__barras">
          {conteos.map((cantidad, i) => (
            <div
              key={i}
              className="grafico__col"
              title={`Día ${i + 1}: ${cantidad} ${cantidad === 1 ? "solicitud" : "solicitudes"}`}
            >
              <span className="grafico__valor">{cantidad > 0 ? cantidad : ""}</span>
              <div className="grafico__pista">
                <div
                  className={`grafico__barra ${cantidad === maximo && cantidad > 0 ? "top" : ""}`}
                  style={{ height: maximo ? `${(cantidad / maximo) * 100}%` : 0 }}
                />
              </div>
              <span className="grafico__dia">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GraficoDiasMes;
