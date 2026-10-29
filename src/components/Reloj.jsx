import { useEffect, useState } from "react";

function useAhora() {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  return ahora;
}

export function Hora() {
  const hora = useAhora().toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div className="topbar-item topbar-reloj" aria-label={`Hora ${hora}`}>
      <strong>{hora}</strong>
    </div>
  );
}

export function Fecha() {
  const fecha = useAhora().toLocaleDateString("es-CL", { day: "numeric", month: "long" });

  return (
    <div className="topbar-item topbar-fecha" aria-label={`Fecha ${fecha}`}>
      {fecha}
    </div>
  );
}
