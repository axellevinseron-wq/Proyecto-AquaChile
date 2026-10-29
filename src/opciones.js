import { useEffect, useState } from "react";

const CLAVE = "vcm-opciones";

export const LIMITES = {
  letra: { min: 85, max: 130 },
  sistema: { min: 80, max: 125 },
  paso: 5,
};


export const OPCIONES_INICIALES = { oscuro: false, fondo: "ninguno", letra: 100, sistema: 100 };

function limitar(valor, { min, max }, porDefecto) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.min(max, Math.max(min, numero)) : porDefecto;
}

function leer() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE));
    if (guardadas && typeof guardadas === "object") {
      return {
        ...OPCIONES_INICIALES,
        letra: limitar(guardadas.letra, LIMITES.letra, 100),
        sistema: limitar(guardadas.sistema, LIMITES.sistema, 100),
      };
    }
  } catch {
    
  }
  return OPCIONES_INICIALES;
}

export function useOpciones() {
  const [opciones, setOpciones] = useState(leer);

  useEffect(() => {
    try {
     
      localStorage.setItem(CLAVE, JSON.stringify({ letra: opciones.letra, sistema: opciones.sistema }));
    } catch {
     
    }
    document.documentElement.setAttribute("data-bs-theme", opciones.oscuro ? "dark" : "light");
    document.documentElement.style.fontSize = `${opciones.letra}%`;
  }, [opciones]);

  return [opciones, setOpciones];
}
