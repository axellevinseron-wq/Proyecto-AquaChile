import puente from "./assets/fondos/puente.jpg";
import puenteMini from "./assets/fondos/puente-mini.jpg";
import fuentes from "./assets/fondos/fuentes.jpg";
import fuentesMini from "./assets/fondos/fuentes-mini.jpg";
import ciudad from "./assets/fondos/ciudad.jpg";
import ciudadMini from "./assets/fondos/ciudad-mini.jpg";
import volcan from "./assets/fondos/volcan.jpg";
import volcanMini from "./assets/fondos/volcan-mini.jpg";

export const SIN_FONDO = { id: "ninguno", nombre: "Sin fondo", imagen: null, miniatura: null, grupo: null };

export const FONDOS = [
  SIN_FONDO,
  { id: "puente", nombre: "", imagen: puente, miniatura: puenteMini, grupo: "oscuro" },
  { id: "fuentes", nombre: "", imagen: fuentes, miniatura: fuentesMini, grupo: "oscuro" },
  { id: "ciudad", nombre: "", imagen: ciudad, miniatura: ciudadMini, grupo: "claro" },
  { id: "volcan", nombre: "", imagen: volcan, miniatura: volcanMini, grupo: "claro" },
];

export const GRUPOS_FONDO = [
  {
    id: "oscuro",
    titulo: "Modo oscuro",
    descripcion: "Fondos nocturnos. Al elegir uno se activa el modo oscuro.",
  },
  {
    id: "claro",
    titulo: "Modo claro",
    descripcion: "Fondos de día. Al elegir uno se activa el modo claro.",
  },
];
