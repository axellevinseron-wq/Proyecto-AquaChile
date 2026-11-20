import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, guardarSesionApi, leerSesionApi, loginApi } from "./apiClient";

describe("Cliente HTTP AquaChile", () => {
  beforeEach(() => { sessionStorage.clear(); vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => vi.unstubAllGlobals());
  it("inicia sesión con JWT del backend", async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: "jwt-prueba", nombre: "Admin", correo: "admin@test.cl", rol: "ADMIN" }) });
    const sesion = await loginApi("admin@test.cl", "prueba");
    expect(sesion.rol).toBe("Administrador");
    expect(leerSesionApi().token).toBe("jwt-prueba");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/auth/login"), expect.objectContaining({ method: "POST" }));
  });
  it("envía Bearer token a las rutas privadas", async () => {
    guardarSesionApi({ token: "abc" });
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ofertas: 2 }) });
    await apiFetch("/api/dashboard/resumen");
    expect(fetch.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer abc");
  });
  it("borra sesión cuando la API devuelve 401", async () => {
    guardarSesionApi({ token: "expirado" });
    fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: "No autorizado" }) });
    await expect(apiFetch("/api/auth/me")).rejects.toThrow("No autorizado");
    expect(leerSesionApi()).toBeNull();
  });
});
