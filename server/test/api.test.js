// Tests de la API HTTP con un servidor Express real y datos en memoria: npm run test:server
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { crearApp } from "../app.js";

let servidor;
let url;

beforeEach(async () => {
  servidor = crearApp({ clienteCorreo: null }).listen(0, "127.0.0.1");
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
    assert.deepEqual(admin.datos.invitaciones, []);
    assert.equal("solicitudesAcceso" in admin.datos, false);

    const usuario = await pedir("GET", "/sincronizacion", { token: await ingresar("psicologo", "psico123") });
    assert.deepEqual(usuario.datos.usuarios.map((u) => u.usuario), ["psicologo"]);
    assert.deepEqual(usuario.datos.invitaciones, []);
    assert.deepEqual(usuario.datos.notificaciones, []);
  });

  it("solo un administrador administra invitaciones y permisos", async () => {
    const token = await ingresar("psicologo", "psico123");
    assert.equal((await pedir("POST", "/admin/invitaciones", { token, cuerpo: {} })).status, 403);
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

describe("Invitaciones de acceso", () => {
  const invitacion = {
    nombre: "Ana Prueba",
    correo: "ana@example.test",
    usuario: "aprueba",
    rol: "Usuario",
    permisos: { indicadores: true },
  };

  it("el ciclo de invitación crea una contraseña sin exponer el hash del token", async () => {
    const admin = await ingresar("admin", "admin123");
    const creada = await pedir("POST", "/admin/invitaciones", { token: admin, cuerpo: invitacion });
    assert.equal(creada.status, 201);
    assert.equal(creada.datos.correoEnviado, false);
    assert.match(creada.datos.enlace, /\/invitacion\/[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(creada.datos).includes("tokenHash"), false);

    const token = new URL(creada.datos.enlace).pathname.split("/").pop();
    const consulta = await pedir("GET", `/invitaciones/${token}`);
    assert.equal(consulta.status, 200);
    assert.equal(consulta.datos.invitacion.usuario, "aprueba");
    assert.equal((await pedir("POST", `/invitaciones/${token}/aceptar`, { cuerpo: { clave: "corta" } })).status, 400);

    const aceptada = await pedir("POST", `/invitaciones/${token}/aceptar`, { cuerpo: { clave: "una-clave-segura-123" } });
    assert.equal(aceptada.status, 200);
    assert.equal((await pedir("GET", `/invitaciones/${token}`)).status, 410);
    assert.ok(await ingresar("aprueba", "una-clave-segura-123"));
    assert.equal(aceptada.datos.usuario.permisos.candidatos, false);
  });

  it("permite revocar invitaciones y desactiva los endpoints públicos antiguos", async () => {
    const admin = await ingresar("admin", "admin123");
    const creada = await pedir("POST", "/admin/invitaciones", { token: admin, cuerpo: invitacion });
    const id = creada.datos.invitacion.id;
    assert.equal((await pedir("POST", `/admin/invitaciones/${id}/revocar`, { token: admin })).status, 200);

    const token = new URL(creada.datos.enlace).pathname.split("/").pop();
    assert.equal((await pedir("GET", `/invitaciones/${token}`)).status, 410);
    assert.equal((await pedir("POST", "/accesos", { cuerpo: invitacion })).status, 404);
    assert.equal((await pedir("POST", "/accesos/consulta", { cuerpo: {} })).status, 404);
    assert.equal((await pedir("GET", "/accesos/ejemplos")).status, 404);
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

describe("Ofertas y postulaciones", () => {
  it("muestra ofertas sin sesión y recibe una postulación pública", async () => {
    const lista = await pedir("GET", "/ofertas");
    assert.equal(lista.status, 200);
    assert.ok(lista.datos.items.some((item) => item.estado === "Publicada"));
    assert.equal((await pedir("GET", "/admin/ofertas")).status, 401);

    const oferta = lista.datos.items[0];
    const creada = await pedir("POST", "/postulaciones", {
      cuerpo: {
        ofertaId: oferta.id,
        nombre: "Ana Prueba",
        correo: "ana@example.test",
        telefono: "+56 9 1234 5678",
        mensaje: "Tengo experiencia en operaciones.",
      },
    });
    assert.equal(creada.status, 201);
    assert.equal(creada.datos.postulacion.estado, "Recibida");
    assert.equal((await pedir("POST", "/postulaciones", {
      cuerpo: {
        ofertaId: oferta.id,
        nombre: "Ana Prueba",
        correo: "ANA@example.test",
        telefono: "+56 9 1234 5678",
      },
    })).status, 409);

    const admin = await ingresar("admin", "admin123");
    const privadas = await pedir("GET", "/admin/postulaciones", { token: admin });
    assert.equal(privadas.status, 200);
    assert.equal(privadas.datos.items[0].correo, "ana@example.test");
    assert.equal((await pedir("GET", "/admin/postulaciones", { token: await ingresar("psicologo", "psico123") })).status, 403);
  });

  it("solo administradores crean ofertas y ofertas cerradas dejan de ser públicas", async () => {
    const datosOferta = {
      titulo: "Cargo de prueba",
      area: "Operaciones",
      ubicacion: "Puerto Montt",
      modalidad: "Presencial",
      jornada: "Jornada completa",
      descripcion: "Descripción de prueba.",
      requisitos: "",
      fechaCierre: "",
      estado: "Publicada",
    };
    const usuario = await ingresar("psicologo", "psico123");
    assert.equal((await pedir("POST", "/admin/ofertas", { token: usuario, cuerpo: datosOferta })).status, 403);

    const admin = await ingresar("admin", "admin123");
    const creada = await pedir("POST", "/admin/ofertas", { token: admin, cuerpo: datosOferta });
    assert.equal(creada.status, 200);
    const id = creada.datos.oferta.id;
    assert.equal((await pedir("GET", `/ofertas/${id}`)).status, 200);

    const cerrada = await pedir("PATCH", `/admin/ofertas/${id}`, {
      token: admin,
      cuerpo: { ...datosOferta, estado: "Cerrada" },
    });
    assert.equal(cerrada.status, 200);
    assert.equal((await pedir("GET", `/ofertas/${id}`)).status, 404);

    const vencida = await pedir("POST", "/admin/ofertas", {
      token: admin,
      cuerpo: { ...datosOferta, titulo: "Oferta vencida", fechaCierre: "2020-01-01" },
    });
    assert.equal(vencida.status, 200);
    assert.equal((await pedir("POST", "/postulaciones", {
      cuerpo: {
        ofertaId: vencida.datos.oferta.id,
        nombre: "Ana Prueba",
        correo: "ana-vencida@example.test",
        telefono: "12345678",
      },
    })).status, 404);
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
