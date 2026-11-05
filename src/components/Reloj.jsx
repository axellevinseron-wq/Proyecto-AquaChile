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

// Formato: "Sep 14, 2026 | 11:50:31pm"
export function FechaHora({ className = "" }) {
  const ahora = useAhora();
  const fecha = ahora.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const hora = ahora
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
    .replace(/\s?(AM|PM)$/, (_, m) => m.toLowerCase());
  const texto = `${fecha} | ${hora}`;

  return (
    <p className={className} aria-label={`Fecha y hora ${texto}`}>
      {texto}
    </p>
  );
}
