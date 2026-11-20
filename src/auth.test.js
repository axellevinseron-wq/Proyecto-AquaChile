import { describe, expect, it } from "vitest";
import {
  actualizarUsuario,
  agregarComentarioAcceso,
  cambiarEstadoAcceso,
  consultarSolicitud,
  crearSolicitudAcceso,
  iniciarSesion,
  leerSolicitudesAcceso,
  obtenerUsuarios,
  permisosDe,
} from "./auth";

const datos = {
  nombre: "Ana Prueba",
  correo: "ana@example.test",
  usuario: "aprueba",
  motivo: "Necesito acceso",
};

describe("Solicitudes de acceso", () => {
  it("crea la solicitud con su código de seguimiento", () => {
    const resultado = crearSolicitudAcceso(datos);
    expect(resultado.ok).toBe(true);
    expect(resultado.solicitud.codigo).toMatch(/^[A-Z0-9]{6}$/);
    expect(resultado.solicitud.estado).toBe("Pendiente");
  });

  it("rechaza un usuario que ya existe y un correo con solicitud pendiente", () => {
    expect(crearSolicitudAcceso({ ...datos, usuario: "admin" }).ok).toBe(false);
    expect(crearSolicitudAcceso(datos).ok).toBe(true);
    expect(crearSolicitudAcceso({ ...datos, usuario: "otro" }).ok).toBe(false);
  });

  it("solo muestra la solicitud con el correo y el código correctos", () => {
    const { solicitud } = crearSolicitudAcceso(datos);
    expect(consultarSolicitud(datos.correo, solicitud.codigo.toLowerCase())?.id).toBe(solicitud.id);
    expect(consultarSolicitud(datos.correo, "ZZZZZZ")).toBeNull();
    expect(consultarSolicitud("otro@example.test", solicitud.codigo)).toBeNull();
    expect(consultarSolicitud("", "")).toBeNull();
  });

  it("al aceptar crea la cuenta y entrega las credenciales; al revertir la quita", () => {
    const { solicitud } = crearSolicitudAcceso(datos);
    expect(cambiarEstadoAcceso(solicitud.id, "Aceptada", "admin").ok).toBe(true);

    const aceptada = consultarSolicitud(datos.correo, solicitud.codigo);
    expect(aceptada.estado).toBe("Aceptada");
    expect(aceptada.credenciales.usuario).toBe("aprueba");
    expect(iniciarSesion("aprueba", aceptada.credenciales.clave)?.rol).toBe("Usuario");

    cambiarEstadoAcceso(solicitud.id, "Rechazada", "admin");
    expect(obtenerUsuarios().some((u) => u.usuario === "aprueba")).toBe(false);
    expect(consultarSolicitud(datos.correo, solicitud.codigo).credenciales).toBeNull();
  });

  it("guarda comentarios y registra los cambios de estado", () => {
    const { solicitud } = crearSolicitudAcceso(datos);
    expect(agregarComentarioAcceso(solicitud.id, "   ").ok).toBe(false);
    agregarComentarioAcceso(solicitud.id, "Falta tu cargo", "admin");
    cambiarEstadoAcceso(solicitud.id, "Rechazada", "admin");

    const guardada = leerSolicitudesAcceso().find((s) => s.id === solicitud.id);
    expect(guardada.comentarios.map((c) => c.texto)).toContain("Falta tu cargo");
    expect(guardada.estado).toBe("Rechazada");
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

  it("guarda los permisos y se aplican al iniciar sesión", () => {
    const resultado = actualizarUsuario("psicologo", {
      rol: "Usuario",
      permisos: { indicadores: true, candidatos: false, solicitudes: false },
    });
    expect(resultado.ok).toBe(true);
    expect(iniciarSesion("psicologo", "psico123").permisos).toEqual({
      indicadores: true,
      candidatos: false,
      solicitudes: false,
    });
  });

  it("no permite dejar el sistema sin administradores", () => {
    actualizarUsuario("jefe.rrhh", { rol: "Usuario", permisos: {} });
    const resultado = actualizarUsuario("admin", { rol: "Usuario", permisos: {} });
    expect(resultado.ok).toBe(false);
  });
});
