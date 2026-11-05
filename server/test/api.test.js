// Tests de la API HTTP con un servidor Express real y datos en memoria: npm run test:server
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { crearApp } from "../app.js";

let servidor;
let url;

beforeEach(async () => {
  servidor = crearApp().listen(0, "127.0.0.1");
  await new Promise((resolver) => servidor.once("listening", resolver));
  url = `http://127.0.0.1:${servidor.address().port}/api`;
});

afterEach(async () => {
  servidor.closeAllConnections();
  await new Promise((resolver) => servidor.close(resolver));
});

async function pedir(metodo, ruta, { cuerpo, token } = {}) {
  const respuesta = await fetch(`${url}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => ({}));
  return { status: respuesta.status, datos };
}

async function ingresar(usuario, clave) {
  const { datos } = await pedir("POST", "/sesion", { cuerpo: { usuario, clave } });
  return datos.token;
}

const solicitud = {
  nombre: "Ana",
  apellido: "Prueba",
  rut: "12.345.678-5",
  telefono: "+56 9 1234 5678",
  correo: "ana@example.test",
  usuario: "aprueba",
  motivo: "Necesito acceso",
};

describe("Sesión", () => {
  it("inicia sesión y devuelve token, rol y permisos", async () => {
    const { status, datos } = await pedir("POST", "/sesion", { cuerpo: { usuario: "admin", clave: "admin123" } });
    assert.equal(status, 200);
    assert.equal(datos.sesion.rol, "Administrador");
    assert.ok(datos.token);
    assert.equal(JSON.stringify(datos).includes("claveHash"), false);
  });

  it("rechaza credenciales incorrectas y faltantes", async () => {
    const mala = await pedir("POST", "/sesion", { cuerpo: { usuario: "admin", clave: "mala" } });
    assert.equal(mala.status, 401);
    const vacia = await pedir("POST", "/sesion", { cuerpo: { usuario: "", clave: "" } });
    assert.equal(vacia.status, 400);
  });

  it("bloquea temporalmente después de muchos intentos fallidos", async () => {
    for (let i = 0; i < 10; i += 1) {
      await pedir("POST", "/sesion", { cuerpo: { usuario: "admin", clave: "mala" } });
    }
    const bloqueado = await pedir("POST", "/sesion", { cuerpo: { usuario: "admin", clave: "admin123" } });
    assert.equal(bloqueado.status, 429);
  });

  it("el token deja de servir al cerrar sesión", async () => {
    const token = await ingresar("admin", "admin123");
    assert.equal((await pedir("GET", "/sesion", { token })).status, 200);
    assert.equal((await pedir("DELETE", "/sesion", { token })).status, 204);
    assert.equal((await pedir("GET", "/sesion", { token })).status, 401);
  });

  it("las rutas protegidas piden sesión", async () => {
    assert.equal((await pedir("GET", "/sincronizacion")).status, 401);
    assert.equal((await pedir("GET", "/colecciones/candidatos", { token: "inventado" })).status, 401);
  });
});

describe("Permisos por rol", () => {
  it("un administrador recibe todo y un usuario solo lo suyo", async () => {
    const admin = await pedir("GET", "/sincronizacion", { token: await ingresar("admin", "admin123") });
    assert.ok(admin.datos.usuarios.length > 1);
    assert.ok(admin.datos.solicitudesAcceso.length > 0);

    const usuario = await pedir("GET", "/sincronizacion", { token: await ingresar("psicologo", "psico123") });
    assert.deepEqual(usuario.datos.usuarios.map((u) => u.usuario), ["psicologo"]);
    assert.deepEqual(usuario.datos.solicitudesAcceso, []);
    assert.deepEqual(usuario.datos.notificaciones, []);
  });

  it("solo un administrador cambia estados y permisos", async () => {
    const token = await ingresar("psicologo", "psico123");
    assert.equal((await pedir("POST", "/accesos/5/estado", { token, cuerpo: { estado: "Aceptada" } })).status, 403);
    assert.equal((await pedir("PATCH", "/usuarios/admin", { token, cuerpo: { rol: "Usuario", permisos: {} } })).status, 403);
  });

  it("un usuario solo edita su propio perfil", async () => {
    const token = await ingresar("psicologo", "psico123");
    const ajeno = await pedir("PATCH", "/usuarios/admin/perfil", { token, cuerpo: { nombre: "X" } });
    assert.equal(ajeno.status, 403);
    const propio = await pedir("PATCH", "/usuarios/psicologo/perfil", { token, cuerpo: { nombre: "Psico Logo" } });
    assert.equal(propio.status, 200);
  });
});

describe("Solicitudes de acceso", () => {
  it("el flujo completo: enviar, consultar, aceptar y entrar con la cuenta nueva", async () => {
    const creada = await pedir("POST", "/accesos", { cuerpo: solicitud });
    assert.equal(creada.status, 201);
    const { id, codigo } = creada.datos.solicitud;

    const consulta = await pedir("POST", "/accesos/consulta", { cuerpo: { correo: solicitud.correo, codigo } });
    assert.equal(consulta.datos.solicitud.estado, "Pendiente");
    const mala = await pedir("POST", "/accesos/consulta", { cuerpo: { correo: solicitud.correo, codigo: "ZZZZZZ" } });
    assert.equal(mala.status, 404);

    const admin = await ingresar("admin", "admin123");
    assert.equal((await pedir("POST", `/accesos/${id}/estado`, { token: admin, cuerpo: { estado: "Aceptada" } })).status, 200);
    const { credenciales } = (await pedir("POST", "/accesos/consulta", { cuerpo: { correo: solicitud.correo, codigo } })).datos.solicitud;
    assert.ok(await ingresar(credenciales.usuario, credenciales.clave));
  });

  it("al revertir la aceptación se cierra la sesión de esa cuenta", async () => {
    const { solicitud: creada } = (await pedir("POST", "/accesos", { cuerpo: solicitud })).datos;
    const admin = await ingresar("admin", "admin123");
    await pedir("POST", `/accesos/${creada.id}/estado`, { token: admin, cuerpo: { estado: "Aceptada" } });
    const { credenciales } = (await pedir("POST", "/accesos/consulta", { cuerpo: { correo: solicitud.correo, codigo: creada.codigo } })).datos.solicitud;
    const token = await ingresar(credenciales.usuario, credenciales.clave);
    assert.equal((await pedir("GET", "/sesion", { token })).status, 200);

    await pedir("POST", `/accesos/${creada.id}/estado`, { token: admin, cuerpo: { estado: "Rechazada" } });
    assert.equal((await pedir("GET", "/sesion", { token })).status, 401);
  });

  it("valida los datos y no repite usuarios", async () => {
    assert.equal((await pedir("POST", "/accesos", { cuerpo: { ...solicitud, correo: "malo" } })).status, 400);
    assert.equal((await pedir("POST", "/accesos", { cuerpo: { ...solicitud, usuario: "admin" } })).status, 409);
  });

  it("ofrece las solicitudes de ejemplo sin sesión", async () => {
    const { datos } = await pedir("GET", "/accesos/ejemplos");
    assert.ok(datos.ejemplos.some((e) => e.nombre === "Camila Fuentes"));
  });

  it("el login informa si la solicitud sigue pendiente", async () => {
    const { status, datos } = await pedir("POST", "/sesion", { cuerpo: { usuario: "fnunez", clave: "x" } });
    assert.equal(status, 401);
    assert.equal(datos.pendiente, true);
  });
});

describe("Candidatos y solicitudes de evaluación", () => {
  it("lee y guarda la lista", async () => {
    const token = await ingresar("admin", "admin123");
    const { datos } = await pedir("GET", "/colecciones/candidatos", { token });
    assert.ok(datos.items.length > 0);

    const nuevos = [...datos.items, { id: 999, nombre: "Nuevo", correo: "n@example.test" }];
    assert.equal((await pedir("PUT", "/colecciones/candidatos", { token, cuerpo: { items: nuevos } })).status, 200);
    assert.equal((await pedir("GET", "/colecciones/candidatos", { token })).datos.items.length, nuevos.length);
  });

  it("respeta los permisos de cada sección", async () => {
    const admin = await ingresar("admin", "admin123");
    await pedir("PATCH", "/usuarios/psicologo", {
      token: admin,
      cuerpo: { rol: "Usuario", permisos: { indicadores: true, candidatos: false, solicitudes: true } },
    });
    const token = await ingresar("psicologo", "psico123");
    assert.equal((await pedir("GET", "/colecciones/candidatos", { token })).status, 200);
    assert.equal((await pedir("PUT", "/colecciones/candidatos", { token, cuerpo: { items: [] } })).status, 403);
    assert.equal((await pedir("PUT", "/colecciones/solicitudes", { token, cuerpo: { items: [] } })).status, 200);
  });

  it("rechaza listas inválidas y nombres de lista que no existen", async () => {
    const token = await ingresar("admin", "admin123");
    assert.equal((await pedir("PUT", "/colecciones/candidatos", { token, cuerpo: { items: "no" } })).status, 400);
    assert.equal((await pedir("GET", "/colecciones/usuarios", { token })).status, 404);
    assert.equal((await pedir("PUT", "/colecciones/usuarios", { token, cuerpo: { items: [] } })).status, 404);
  });
});

describe("Errores", () => {
  it("una ruta que no existe responde JSON 404", async () => {
    const { status, datos } = await pedir("GET", "/no-existe");
    assert.equal(status, 404);
    assert.ok(datos.error);
  });

  it("un JSON dañado responde 400", async () => {
    const respuesta = await fetch(`${url}/sesion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{malo" });
    assert.equal(respuesta.status, 400);
  });
});
