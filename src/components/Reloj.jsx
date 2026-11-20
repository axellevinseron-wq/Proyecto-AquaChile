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

// Reloj de la barra superior, configurable desde Opciones.
export function FechaHora({ className = "", estilo = "digital", formato = "24" }) {
  const ahora = useAhora();
  const hora12 = formato === "12";
  const fecha = ahora.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  const hora = ahora.toLocaleTimeString("es-CL", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: hora12,
  });

  if (estilo === "analogico") {
    const segundos = ahora.getSeconds();
    const minutos = ahora.getMinutes() + segundos / 60;
    const horas = (ahora.getHours() % 12) + minutos / 60;
    return (
      <div className={className} aria-label={`Fecha y hora ${fecha}, ${hora}`}
        title={`${fecha} | ${hora}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <svg viewBox="0 0 60 60" width="38" height="38" role="img" aria-label={`Reloj analógico: ${hora}`}>
          <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="2" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="30" y1="6" x2="30" y2="10" stroke="currentColor"
              strokeWidth="1.5" transform={`rotate(${i * 30} 30 30)`} />
          ))}
          <line x1="30" y1="30" x2="30" y2="17" stroke="currentColor"
            strokeWidth="3" strokeLinecap="round" transform={`rotate(${horas * 30} 30 30)`} />
          <line x1="30" y1="30" x2="30" y2="12" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" transform={`rotate(${minutos * 6} 30 30)`} />
          <line x1="30" y1="32" x2="30" y2="9" stroke="#fbbf24"
            strokeWidth="1" transform={`rotate(${segundos * 6} 30 30)`} />
          <circle cx="30" cy="30" r="2.5" fill="currentColor" />
        </svg>
        <span>{fecha}</span>
      </div>
    );
  }

  const texto = estilo === "clasico" ? hora : `${fecha} | ${hora}`;
  return (
    <p className={className} aria-label={`Fecha y hora ${fecha}, ${hora}`}
      style={estilo === "clasico" ? { fontFamily: "monospace", fontSize: "1.1em", letterSpacing: "0.1em" } : undefined}>
      {texto}
    </p>
  );
}
