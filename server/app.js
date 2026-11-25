// Aplicación Express: API REST bajo /api y, en producción, también sirve el frontend compilado (dist).

import { existsSync, mkdirSync } from "node:fs";
import { open, readFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { Resend } from "resend";
import { crearAlmacen } from "./almacen.js";
import { crearClienteGoogleCalendar, GoogleCalendarError } from "./googleCalendar.js";
import { crearSesiones } from "./sesiones.js";
import { crearAutenticacion, crearLimitador, demasiadosIntentos, manejarErrores, rutaNoEncontrada } from "./middleware.js";
import {
  aceptarInvitacion,
  actualizarPerfil,
  actualizarUsuario,
  actualizarEstadoPostulacion,
  actualizarOferta,
  COLECCIONES,
  consultarInvitacion,
  crearOferta,
  crearInvitacion,
  crearPostulacion,
  iniciarSesion,
  leerInvitaciones,
  leerNotificaciones,
  marcarConexion,
  marcarDesconexion,
  obtenerConexiones,
  ofertaVigente,
  reemplazarColeccion,
  registrarLatido,
  revocarInvitacion,
  sesionDe,
  usuarioPublico,
  validarDatosEntrevista,
} from "./dominio.js";

const MINUTOS = 60 * 1000;
const MAX_CV_BYTES = 10 * 1024 * 1024;
const DIRECTORIO_CVS_DEFAULT = join(dirname(fileURLToPath(import.meta.url)), "data", "cvs");

async function esPdf(ruta) {
  const archivo = await open(ruta, "r");
  try {
    const firma = Buffer.alloc(5);
    const { bytesRead } = await archivo.read(firma, 0, firma.length, 0);
    return bytesRead === firma.length && firma.toString("ascii") === "%PDF-";
  } finally {
    await archivo.close();
  }
}

function responder(res, resultado, extra = {}) {
  if (!resultado.ok) {
    return res.status(resultado.status ?? 400).json({ error: resultado.error });
  }
  return res.json({ ok: true, ...extra });
}

function idDe(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) ? id : null;
}

