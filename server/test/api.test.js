// Tests de la API HTTP con un servidor Express real y datos en memoria: npm run test:server
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crearApp } from "../app.js";
import { crearClienteGoogleCalendar } from "../googleCalendar.js";

let servidor;
let url;
let eventosGoogle;
let directorioCvs;

beforeEach(async () => {
  directorioCvs = mkdtempSync(join(tmpdir(), "aquachile-cv-api-"));
  eventosGoogle = [];
  const clienteGoogleCalendar = {
    async obtenerOrganizador(token) {
      return token === "google-access-token-for-recruiter"
        ? "reclutador@example.test"
        : "otro@example.test";
    },
    async crearEvento(token, evento) {
      eventosGoogle.push({ tipo: "crear", token, evento });
      return {
        id: evento.id,
        htmlLink: "https://calendar.google.com/event",
        hangoutLink: "https://meet.google.com/abc-defg-hij",
      };
    },
    async actualizarEvento(token, id, cambios) {
      eventosGoogle.push({ tipo: "actualizar", token, id, cambios });
      return { htmlLink: "https://calendar.google.com/event" };
    },
    async eliminarEvento(token, id) {
      eventosGoogle.push({ tipo: "eliminar", token, id });
    },
  };
  servidor = crearApp({ clienteCorreo: null, clienteGoogleCalendar, directorioCvs }).listen(0, "127.0.0.1");
  await new Promise((resolver) => servidor.once("listening", resolver));
  url = `http://127.0.0.1:${servidor.address().port}/api`;
});

