import { describe, expect, it } from "vitest";
import {
  actualizarUsuario,
  agregarComentarioAcceso,
  cambiarEstadoAcceso,
  cerrarSesion,
  consultarSolicitud,
  crearSolicitudAcceso,
  ejemplosConsulta,
  iniciarSesion,
  leerSolicitudesAcceso,
  obtenerUsuarios,
  permisosDe,
} from "./auth";

// Estos tests usan el servidor Express de verdad (ver setupTests.js).
// Las reglas del sistema se prueban con más detalle en server/test.

const datos = {
  nombre: "Ana Prueba",
  correo: "ana@example.test",
  usuario: "aprueba",
  motivo: "Necesito acceso",
};

describe("Inicio de sesión", () => {
  it("entrega la sesión con rol y permisos, y carga los datos del administrador", async () => {
    const resultado = await iniciarSesion("admin", "admin123");
    expect(resultado.ok).toBe(true);
    expect(resultado.sesion.rol).toBe("Administrador");
    expect(obtenerUsuarios().length).toBeGreaterThan(1);
    expect(leerSolicitudesAcceso().length).toBeGreaterThan(0);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const resultado = await iniciarSesion("admin", "mala");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe("Usuario o contraseña incorrectos.");
    expect(resultado.pendiente).toBe(false);
  });

  it("avisa cuando la solicitud de cuenta sigue pendiente", async () => {
    const resultado = await iniciarSesion("fnunez", "cualquiera");
    expect(resultado.ok).toBe(false);
    expect(resultado.pendiente).toBe(true);
  });

  it("un usuario que no es administrador solo recibe su propio registro", async () => {
    await iniciarSesion("psicologo", "psico123");
    expect(obtenerUsuarios().map((u) => u.usuario)).toEqual(["psicologo"]);
    expect(leerSolicitudesAcceso()).toEqual([]);
    expect(obtenerUsuarios()[0].claveHash).toBeUndefined();
  });

  it("al cerrar sesión se borran los datos locales", async () => {
    await iniciarSesion("admin", "admin123");
    await cerrarSesion();
    expect(obtenerUsuarios()).toEqual([]);
  });
});

describe("Solicitudes de acceso", () => {
  it("crea la solicitud con su código de seguimiento", async () => {
    const resultado = await crearSolicitudAcceso(datos);
    expect(resultado.ok).toBe(true);
    expect(resultado.solicitud.codigo).toMatch(/^[A-Z0-9]{6}$/);
    expect(resultado.solicitud.estado).toBe("Pendiente");
  });

  it("rechaza un usuario que ya existe y un correo con solicitud pendiente", async () => {
    expect((await crearSolicitudAcceso({ ...datos, usuario: "admin" })).ok).toBe(false);
    expect((await crearSolicitudAcceso(datos)).ok).toBe(true);
    expect((await crearSolicitudAcceso({ ...datos, usuario: "otro" })).ok).toBe(false);
  });

  it("solo muestra la solicitud con el correo y el código correctos", async () => {
    const { solicitud } = await crearSolicitudAcceso(datos);
    expect((await consultarSolicitud(datos.correo, solicitud.codigo.toLowerCase()))?.id).toBe(solicitud.id);
    expect(await consultarSolicitud(datos.correo, "ZZZZZZ")).toBeNull();
    expect(await consultarSolicitud("otro@example.test", solicitud.codigo)).toBeNull();
    expect(await consultarSolicitud("", "")).toBeNull();
  });

  it("ofrece las solicitudes de ejemplo sin iniciar sesión", async () => {
    const ejemplos = await ejemplosConsulta();
    expect(ejemplos.some((e) => e.nombre === "Camila Fuentes")).toBe(true);
  });

  it("al aceptar crea la cuenta y entrega las credenciales; al revertir la quita", async () => {
    const { solicitud } = await crearSolicitudAcceso(datos);
    await iniciarSesion("admin", "admin123");
    expect((await cambiarEstadoAcceso(solicitud.id, "Aceptada")).ok).toBe(true);

    const aceptada = await consultarSolicitud(datos.correo, solicitud.codigo);
    expect(aceptada.estado).toBe("Aceptada");
    expect(aceptada.credenciales.usuario).toBe("aprueba");
    expect(obtenerUsuarios().some((u) => u.usuario === "aprueba")).toBe(true);

    // La cuenta nueva ya puede ingresar con la contraseña generada.
    expect((await iniciarSesion("aprueba", aceptada.credenciales.clave)).sesion.rol).toBe("Usuario");

    await iniciarSesion("admin", "admin123");
    await cambiarEstadoAcceso(solicitud.id, "Rechazada");
    expect(obtenerUsuarios().some((u) => u.usuario === "aprueba")).toBe(false);
    expect((await consultarSolicitud(datos.correo, solicitud.codigo)).credenciales).toBeNull();
  });

  it("guarda comentarios y registra los cambios de estado", async () => {
    const { solicitud } = await crearSolicitudAcceso(datos);
    await iniciarSesion("admin", "admin123");
    expect((await agregarComentarioAcceso(solicitud.id, "   ")).ok).toBe(false);
    await agregarComentarioAcceso(solicitud.id, "Falta tu cargo");
    await cambiarEstadoAcceso(solicitud.id, "Rechazada");

    const guardada = leerSolicitudesAcceso().find((s) => s.id === solicitud.id);
    expect(guardada.comentarios.map((c) => c.texto)).toContain("Falta tu cargo");
    expect(guardada.comentarios.at(-1).autor).toBe("admin"); // el autor lo pone el servidor
    expect(guardada.estado).toBe("Rechazada");
  });

  it("un usuario sin rol de administrador no puede cambiar solicitudes", async () => {
    const { solicitud } = await crearSolicitudAcceso(datos);
    await iniciarSesion("psicologo", "psico123");
    const resultado = await cambiarEstadoAcceso(solicitud.id, "Aceptada");
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/administradores/);
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