export function crearApp({
  almacen = crearAlmacen(null),
  sesiones = crearSesiones(),
  carpetaPublica = null,
  clienteCorreo = undefined,
  clienteGoogleCalendar = crearClienteGoogleCalendar(),
  directorioCvs = DIRECTORIO_CVS_DEFAULT,
} = {}) {
  const app = express();
  const { requiereSesion, requiereAdmin, requierePermiso } = crearAutenticacion({ almacen, sesiones });
  const datos = () => almacen.datos;

  const resend = clienteCorreo === null
    ? null
    : clienteCorreo ?? (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);
  const remitente = process.env.RESEND_FROM || "AquaChile <onboarding@resend.dev>";
  const urlAplicacion = process.env.APP_BASE_URL || "http://localhost:5173";

  const limiteLogin = crearLimitador({ max: 10, ventanaMs: 10 * MINUTOS });
  const limitePostulacion = crearLimitador({ max: 20, ventanaMs: 60 * MINUTOS });
  const limiteInvitacion = crearLimitador({ max: 10, ventanaMs: 10 * MINUTOS });
  mkdirSync(directorioCvs, { recursive: true });

  const recibirArchivoCv = multer({
    storage: multer.diskStorage({
      destination: directorioCvs,
      filename: (_req, _archivo, callback) => callback(null, `${randomUUID()}.pdf`),
    }),
    limits: { fileSize: MAX_CV_BYTES, files: 1, fields: 5, fieldSize: 6000, parts: 6 },
    fileFilter: (_req, archivo, callback) => {
      const nombre = archivo.originalname.split(/[\\/]/).pop().toLocaleLowerCase("en-US");
      if (archivo.mimetype !== "application/pdf" || !nombre.endsWith(".pdf")) {
        const error = new Error("El currículum debe ser un archivo PDF.");
        error.code = "CV_INVALIDO";
        callback(error);
        return;
      }
      callback(null, true);
    },
  }).single("cv");

  function procesarCargaCv(req, res, next) {
    if (limitePostulacion.excedido(req.ip)) return demasiadosIntentos(res);
    recibirArchivoCv(req, res, (error) => {
      if (!error) return next();
      limitePostulacion.contar(req.ip);
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "El currículum no puede superar los 10 MB." });
        }
        return res.status(400).json({ error: "Solo puedes adjuntar un archivo PDF como currículum." });
      }
      if (error.code === "CV_INVALIDO") return res.status(400).json({ error: error.message });
      return next(error);
    });
  }

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    next();
  });


  // Las fotos de perfil y banners viajan como imagen en base64, por eso el límite es más alto.
  app.use(express.json({ limit: "4mb" }));

  const api = express.Router();
  api.use((req, res, next) => {
    res.set("Cache-Control", "no-cache");
    next();
  });

  api.get("/salud", (req, res) => res.json({ ok: true }));

  // ---------- Sesión ----------

  api.post("/sesion", (req, res) => {
    const { usuario, clave } = req.body ?? {};
    if (typeof usuario !== "string" || typeof clave !== "string" || !usuario.trim() || !clave) {
      return res.status(400).json({ error: "Ingresa tu usuario y contraseña." });
    }
    const intento = `${req.ip}|${usuario.trim().toLowerCase()}`;
    if (limiteLogin.excedido(intento)) {
      return demasiadosIntentos(res);
    }
    const encontrado = iniciarSesion(datos(), usuario, clave);
    if (!encontrado) {
      limiteLogin.contar(intento);
      return res.status(401).json({
        error: "Usuario o contraseña incorrectos.",
      });
    }
    limiteLogin.limpiar(intento);
    const token = sesiones.crear(encontrado.usuario);
    marcarConexion(datos(), encontrado.usuario);
    almacen.guardar();
    return res.json({ token, sesion: sesionDe(encontrado) });
  });

  api.get("/sesion", requiereSesion, (req, res) => res.json({ sesion: sesionDe(req.usuario) }));

  api.delete("/sesion", requiereSesion, (req, res) => {
    marcarDesconexion(datos(), req.usuario.usuario, true);
    sesiones.cerrar(req.token);
    almacen.guardar();
    res.status(204).end();
  });

  // Todo lo que el navegador necesita para pintar la pantalla, en una sola petición.
  // Un administrador ve todo; el resto de los usuarios solo su propio registro.
  api.get("/sincronizacion", requiereSesion, (req, res) => {
    const esAdmin = req.usuario.rol === "Administrador";
    res.json({
      usuarios: (esAdmin ? datos().usuarios : [req.usuario]).map(usuarioPublico),
      conexiones: esAdmin ? obtenerConexiones(datos()) : [],
      notificaciones: esAdmin ? leerNotificaciones(datos()) : [],
      invitaciones: esAdmin ? leerInvitaciones(datos()) : [],
    });
  });

  // ---------- Conexión (presencia) ----------

  api.post("/presencia/latido", requiereSesion, (req, res) => {
    registrarLatido(datos(), req.usuario.usuario, req.body?.actividad === true);
    res.status(204).end();
  });

  api.post("/presencia/desconexion", requiereSesion, (req, res) => {
    marcarDesconexion(datos(), req.usuario.usuario, false);
    res.status(204).end();
  });

  // ---------- Usuarios ----------

  api.patch("/usuarios/:usuario", requiereSesion, requiereAdmin, (req, res) => {
    const resultado = actualizarUsuario(datos(), req.params.usuario, req.body ?? {});
    if (resultado.ok) almacen.guardar();
    return responder(res, resultado);
  });

  api.patch("/usuarios/:usuario/perfil", requiereSesion, (req, res) => {
    const propio = req.usuario.usuario === req.params.usuario;
    if (!propio && req.usuario.rol !== "Administrador") {
      return res.status(403).json({ error: "Solo puedes editar tu propio perfil." });
    }
    const resultado = actualizarPerfil(datos(), req.params.usuario, req.body ?? {});
    if (resultado.ok) almacen.guardar();
    return responder(res, resultado);
  });

  // ---------- Invitaciones ----------

  api.get("/admin/invitaciones", requiereSesion, requiereAdmin, (req, res) => {
    res.json({ items: leerInvitaciones(datos()) });
  });

  api.post("/admin/invitaciones", requiereSesion, requiereAdmin, async (req, res) => {
    const resultado = crearInvitacion(datos(), req.body ?? {}, req.usuario.usuario);
    if (!resultado.ok) return responder(res, resultado);

    almacen.guardar();
    const enlace = new URL(`/invitacion/${resultado.token}`, urlAplicacion).toString();
    let correoEnviado = false;
    let aviso = "El correo no está configurado. Copia el enlace y compártelo directamente con la persona invitada.";

    if (resend) {
      try {
        const { error: errorCorreo } = await resend.emails.send({
          from: remitente,
          to: resultado.invitacion.correo,
          subject: "Invitación para crear tu acceso a AquaChile",
          text: `Hola ${resultado.invitacion.nombre},\n\nSe creó una cuenta para ti en el sistema AquaChile.\n\nUsuario: ${resultado.invitacion.usuario}\nDefine tu contraseña en este enlace (válido por 24 horas):\n${enlace}\n\nSi no esperabas esta invitación, puedes ignorar este mensaje.`,
        });
        if (errorCorreo) {
          console.error("No se pudo enviar la invitación:", errorCorreo.message);
          aviso = "La invitación se creó, pero el correo no se pudo enviar. Copia el enlace y compártelo directamente.";
        } else {
          correoEnviado = true;
          aviso = "Invitación enviada por correo.";
        }
      } catch (errorCorreo) {
        console.error("No se pudo enviar la invitación:", errorCorreo);
        aviso = "La invitación se creó, pero el correo no se pudo enviar. Copia el enlace y compártelo directamente.";
      }
    }

    return res.status(201).json({
      invitacion: resultado.invitacion,
      correoEnviado,
      enlace: correoEnviado ? null : enlace,
      aviso,
    });
  });

  api.post("/admin/invitaciones/:id/revocar", requiereSesion, requiereAdmin, (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Invitación no válida." });
    const resultado = revocarInvitacion(datos(), id);
    if (resultado.ok) almacen.guardar();
    return responder(res, resultado);
  });

  api.get("/invitaciones/:token", (req, res) => {
    res.set("Referrer-Policy", "no-referrer");
    res.set("Cache-Control", "no-store");
    const resultado = consultarInvitacion(datos(), req.params.token);
    if (!resultado.ok) return responder(res, resultado);
    return res.json({ invitacion: resultado.invitacion });
  });

  api.post("/invitaciones/:token/aceptar", (req, res) => {
    if (limiteInvitacion.excedido(req.ip)) return demasiadosIntentos(res);
    limiteInvitacion.contar(req.ip);
    const resultado = aceptarInvitacion(datos(), req.params.token, req.body?.clave);
    if (resultado.ok) almacen.guardar();
    return responder(res, resultado, { usuario: resultado.usuario });
  });

  // ---------- Ofertas y postulaciones ----------

  api.get("/ofertas", (req, res) => {
    const items = datos().ofertas.filter(ofertaVigente);
    res.json({ items });
  });

  api.get("/ofertas/:id", (req, res) => {
    const id = idDe(req);
    const oferta = datos().ofertas.find((item) => item.id === id && ofertaVigente(item));
    if (!oferta) return res.status(404).json({ error: "La oferta no existe o ya no está disponible." });
    return res.json({ oferta });
  });

  api.get("/admin/ofertas", requiereSesion, requiereAdmin, (req, res) => {
    res.json({ items: datos().ofertas });
  });

  api.post("/admin/ofertas", requiereSesion, requiereAdmin, (req, res) => {
    const resultado = crearOferta(datos(), req.body ?? {});
    if (resultado.ok) almacen.guardar();
    return responder(res, resultado, { oferta: resultado.oferta });
  });

  api.patch("/admin/ofertas/:id", requiereSesion, requiereAdmin, (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Oferta no válida." });
    const resultado = actualizarOferta(datos(), id, req.body ?? {});
    if (resultado.ok) almacen.guardar();
    return responder(res, resultado, { oferta: resultado.oferta });
  });

  api.post("/postulaciones", procesarCargaCv, async (req, res) => {
    if (req.file) {
      let firmaValida;
      try {
        firmaValida = await esPdf(req.file.path);
      } catch (error) {
        await unlink(req.file.path);
        throw error;
      }
      if (!firmaValida) {
        await unlink(req.file.path);
        limitePostulacion.contar(req.ip);
        return res.status(400).json({ error: "El archivo adjunto no es un PDF válido." });
      }
    }

    const resultado = crearPostulacion(datos(), req.body ?? {});
    if (!resultado.ok) {
      if (req.file) await unlink(req.file.path);
      if (resultado.status !== 409 && resultado.status !== 404) limitePostulacion.contar(req.ip);
      return responder(res, resultado);
    }

    if (req.file) {
      const nombreOriginal = req.file.originalname
        .split(/[\\/]/)
        .pop()
        .slice(0, 200);
      resultado.postulacion.cv = {
        archivoId: req.file.filename.slice(0, -4),
        nombre: nombreOriginal || "curriculum.pdf",
        tamano: req.file.size,
        tipo: "application/pdf",
        subidoEn: new Date().toISOString(),
      };
    }

    try {
      almacen.guardar();
    } catch (error) {
      const indice = datos().postulaciones.indexOf(resultado.postulacion);
      if (indice !== -1) datos().postulaciones.splice(indice, 1);
      if (req.file) await unlink(req.file.path);
      throw error;
    }
    limitePostulacion.contar(req.ip);
    const postulacionPublica = { ...resultado.postulacion };
    delete postulacionPublica.cv;
    return res.status(201).json({ postulacion: postulacionPublica });
  });

  api.get("/admin/postulaciones", requiereSesion, requiereAdmin, (req, res) => {
    res.json({ items: datos().postulaciones });
  });

  api.get("/admin/postulaciones/:id/cv", requiereSesion, requiereAdmin, async (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Postulación no válida." });
    const postulacion = datos().postulaciones.find((item) => item.id === id);
    if (!postulacion) return res.status(404).json({ error: "La postulación no existe." });
    if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(postulacion.cv?.archivoId ?? "")) {
      return res.status(404).json({ error: "Esta postulación no tiene un CV disponible." });
    }
    const ruta = join(directorioCvs, `${postulacion.cv.archivoId}.pdf`);
    if (!existsSync(ruta)) return res.status(404).json({ error: "No se encontró el CV asociado a esta postulación." });
    const archivo = await readFile(ruta);
    const disposicion = req.query.descargar === "1" ? "attachment" : "inline";
    return res
      .type("application/pdf")
      .set("Content-Disposition", `${disposicion}; filename="curriculum.pdf"`)
      .send(archivo);
  });

  api.delete("/admin/postulaciones/:id/cv", requiereSesion, requiereAdmin, async (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Postulación no válida." });
    const postulacion = datos().postulaciones.find((item) => item.id === id);
    if (!postulacion) return res.status(404).json({ error: "La postulación no existe." });
    const cv = postulacion.cv;
    if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(cv?.archivoId ?? "")) {
      return res.status(404).json({ error: "Esta postulación no tiene un CV disponible." });
    }

    delete postulacion.cv;
    try {
      almacen.guardar();
    } catch (error) {
      postulacion.cv = cv;
      throw error;
    }

    try {
      await unlink(join(directorioCvs, `${cv.archivoId}.pdf`));
    } catch (error) {
      postulacion.cv = cv;
      almacen.guardar();
      if (error.code === "ENOENT") {
        return res.status(404).json({ error: "No se encontró el archivo del CV para eliminarlo." });
      }
      throw error;
    }
    return res.json({ postulacion });
  });

  api.patch("/admin/postulaciones/:id/estado", requiereSesion, requiereAdmin, (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Postulación no válida." });
    const resultado = actualizarEstadoPostulacion(datos(), id, req.body?.estado);
    if (resultado.ok) almacen.guardar();
    return responder(res, resultado, { postulacion: resultado.postulacion });
  });

  function tokenGoogleDe(req, res) {
    const token = req.body?.googleAccessToken;
    if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
      res.status(400).json({ error: "Autoriza Google Calendar para continuar." });
      return null;
    }
    return token;
  }

  function responderErrorGoogle(res, error) {
    if (!(error instanceof GoogleCalendarError)) throw error;
    const status = error.status === 401 || error.status === 403 ? 400 : 502;
    const message = status === 400
      ? "La autorización de Google venció o no tiene los permisos necesarios. Autoriza nuevamente."
      : error.message;
    return res.status(status).json({ error: message });
  }

  async function validarPropiedadDeEntrevista(res, postulacion, token) {
    const organizador = await clienteGoogleCalendar.obtenerOrganizador(token);
    if (organizador !== postulacion.entrevista?.organizador) {
      res.status(403).json({ error: "Solo la cuenta que organizó esta entrevista puede modificarla." });
      return false;
    }
    return true;
  }

  api.post("/admin/postulaciones/:id/entrevista", requiereSesion, requiereAdmin, async (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Postulación no válida." });
    const postulacion = datos().postulaciones.find((item) => item.id === id);
    if (!postulacion) return res.status(404).json({ error: "La postulación no existe." });
    if (postulacion.estado !== "Entrevista") {
      return res.status(409).json({ error: "Cambia el estado de la postulación a Entrevista antes de agendar." });
    }

    const token = tokenGoogleDe(req, res);
    if (!token) return undefined;
    const validacion = validarDatosEntrevista(req.body);
    if (!validacion.ok) return res.status(validacion.status ?? 400).json({ error: validacion.error });

    try {
      const organizador = await clienteGoogleCalendar.obtenerOrganizador(token);
      const entrevistaExistente = postulacion.entrevista;
      if (entrevistaExistente?.estado === "Agendada") {
        return res.status(409).json({ error: "Esta postulación ya tiene una entrevista agendada." });
      }
      if (
        entrevistaExistente &&
        entrevistaExistente.estado !== "Cancelada" &&
        entrevistaExistente.organizador &&
        entrevistaExistente.organizador !== organizador
      ) {
        return res.status(403).json({ error: "Solo la cuenta que inició esta entrevista puede reintentarla." });
      }

      const reserva = {
        ...validacion.entrevista,
        estado: "Agendando",
        organizador,
        eventoId: entrevistaExistente?.estado === "Error" ? entrevistaExistente.eventoId : randomUUID().replaceAll("-", ""),
        solicitudMeetId: entrevistaExistente?.estado === "Error" ? entrevistaExistente.solicitudMeetId : randomUUID(),
      };
      postulacion.entrevista = reserva;
      almacen.guardar();

      let evento;
      try {
        evento = await clienteGoogleCalendar.crearEvento(token, {
          id: reserva.eventoId,
          summary: `Entrevista AquaChile - ${postulacion.ofertaTitulo}`,
          description: `Entrevista de selección con ${postulacion.nombre} para el cargo ${postulacion.ofertaTitulo}.`,
          start: { dateTime: reserva.inicio, timeZone: reserva.zonaHoraria },
          end: { dateTime: reserva.fin, timeZone: reserva.zonaHoraria },
          attendees: [{ email: postulacion.correo }],
          conferenceData: {
            createRequest: {
              requestId: reserva.solicitudMeetId,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        });
      } catch (error) {
        postulacion.entrevista = { ...reserva, estado: "Error" };
        almacen.guardar();
        return responderErrorGoogle(res, error);
      }

      postulacion.entrevista = {
        ...reserva,
        estado: "Agendada",
        enlaceCalendar: evento.htmlLink ?? "",
        enlaceMeet: evento.hangoutLink ?? evento.conferenceData?.entryPoints?.find((punto) => punto.entryPointType === "video")?.uri ?? "",
      };
      almacen.guardar();
      return res.status(201).json({ postulacion });
    } catch (error) {
      return responderErrorGoogle(res, error);
    }
  });

  api.patch("/admin/postulaciones/:id/entrevista", requiereSesion, requiereAdmin, async (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Postulación no válida." });
    const postulacion = datos().postulaciones.find((item) => item.id === id);
    if (!postulacion) return res.status(404).json({ error: "La postulación no existe." });
    if (postulacion.entrevista?.estado !== "Agendada") {
      return res.status(409).json({ error: "No hay una entrevista agendada para reprogramar." });
    }

    const token = tokenGoogleDe(req, res);
    if (!token) return undefined;
    const validacion = validarDatosEntrevista(req.body);
    if (!validacion.ok) return res.status(validacion.status ?? 400).json({ error: validacion.error });

    try {
      if (!await validarPropiedadDeEntrevista(res, postulacion, token)) return undefined;
      const evento = await clienteGoogleCalendar.actualizarEvento(token, postulacion.entrevista.eventoId, {
        start: { dateTime: validacion.entrevista.inicio, timeZone: validacion.entrevista.zonaHoraria },
        end: { dateTime: validacion.entrevista.fin, timeZone: validacion.entrevista.zonaHoraria },
      });
      postulacion.entrevista = {
        ...postulacion.entrevista,
        ...validacion.entrevista,
        enlaceCalendar: evento.htmlLink ?? postulacion.entrevista.enlaceCalendar,
        enlaceMeet: evento.hangoutLink ?? postulacion.entrevista.enlaceMeet,
      };
      almacen.guardar();
      return res.json({ postulacion });
    } catch (error) {
      return responderErrorGoogle(res, error);
    }
  });

  api.delete("/admin/postulaciones/:id/entrevista", requiereSesion, requiereAdmin, async (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Postulación no válida." });
    const postulacion = datos().postulaciones.find((item) => item.id === id);
    if (!postulacion) return res.status(404).json({ error: "La postulación no existe." });
    if (postulacion.entrevista?.estado !== "Agendada") {
      return res.status(409).json({ error: "No hay una entrevista agendada para cancelar." });
    }

    const token = tokenGoogleDe(req, res);
    if (!token) return undefined;
    try {
      if (!await validarPropiedadDeEntrevista(res, postulacion, token)) return undefined;
      await clienteGoogleCalendar.eliminarEvento(token, postulacion.entrevista.eventoId);
      postulacion.entrevista = { ...postulacion.entrevista, estado: "Cancelada" };
      almacen.guardar();
      return res.json({ postulacion });
    } catch (error) {
      return responderErrorGoogle(res, error);
    }
  });

  // ---------- Candidatos y solicitudes de evaluación ----------

  api.get("/colecciones/:nombre", requiereSesion, (req, res) => {
    if (!Object.hasOwn(COLECCIONES, req.params.nombre)) {
      return res.status(404).json({ error: "La lista no existe." });
    }
    return res.json({ items: datos()[req.params.nombre] });
  });

  api.put(
    "/colecciones/:nombre",
    requiereSesion,
    (req, res, next) => {
      const permiso = COLECCIONES[req.params.nombre];
      return permiso ? requierePermiso(permiso)(req, res, next) : next();
    },
    (req, res) => {
      const resultado = reemplazarColeccion(datos(), req.params.nombre, req.body?.items);
      if (resultado.ok) almacen.guardar();
      return responder(res, resultado);
    },
  );

  api.use(rutaNoEncontrada);
  app.use("/api", api);

  // ---------- Frontend compilado (producción) ----------
  if (carpetaPublica && existsSync(join(carpetaPublica, "index.html"))) {
    app.use(express.static(carpetaPublica));
    // React Router maneja las rutas del navegador (/solicitud, /perfil...): se devuelve siempre index.html.
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      return res.sendFile(join(carpetaPublica, "index.html"));
    });
  }

  app.use(manejarErrores);
  return app;
}