afterEach(async () => {
  servidor.closeAllConnections();
  await new Promise((resolver) => servidor.close(resolver));
  rmSync(directorioCvs, { recursive: true, force: true });
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

async function pedirMultipart(ruta, campos, archivo) {
  const cuerpo = new FormData();
  for (const [nombre, valor] of Object.entries(campos)) cuerpo.append(nombre, String(valor));
  if (archivo) {
    cuerpo.append("cv", new Blob([archivo.contenido], { type: archivo.tipo }), archivo.nombre);
  }
  const respuesta = await fetch(`${url}${ruta}`, { method: "POST", body: cuerpo });
  return { status: respuesta.status, datos: await respuesta.json().catch(() => ({})) };
}

async function pedirArchivo(ruta, token) {
  const respuesta = await fetch(`${url}${ruta}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return {
    status: respuesta.status,
    tipo: respuesta.headers.get("content-type"),
    disposicion: respuesta.headers.get("content-disposition"),
    archivo: Buffer.from(await respuesta.arrayBuffer()),
  };
}

async function ingresar(usuario, clave) {
  const { datos } = await pedir("POST", "/sesion", { cuerpo: { usuario, clave } });
  return datos.token;
}

describe("Cliente de Google Calendar", () => {
  it("usa el token solo como bearer y construye llamadas de Calendar", async () => {
    const llamadas = [];
    const cliente = crearClienteGoogleCalendar({
      fetchImpl: async (url, opciones) => {
        llamadas.push({ url, opciones });
        return {
          ok: true,
          status: 200,
          json: async () => ({ email: "reclutador@example.test", email_verified: true, htmlLink: "https://calendar.google.com/event" }),
        };
      },
    });

    assert.equal(await cliente.obtenerOrganizador("token-de-prueba-solo-en-memoria"), "reclutador@example.test");
    const evento = await cliente.crearEvento("token-de-prueba-solo-en-memoria", { id: "ab123", summary: "Entrevista" });

    assert.equal(evento.htmlLink, "https://calendar.google.com/event");
    assert.equal(llamadas[0].url, "https://www.googleapis.com/oauth2/v3/userinfo");
    assert.equal(llamadas[1].url, "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all");
    assert.equal(llamadas[1].opciones.headers.Authorization, "Bearer token-de-prueba-solo-en-memoria");
    assert.equal(llamadas[1].opciones.method, "POST");
  });
});

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
    assert.equal(creada.datos.postulacion.cv, undefined);
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

  it("recibe un PDF opcional de hasta 10 MB, limita su acceso al administrador y permite eliminarlo", async () => {
    const oferta = (await pedir("GET", "/ofertas")).datos.items[0];
    const contenidoPdf = Buffer.alloc(10 * 1024 * 1024);
    Buffer.from("%PDF-1.7\n").copy(contenidoPdf);
    const creada = await pedirMultipart("/postulaciones", {
      ofertaId: oferta.id,
      nombre: "Ana CV",
      correo: "ana-cv@example.test",
      telefono: "+56 9 1234 5678",
    }, { contenido: contenidoPdf, tipo: "application/pdf", nombre: "curriculum.pdf" });

    assert.equal(creada.status, 201);
    const postulacion = creada.datos.postulacion;
    assert.equal(postulacion.cv, undefined);
    const admin = await ingresar("admin", "admin123");
    const postulacionPrivada = (await pedir("GET", "/admin/postulaciones", { token: admin })).datos.items[0];
    assert.equal(postulacionPrivada.cv.nombre, "curriculum.pdf");
    assert.equal(postulacionPrivada.cv.tamano, 10 * 1024 * 1024);
    assert.equal("ruta" in postulacionPrivada.cv, false);

    const rutaCv = `/admin/postulaciones/${postulacion.id}/cv`;
    assert.equal((await pedirArchivo(rutaCv)).status, 401);
    assert.equal((await pedirArchivo(rutaCv, await ingresar("psicologo", "psico123"))).status, 403);

    const archivo = await pedirArchivo(rutaCv, admin);
    assert.equal(archivo.status, 200);
    assert.match(archivo.tipo, /^application\/pdf/);
    assert.match(archivo.disposicion, /inline/);
    assert.deepEqual(archivo.archivo, contenidoPdf);

    const eliminacionSinSesion = await pedir("DELETE", rutaCv);
    assert.equal(eliminacionSinSesion.status, 401);
    const eliminacionUsuario = await pedir("DELETE", rutaCv, { token: await ingresar("psicologo", "psico123") });
    assert.equal(eliminacionUsuario.status, 403);
    const eliminacion = await pedir("DELETE", rutaCv, { token: admin });
    assert.equal(eliminacion.status, 200);
    assert.equal(eliminacion.datos.postulacion.cv, undefined);
    assert.equal((await pedirArchivo(rutaCv, admin)).status, 404);
    assert.deepEqual(readdirSync(directorioCvs), []);
  });

  it("rechaza archivos que no son PDF, firmas falsas y archivos mayores de 10 MB", async () => {
    const oferta = (await pedir("GET", "/ofertas")).datos.items[0];
    const campos = {
      ofertaId: oferta.id,
      nombre: "Ana Archivo",
      correo: "ana-archivo@example.test",
      telefono: "+56 9 1234 5678",
    };

    const tipoInvalido = await pedirMultipart("/postulaciones", campos, {
      contenido: Buffer.from("no es un pdf"),
      tipo: "text/plain",
      nombre: "curriculum.txt",
    });
    assert.equal(tipoInvalido.status, 400);

    const firmaInvalida = await pedirMultipart("/postulaciones", campos, {
      contenido: Buffer.from("no es un pdf"),
      tipo: "application/pdf",
      nombre: "curriculum.pdf",
    });
    assert.equal(firmaInvalida.status, 400);

    const demasiadoGrande = await pedirMultipart("/postulaciones", campos, {
      contenido: Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(10 * 1024 * 1024)]),
      tipo: "application/pdf",
      nombre: "curriculum.pdf",
    });
    assert.equal(demasiadoGrande.status, 413);
    assert.deepEqual(readdirSync(directorioCvs), []);
    assert.deepEqual((await pedir("GET", "/admin/postulaciones", { token: await ingresar("admin", "admin123") })).datos.items, []);
  });

  it("agenda, reprograma y cancela una entrevista de Google solo con cuenta autorizada", async () => {
    const oferta = (await pedir("GET", "/ofertas")).datos.items[0];
    const creada = await pedir("POST", "/postulaciones", {
      cuerpo: {
        ofertaId: oferta.id,
        nombre: "Ana Prueba",
        correo: "ana@example.test",
        telefono: "+56 9 1234 5678",
      },
    });
    const postulacionId = creada.datos.postulacion.id;
    const admin = await ingresar("admin", "admin123");
    const solicitud = {
      googleAccessToken: "google-access-token-for-recruiter",
      inicio: "2099-12-01T14:00:00.000Z",
      zonaHoraria: "America/Santiago",
      duracionMinutos: 30,
    };

    assert.equal(
      (await pedir("POST", `/admin/postulaciones/${postulacionId}/entrevista`, { cuerpo: solicitud })).status,
      401,
    );
    assert.equal(
      (await pedir("POST", `/admin/postulaciones/${postulacionId}/entrevista`, { token: admin, cuerpo: solicitud })).status,
      409,
    );
    await pedir("PATCH", `/admin/postulaciones/${postulacionId}/estado`, {
      token: admin,
      cuerpo: { estado: "Entrevista" },
    });
    assert.equal(
      (await pedir("POST", `/admin/postulaciones/${postulacionId}/entrevista`, {
        token: admin,
        cuerpo: { ...solicitud, zonaHoraria: "No/Zona" },
      })).status,
      400,
    );

    const agendada = await pedir("POST", `/admin/postulaciones/${postulacionId}/entrevista`, {
      token: admin,
      cuerpo: solicitud,
    });
    assert.equal(agendada.status, 201);
    assert.equal(agendada.datos.postulacion.entrevista.estado, "Agendada");
    assert.equal(agendada.datos.postulacion.entrevista.organizador, "reclutador@example.test");
    assert.equal(agendada.datos.postulacion.entrevista.enlaceMeet, "https://meet.google.com/abc-defg-hij");
    assert.equal(JSON.stringify(agendada.datos).includes("googleAccessToken"), false);
    assert.equal(eventosGoogle[0].evento.attendees[0].email, "ana@example.test");

    assert.equal(
      (await pedir("PATCH", `/admin/postulaciones/${postulacionId}/entrevista`, {
        token: admin,
        cuerpo: { ...solicitud, googleAccessToken: "google-access-token-for-another-user" },
      })).status,
      403,
    );
    const reprogramada = await pedir("PATCH", `/admin/postulaciones/${postulacionId}/entrevista`, {
      token: admin,
      cuerpo: { ...solicitud, inicio: "2099-12-02T15:00:00.000Z" },
    });
    assert.equal(reprogramada.status, 200);
    assert.equal(reprogramada.datos.postulacion.entrevista.inicio, "2099-12-02T15:00:00.000Z");

    const cancelada = await pedir("DELETE", `/admin/postulaciones/${postulacionId}/entrevista`, {
      token: admin,
      cuerpo: { googleAccessToken: "google-access-token-for-recruiter" },
    });
    assert.equal(cancelada.status, 200);
    assert.equal(cancelada.datos.postulacion.entrevista.estado, "Cancelada");
    assert.deepEqual(eventosGoogle.map((evento) => evento.tipo), ["crear", "actualizar", "eliminar"]);
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
