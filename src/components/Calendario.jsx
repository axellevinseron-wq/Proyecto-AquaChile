import { useState } from "react";
import Icon from "./Icon";
import { claveFecha, hoyClave } from "../fechas";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// conteos: objeto { "2026-10-12": 2 } con las solicitudes de cada día.
function Calendario({ seleccionada, onSeleccionar, conteos }) {
  const [anio, mes] = seleccionada.split("-").map(Number);
  const [mesVisible, setMesVisible] = useState(new Date(anio, mes - 1, 1));

  const hoy = hoyClave();
  const primerDiaSemana = (mesVisible.getDay() + 6) % 7; // semana parte en lunes
  const diasDelMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();

  const celdas = [];
  for (let i = 0; i < primerDiaSemana; i += 1) {
    celdas.push(null);
  }
  for (let d = 1; d <= diasDelMes; d += 1) {
    celdas.push(claveFecha(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), d)));
  }

  function cambiarMes(cantidad) {
    setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + cantidad, 1));
  }

  const titulo = mesVisible.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  return (
    <div className="calendario">
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

      <div className="calendario__grilla">
        {DIAS.map((nombre) => (
          <span key={nombre} className="calendario__dia-semana">
            {nombre}
          </span>
        ))}

        {celdas.map((clave, indice) => {
          if (!clave) {
            return <span key={`vacio-${indice}`} />;
          }
          const cantidad = conteos[clave] ?? 0;
          const clases = [
            "calendario__dia",
            clave === seleccionada ? "seleccionado" : "",
            clave === hoy ? "hoy" : "",
          ].join(" ");
          return (
            <button
              key={clave}
              type="button"
              className={clases}
              onClick={() => onSeleccionar(clave)}
              aria-pressed={clave === seleccionada}
              aria-label={`${Number(clave.slice(8))}${cantidad ? `, ${cantidad} solicitudes` : ""}`}
            >
              {Number(clave.slice(8))}
              {cantidad > 0 && <span className="calendario__marca">{cantidad}</span>}
            </button>
          );
        })}
      </div>

      <p className="calendario__leyenda">
        Los días con número tienen solicitudes enviadas.
      </p>
    </div>
  );
}

export default Calendario;
