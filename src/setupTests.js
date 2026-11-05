import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { crearApp } from "../server/app.js";
import { configurarApi } from "./api";
import { reiniciarDatos } from "./auth";

// jsdom no trae matchMedia, que usa App.jsx
window.matchMedia = vi.fn().mockImplementation((consulta) => ({
  matches: true,
  media: consulta,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

// Cada test usa su propio servidor Express real (con los datos de ejemplo, en memoria y en un puerto libre),
// así se prueba el flujo completo: pantalla -> petición HTTP -> servidor.
let servidor;

beforeEach(async () => {
  servidor = crearApp().listen(0, "127.0.0.1");
  await new Promise((resolver) => servidor.once("listening", resolver));
  configurarApi({ url: `http://127.0.0.1:${servidor.address().port}` });
  reiniciarDatos();
});

afterEach(async () => {
  cleanup();
  localStorage.clear();
  reiniciarDatos();
  servidor.closeAllConnections();
  await new Promise((resolver) => servidor.close(resolver));
});
