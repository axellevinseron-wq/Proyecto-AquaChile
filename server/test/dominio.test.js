// Tests de las reglas del sistema, sin servidor ni red: node --test server/test
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { crearAlmacen } from "../almacen.js";
import { claveCoincide, hashClave, hashToken } from "../seguridad.js";
import {
  aceptarInvitacion,
  actualizarPerfil,
  actualizarUsuario,
  consultarInvitacion,
  crearInvitacion,
  iniciarSesion,
  leerInvitaciones,
  leerNotificaciones,
  marcarConexion,
  marcarDesconexion,
  obtenerConexiones,
  permisosDe,
  reemplazarColeccion,
  revocarInvitacion,
  usuarioPublico,
} from "../dominio.js";

const entrada = {
  nombre: "Ana Prueba",
  correo: "ana@example.test",
  usuario: "aprueba",
  rol: "Usuario",
  permisos: { indicadores: true },
};

let datos;
beforeEach(() => {
  datos = crearAlmacen(null).datos;
});

describe("Contraseñas", () => {
  it("se guardan con hash y se comparan sin revelar el original", () => {
    const hash = hashClave("secreta");
    assert.notEqual(hash, "secreta");
    assert.equal(claveCoincide("secreta", hash), true);
    assert.equal(claveCoincide("otra", hash), false);
    assert.equal(claveCoincide("secreta", "texto-sin-formato"), false);
  });

  it("el usuario público nunca incluye el hash", () => {
    const admin = datos.usuarios.find((u) => u.usuario === "admin");
    assert.equal("claveHash" in usuarioPublico(admin), false);
    assert.equal("clave" in usuarioPublico(admin), false);
  });
});

describe("Inicio de sesión", () => {
  it("acepta las cuentas de ejemplo sin distinguir mayúsculas en el usuario", () => {
    assert.equal(iniciarSesion(datos, "ADMIN", "admin123")?.usuario, "admin");
    assert.equal(iniciarSesion(datos, "admin", "mala"), null);
    assert.equal(iniciarSesion(datos, "no-existe", "admin123"), null);
  });
});

describe("Invitaciones", () => {
  it("crea una invitación con permisos mínimos y permite configurar la contraseña una sola vez", () => {
    const resultado = crearInvitacion(datos, entrada, "admin");
    assert.equal(resultado.ok, true);
    assert.equal("tokenHash" in resultado.invitacion, false);
    assert.equal(datos.invitaciones[0].tokenHash, hashToken(resultado.token));
    assert.equal("token" in datos.invitaciones[0], false);
    assert.equal(consultarInvitacion(datos, resultado.token).invitacion.usuario, "aprueba");

    const clave = "una-clave-segura-123";
    assert.equal(aceptarInvitacion(datos, resultado.token, "corta").ok, false);
    const aceptada = aceptarInvitacion(datos, resultado.token, clave);
    assert.equal(aceptada.ok, true);
    assert.deepEqual(aceptada.usuario.permisos, { indicadores: true, candidatos: false, solicitudes: false });
    assert.equal(iniciarSesion(datos, "aprueba", clave)?.rol, "Usuario");
    assert.equal(consultarInvitacion(datos, resultado.token).status, 410);
    assert.equal(aceptarInvitacion(datos, resultado.token, clave).status, 410);
  });

  it("valida duplicados y permite revocar invitaciones", () => {
    const creada = crearInvitacion(datos, entrada, "admin");
    assert.equal(crearInvitacion(datos, { ...entrada, usuario: "otro" }, "admin").status, 409);
    assert.equal(crearInvitacion(datos, { ...entrada, correo: "otro@example.test" }, "admin").status, 409);
    assert.equal(revocarInvitacion(datos, creada.invitacion.id).ok, true);
    assert.equal(consultarInvitacion(datos, creada.token).status, 410);
    assert.equal(leerInvitaciones(datos)[0].tokenHash, undefined);
  });

  it("rechaza invitaciones inválidas o vencidas", () => {
    assert.equal(crearInvitacion(datos, { ...entrada, correo: "malo" }, "admin").ok, false);
    const creada = crearInvitacion(datos, entrada, "admin");
    datos.invitaciones[0].expira = new Date(Date.now() - 1).toISOString();
    assert.equal(consultarInvitacion(datos, creada.token).status, 410);
  });
});

