import { describe, expect, it } from "vitest";
import {
  crearSolicitudAcceso,
  estadoConexion,
  leerNotificaciones,
  marcarConexion,
  marcarDesconexion,
  obtenerConexiones,
} from "./auth";
import { crearPdf } from "./pdf";

const MINUTO = 60 * 1000;

describe("Estado de conexión", () => {
  const ahora = Date.now();
  const registro = { conectado: true, latido: new Date(ahora).toISOString(), actividad: new Date(ahora).toISOString() };

  it("sin registro el usuario está desconectado", () => {
    expect(estadoConexion(undefined, ahora)).toBe("Desconectado");
  });

  it("con actividad reciente está conectado", () => {
    expect(estadoConexion(registro, ahora)).toBe("Conectado");
  });

  it("con la pestaña abierta pero sin actividad está inactivo", () => {
    const despues = ahora + 6 * MINUTO;
    expect(estadoConexion({ ...registro, latido: new Date(despues).toISOString() }, despues)).toBe("Inactivo");
  });

  it("si deja de mandar latidos queda desconectado", () => {
    expect(estadoConexion(registro, ahora + 6 * MINUTO)).toBe("Desconectado");
  });

  it("marcarConexion y marcarDesconexion cambian el estado en la lista", () => {
    marcarConexion("admin");
    expect(obtenerConexiones().find((c) => c.usuario === "admin").estado).toBe("Conectado");
    marcarDesconexion("admin");
    expect(obtenerConexiones().find((c) => c.usuario === "admin").estado).toBe("Desconectado");
  });
});

describe("Notificaciones", () => {
  it("registran sesiones y solicitudes, las más nuevas primero", () => {
    marcarConexion("admin");
    crearSolicitudAcceso({ nombre: "Ana Prueba", correo: "ana@example.test", usuario: "aprueba", motivo: "Acceso" });
    const textos = leerNotificaciones().map((n) => n.texto);
    expect(textos[0]).toBe("Ana Prueba envió una solicitud de acceso.");
    expect(textos).toContain("admin inició sesión.");
  });
});

describe("PDF", () => {
  it("genera un archivo PDF válido", () => {
    const bytes = crearPdf([{ texto: "Información del usuario", tamano: 18, negrita: true }]);
    const texto = String.fromCharCode(...bytes);
    expect(texto.startsWith("%PDF-1.4")).toBe(true);
    expect(texto.endsWith("%%EOF")).toBe(true);
  });
});
