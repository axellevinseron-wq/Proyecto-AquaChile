import { describe, expect, it } from "vitest";
import {
  aceptarInvitacion,
  actualizarUsuario,
  cerrarSesion,
  consultarInvitacion,
  crearInvitacion,
  iniciarSesion,
  obtenerInvitaciones,
  obtenerUsuarios,
  permisosDe,
  revocarInvitacion,
} from "./auth";

// Estos tests usan el servidor Express de verdad (ver setupTests.js).
// Las reglas del sistema se prueban con más detalle en server/test.

const datos = { nombre: "Ana Prueba", correo: "ana@example.test", usuario: "aprueba", rol: "Usuario", permisos: { indicadores: true } };

describe("Inicio de sesión", () => {
  it("entrega la sesión con rol y permisos, y carga los datos del administrador", async () => {
    const resultado = await iniciarSesion("admin", "admin123");
    expect(resultado.ok).toBe(true);
    expect(resultado.sesion.rol).toBe("Administrador");
    expect(obtenerUsuarios().length).toBeGreaterThan(1);
    expect(obtenerInvitaciones()).toEqual([]);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const resultado = await iniciarSesion("admin", "mala");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe("Usuario o contraseña incorrectos.");
  });

  it("un usuario que no es administrador solo recibe su propio registro", async () => {
    await iniciarSesion("psicologo", "psico123");
    expect(obtenerUsuarios().map((u) => u.usuario)).toEqual(["psicologo"]);
    expect(obtenerInvitaciones()).toEqual([]);
    expect(obtenerUsuarios()[0].claveHash).toBeUndefined();
  });

  it("al cerrar sesión se borran los datos locales", async () => {
    await iniciarSesion("admin", "admin123");
    await cerrarSesion();
    expect(obtenerUsuarios()).toEqual([]);
  });
});

describe("Invitaciones", () => {
  it("administra la invitación, crea una cuenta con permisos mínimos y la consume una vez", async () => {
    await iniciarSesion("admin", "admin123");
    const creada = await crearInvitacion(datos);
    expect(creada.ok).toBe(true);
    expect(creada.invitacion.tokenHash).toBeUndefined();
    expect(obtenerInvitaciones()).toHaveLength(1);

    const token = new URL(creada.enlace).pathname.split("/").pop();
    expect((await consultarInvitacion(token)).invitacion.usuario).toBe("aprueba");
    expect((await aceptarInvitacion(token, "corta")).ok).toBe(false);
    expect((await aceptarInvitacion(token, "una-clave-segura-123")).ok).toBe(true);
    expect((await iniciarSesion("aprueba", "una-clave-segura-123")).sesion.permisos).toEqual({
      indicadores: true,
      candidatos: false,
      solicitudes: false,
    });
    expect((await aceptarInvitacion(token, "una-clave-segura-123")).ok).toBe(false);
  });

  it("permite revocar una invitación y limita su administración a los administradores", async () => {
    await iniciarSesion("admin", "admin123");
    const creada = await crearInvitacion(datos);
    expect((await revocarInvitacion(creada.invitacion.id)).ok).toBe(true);
    const token = new URL(creada.enlace).pathname.split("/").pop();
    expect((await consultarInvitacion(token)).ok).toBe(false);

    await iniciarSesion("psicologo", "psico123");
    expect((await crearInvitacion({ ...datos, usuario: "otro" })).ok).toBe(false);
  });
});

describe("Usuarios y permisos", () => {
  it("el administrador tiene todos los permisos", () => {
    expect(permisosDe({ rol: "Administrador" })).toEqual({
      indicadores: true,
      candidatos: true,
      solicitudes: true,
    });
  });

  it("guarda los permisos y se aplican al iniciar sesión", async () => {
    await iniciarSesion("admin", "admin123");
    const resultado = await actualizarUsuario("psicologo", {
      rol: "Usuario",
      permisos: { indicadores: true, candidatos: false, solicitudes: false },
    });
    expect(resultado.ok).toBe(true);

    const sesion = (await iniciarSesion("psicologo", "psico123")).sesion;
    expect(sesion.permisos).toEqual({ indicadores: true, candidatos: false, solicitudes: false });
  });

  it("no permite dejar el sistema sin administradores", async () => {
    await iniciarSesion("admin", "admin123");
    await actualizarUsuario("jefe.rrhh", { rol: "Usuario", permisos: {} });
    const resultado = await actualizarUsuario("admin", { rol: "Usuario", permisos: {} });
    expect(resultado.ok).toBe(false);
  });
});