describe("Usuarios y permisos", () => {
  it("el administrador tiene todos los permisos", () => {
    assert.deepEqual(permisosDe({ rol: "Administrador" }), { indicadores: true, candidatos: true, solicitudes: true });
  });

  it("guarda los permisos y se aplican al iniciar sesión", () => {
    const permisos = { indicadores: true, candidatos: false, solicitudes: false };
    assert.equal(actualizarUsuario(datos, "psicologo", { rol: "Usuario", permisos }).ok, true);
    assert.deepEqual(permisosDe(iniciarSesion(datos, "psicologo", "psico123")), permisos);
  });

  it("no permite dejar el sistema sin administradores", () => {
    actualizarUsuario(datos, "jefe.rrhh", { rol: "Usuario", permisos: {} });
    assert.equal(actualizarUsuario(datos, "admin", { rol: "Usuario", permisos: {} }).ok, false);
  });

  it("valida los datos del perfil y deja pasar los vacíos", () => {
    const base = { nombre: "Admin", correo: "", telefono: "", rut: "" };
    assert.equal(actualizarPerfil(datos, "admin", base).ok, true);
    assert.equal(actualizarPerfil(datos, "admin", { ...base, correo: "malo" }).ok, false);
    assert.equal(actualizarPerfil(datos, "admin", { ...base, foto: "<script>" }).ok, false);
    assert.equal(actualizarPerfil(datos, "admin", { ...base, rut: "17.234.561-1" }).ok, true);
  });
});

describe("Conexión y notificaciones", () => {
  it("omite notificaciones antiguas de solicitudes sin borrar su registro", () => {
    datos.notificaciones.push({ id: "legacy", tipo: "solicitud", texto: "Solicitud anterior", fecha: new Date().toISOString() });
    assert.equal(leerNotificaciones(datos).some((item) => item.id === "legacy"), false);
    assert.equal(datos.notificaciones.some((item) => item.id === "legacy"), true);
  });

  it("marcarConexion y marcarDesconexion cambian el estado en la lista", () => {
    marcarConexion(datos, "admin");
    assert.equal(obtenerConexiones(datos).find((c) => c.usuario === "admin").conectado, true);
    marcarDesconexion(datos, "admin");
    assert.equal(obtenerConexiones(datos).find((c) => c.usuario === "admin").conectado, false);
  });

  it("registran sesiones e invitaciones, las más nuevas primero", () => {
    marcarConexion(datos, "admin");
    crearInvitacion(datos, entrada, "admin");
    const textos = leerNotificaciones(datos).map((n) => n.texto);
    assert.equal(textos[0], "admin invitó a Ana Prueba al sistema.");
    assert.ok(textos.includes("admin inició sesión."));
  });
});

describe("Listas de candidatos y solicitudes de evaluación", () => {
  it("reemplaza la lista cuando el formato es correcto", () => {
    assert.equal(reemplazarColeccion(datos, "candidatos", [{ id: 1, nombre: "A" }]).ok, true);
    assert.deepEqual(datos.candidatos, [{ id: 1, nombre: "A" }]);
  });

  it("rechaza listas con formato incorrecto o ids repetidos", () => {
    assert.equal(reemplazarColeccion(datos, "candidatos", "no es lista").ok, false);
    assert.equal(reemplazarColeccion(datos, "candidatos", [{ id: 1 }, { id: 1 }]).ok, false);
    assert.equal(reemplazarColeccion(datos, "candidatos", [{ nombre: "sin id" }]).ok, false);
    assert.equal(reemplazarColeccion(datos, "usuarios", []).status, 404);
  });
});
