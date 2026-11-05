import { useEffect, useState } from "react";

const CLAVE = "vcm-opciones";

export const LIMITES = {
  letra: { min: 85, max: 130 },
  sistema: { min: 80, max: 125 },
  paso: 5,
};


// colorBarra: color de la barra superior ("" = degradado azul por defecto)
export const OPCIONES_INICIALES = { oscuro: false, fondo: "ninguno", letra: 100, sistema: 100, colorBarra: "" };

export const COLOR_BARRA_BASE = "#3176d1";
export const COLORES_BARRA = [
  { valor: "#3176d1", nombre: "Azul" },
  { valor: "#153e6d", nombre: "Azul marino" },
  { valor: "#0f766e", nombre: "Verde azulado" },
  { valor: "#7c3aed", nombre: "Violeta" },
  { valor: "#b91c1c", nombre: "Rojo" },
  { valor: "#374151", nombre: "Gris" },
];

// A partir de un color crea las variables del sistema (tonos más claros y más oscuros del mismo color).
export function coloresDesde(color) {
  const mezcla = (otro, porcentaje) => `color-mix(in srgb, ${color} ${porcentaje}%, ${otro})`;
  return {
    "--alt-azul": color,
    "--alt-azul-oscuro": mezcla("#000", 85),
    "--degradado-50": mezcla("#fff", 82),
    "--degradado-67": color,
    "--degradado-83": mezcla("#000", 72),
    "--degradado-100": mezcla("#000", 50),
    "--bs-primary": color,
  };
}

function colorValido(valor) {
  return typeof valor === "string" && /^#[0-9a-fA-F]{6}$/.test(valor) ? valor : "";
}

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
        colorBarra: colorValido(guardadas.colorBarra),
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
     
      localStorage.setItem(CLAVE, JSON.stringify({ letra: opciones.letra, sistema: opciones.sistema, colorBarra: opciones.colorBarra }));
    } catch {
     
    }
    document.documentElement.setAttribute("data-bs-theme", opciones.oscuro ? "dark" : "light");
    document.documentElement.style.fontSize = `${opciones.letra}%`;

    // Solo el aviso (toast) lee este color desde <html>: vive fuera del panel y no debe afectar al login.
    if (opciones.colorBarra) {
      document.documentElement.style.setProperty("--color-sistema", opciones.colorBarra);
    } else {
      document.documentElement.style.removeProperty("--color-sistema");
    }
  }, [opciones]);

  return [opciones, setOpciones];
}
