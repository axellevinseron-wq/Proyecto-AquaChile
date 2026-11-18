// Aplicación Express: API REST bajo /api y, en producción, también sirve el frontend compilado (dist).

import { existsSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import { Resend } from "resend";
import { crearAlmacen } from "./almacen.js";
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
} from "./dominio.js";

const MINUTOS = 60 * 1000;

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

  api.post("/postulaciones", (req, res) => {
    if (limitePostulacion.excedido(req.ip)) return demasiadosIntentos(res);
    const resultado = crearPostulacion(datos(), req.body ?? {});
    if (!resultado.ok) {
      if (resultado.status !== 409 && resultado.status !== 404) limitePostulacion.contar(req.ip);
      return responder(res, resultado);
    }
    limitePostulacion.contar(req.ip);
    almacen.guardar();
    return res.status(201).json({ postulacion: resultado.postulacion });
  });

  api.get("/admin/postulaciones", requiereSesion, requiereAdmin, (req, res) => {
    res.json({ items: datos().postulaciones });
  });

  api.patch("/admin/postulaciones/:id/estado", requiereSesion, requiereAdmin, (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Postulación no válida." });
    const resultado = actualizarEstadoPostulacion(datos(), id, req.body?.estado);
    if (resultado.ok) almacen.guardar();
    return responder(res, resultado, { postulacion: resultado.postulacion });
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
