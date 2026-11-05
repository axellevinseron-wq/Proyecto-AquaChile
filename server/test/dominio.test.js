// Tests de las reglas del sistema, sin servidor ni red: node --test server/test
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { crearAlmacen } from "../almacen.js";
import { claveCoincide, hashClave } from "../seguridad.js";
import {
  actualizarPerfil,
  actualizarUsuario,
  agregarComentarioAcceso,
  cambiarEstadoAcceso,
  consultarSolicitud,
  crearSolicitudAcceso,
  iniciarSesion,
  leerNotificaciones,
  marcarConexion,
  marcarDesconexion,
  obtenerConexiones,
  permisosDe,
  reemplazarColeccion,
  usuarioPublico,
} from "../dominio.js";

const entrada = { nombre: "Ana Prueba", correo: "ana@example.test", usuario: "aprueba", motivo: "Necesito acceso" };

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

describe("Solicitudes de acceso", () => {
  it("crea la solicitud con su código de seguimiento", () => {
    const resultado = crearSolicitudAcceso(datos, entrada);
    assert.equal(resultado.ok, true);
    assert.match(resultado.solicitud.codigo, /^[A-Z0-9]{6}$/);
    assert.equal(resultado.solicitud.estado, "Pendiente");
  });

  it("rechaza datos incompletos o inválidos", () => {
    assert.equal(crearSolicitudAcceso(datos, { ...entrada, motivo: "  " }).ok, false);
    assert.equal(crearSolicitudAcceso(datos, { ...entrada, correo: "no-es-correo" }).ok, false);
    assert.equal(crearSolicitudAcceso(datos, { ...entrada, rut: "11.111.111-2" }).ok, false);
    assert.equal(crearSolicitudAcceso(datos, { ...entrada, usuario: "con espacio" }).ok, false);
    assert.equal(crearSolicitudAcceso(datos, null).ok, false);
  });

  it("rechaza un usuario que ya existe y un correo con solicitud pendiente", () => {
    assert.equal(crearSolicitudAcceso(datos, { ...entrada, usuario: "admin" }).ok, false);
    assert.equal(crearSolicitudAcceso(datos, entrada).ok, true);
    assert.equal(crearSolicitudAcceso(datos, { ...entrada, usuario: "otro" }).ok, false);
  });

  it("solo muestra la solicitud con el correo y el código correctos", () => {
    const { solicitud } = crearSolicitudAcceso(datos, entrada);
    assert.equal(consultarSolicitud(datos, entrada.correo, solicitud.codigo.toLowerCase())?.id, solicitud.id);
    assert.equal(consultarSolicitud(datos, entrada.correo, "ZZZZZZ"), null);
    assert.equal(consultarSolicitud(datos, "otro@example.test", solicitud.codigo), null);
    assert.equal(consultarSolicitud(datos, "", ""), null);
  });

  it("al aceptar crea la cuenta y entrega las credenciales; al revertir la quita", () => {
    const { solicitud } = crearSolicitudAcceso(datos, entrada);
    assert.equal(cambiarEstadoAcceso(datos, solicitud.id, "Aceptada", "admin").ok, true);

    const aceptada = consultarSolicitud(datos, entrada.correo, solicitud.codigo);
    assert.equal(aceptada.estado, "Aceptada");
    assert.equal(aceptada.credenciales.usuario, "aprueba");
    assert.equal(iniciarSesion(datos, "aprueba", aceptada.credenciales.clave)?.rol, "Usuario");

    const resultado = cambiarEstadoAcceso(datos, solicitud.id, "Rechazada", "admin");
    assert.equal(resultado.usuarioEliminado, "aprueba");
    assert.equal(datos.usuarios.some((u) => u.usuario === "aprueba"), false);
    assert.equal(consultarSolicitud(datos, entrada.correo, solicitud.codigo).credenciales, null);
  });

  it("guarda comentarios y registra los cambios de estado", () => {
    const { solicitud } = crearSolicitudAcceso(datos, entrada);
    assert.equal(agregarComentarioAcceso(datos, solicitud.id, "   ", "admin").ok, false);
    agregarComentarioAcceso(datos, solicitud.id, "Falta tu cargo", "admin");
    cambiarEstadoAcceso(datos, solicitud.id, "Rechazada", "admin");

    const guardada = datos.solicitudesAcceso.find((s) => s.id === solicitud.id);
    assert.ok(guardada.comentarios.map((c) => c.texto).includes("Falta tu cargo"));
    assert.equal(guardada.estado, "Rechazada");
  });

  it("no acepta un estado inventado ni una solicitud que no existe", () => {
    const { solicitud } = crearSolicitudAcceso(datos, entrada);
    assert.equal(cambiarEstadoAcceso(datos, solicitud.id, "Inventado", "admin").ok, false);
    assert.equal(cambiarEstadoAcceso(datos, 9999, "Aceptada", "admin").status, 404);
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
  it("marcarConexion y marcarDesconexion cambian el estado en la lista", () => {
    marcarConexion(datos, "admin");
    assert.equal(obtenerConexiones(datos).find((c) => c.usuario === "admin").conectado, true);
    marcarDesconexion(datos, "admin");
    assert.equal(obtenerConexiones(datos).find((c) => c.usuario === "admin").conectado, false);
  });

  it("registran sesiones y solicitudes, las más nuevas primero", () => {
    marcarConexion(datos, "admin");
    crearSolicitudAcceso(datos, entrada);
    const textos = leerNotificaciones(datos).map((n) => n.texto);
    assert.equal(textos[0], "Ana Prueba envió una solicitud de acceso.");
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
