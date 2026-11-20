import { useEffect, useState } from "react";
import { AVISO_CAMBIO } from "./auth";

// Devuelve un número que cambia cada vez que los datos de acceso se modifican
// (en esta pestaña o en otra). Sirve para volver a leer localStorage y refrescar la pantalla.
export function useDatosAcceso() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const actualizar = () => setVersion((v) => v + 1);
    window.addEventListener(AVISO_CAMBIO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(AVISO_CAMBIO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);

  return version;
}
