const ESTADOS = [
  { nombre: "Pendiente", clase: "barra--amarillo" },
  { nombre: "En proceso", clase: "barra--azul" },
  { nombre: "Finalizada", clase: "barra--verde" },
];

// Gráfico de barras simple: cuántas solicitudes hay en cada estado.
function BarrasEstado({ solicitudes }) {
  const total = solicitudes.length;

  return (
    <ul className="barras" aria-label="Solicitudes por estado">
      {ESTADOS.map((estado) => {
        const cantidad = solicitudes.filter((s) => s.estado === estado.nombre).length;
        const porcentaje = total ? Math.round((cantidad / total) * 100) : 0;
        return (
          <li key={estado.nombre} className="barras__fila">
            <span className="barras__nombre">{estado.nombre}</span>
            <span className="barras__pista">
              <span
                className={`barras__relleno ${estado.clase}`}
                style={{ width: `${porcentaje}%` }}
              />
            </span>
            <span className="barras__valor">
              {cantidad} <small className="text-secondary">({porcentaje}%)</small>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default BarrasEstado;
