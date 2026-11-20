import { useEffect, useState } from "react";
import { marcarDesconexion, registrarLatido } from "./auth";

// Devuelve la hora actual y se actualiza cada "ms" milisegundos (sirve para recalcular estados).
export function useReloj(ms) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), ms);
    return () => clearInterval(intervalo);
  }, [ms]);

  return ahora;
}

// Mantiene al usuario con sesión iniciada como "conectado": manda un latido cada 30 segundos
// y renueva su última actividad cuando usa el sistema (como máximo una vez cada 15 segundos).
export function usePresenciaPropia(nombre) {
  useEffect(() => {
    if (!nombre) {
      return undefined;
    }
    let ultimaMarca = 0;

    function actividad() {
      const ahora = Date.now();
      if (ahora - ultimaMarca > 15000) {
        ultimaMarca = ahora;
        registrarLatido(nombre, true);
      }
    }
    function alSalir() {
      marcarDesconexion(nombre, false);
    }

    const eventos = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    eventos.forEach((e) => window.addEventListener(e, actividad, { passive: true }));
    window.addEventListener("pagehide", alSalir);
    const latido = setInterval(() => registrarLatido(nombre, false), 30000);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, actividad));
      window.removeEventListener("pagehide", alSalir);
      clearInterval(latido);
    };
  }, [nombre]);
}
