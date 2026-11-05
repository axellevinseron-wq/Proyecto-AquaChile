import { useEffect, useState } from "react";
import { AVISO_CAMBIO, refrescarDatos } from "./auth";

// Devuelve un número que cambia cada vez que los datos de acceso se actualizan.
// Sirve para volver a leer la copia local y refrescar la pantalla.
export function useDatosAcceso() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const actualizar = () => setVersion((v) => v + 1);
    window.addEventListener(AVISO_CAMBIO, actualizar);
    return () => window.removeEventListener(AVISO_CAMBIO, actualizar);
  }, []);

  return version;
}

// Mientras hay una sesión iniciada, vuelve a pedir los datos al servidor cada pocos segundos y
// cuando la pestaña vuelve a estar a la vista. Así se ven los cambios hechos por otras personas.
export function useSincronizacion(activo, ms = 10000) {
  useEffect(() => {
    if (!activo) {
      return undefined;
    }
    const intervalo = setInterval(refrescarDatos, ms);
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescarDatos();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activo, ms]);
}
