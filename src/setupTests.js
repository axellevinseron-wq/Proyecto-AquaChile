import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { Buffer } from "node:buffer";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

const fetchNativo = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (entrada, opciones = {}) => {
  const formulario = opciones.body;
  if (!formulario || typeof formulario.entries !== "function") return fetchNativo(entrada, opciones);

  const limite = "----AquaChileVitestBoundary";
  const partes = [];
  for (const [nombre, valor] of formulario.entries()) {
    const nombreCampo = nombre.replace(/[\r\n"]/g, "_");
    if (typeof valor === "string") {
      partes.push(Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="${nombreCampo}"\r\n\r\n${valor}\r\n`));
      continue;
    }
    const nombreArchivo = (valor.name || "archivo").replace(/[\r\n"]/g, "_");
    partes.push(Buffer.from(
      `--${limite}\r\nContent-Disposition: form-data; name="${nombreCampo}"; filename="${nombreArchivo}"\r\nContent-Type: ${valor.type || "application/octet-stream"}\r\n\r\n`,
    ));
    partes.push(Buffer.from(await valor.arrayBuffer()), Buffer.from("\r\n"));
  }
  partes.push(Buffer.from(`--${limite}--\r\n`));
  return fetchNativo(entrada, {
    ...opciones,
    headers: { ...opciones.headers, "Content-Type": `multipart/form-data; boundary=${limite}` },
    body: Buffer.concat(partes),
  });
};

// Cada test usa su propio servidor Express real (con los datos de ejemplo, en memoria y en un puerto libre),
// así se prueba el flujo completo: pantalla -> petición HTTP -> servidor.
let servidor;
let directorioCvs;

beforeEach(async () => {
  directorioCvs = mkdtempSync(join(tmpdir(), "aquachile-cv-ui-"));
  servidor = crearApp({ clienteCorreo: null, directorioCvs }).listen(0, "127.0.0.1");
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
  rmSync(directorioCvs, { recursive: true, force: true });
});
