// Aplicación Express: API REST bajo /api y, en producción, también sirve el frontend compilado (dist).

import { existsSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import { Resend } from "resend";
import { crearAlmacen } from "./almacen.js";
import { crearSesiones } from "./sesiones.js";
import { crearAutenticacion, crearLimitador, demasiadosIntentos, manejarErrores, rutaNoEncontrada } from "./middleware.js";
import {
  actualizarPerfil,
  actualizarUsuario,
  agregarComentarioAcceso,
  cambiarEstadoAcceso,
  COLECCIONES,
  consultarSolicitud,
  crearSolicitudAcceso,
  ejemplosConsulta,
  iniciarSesion,
  leerNotificaciones,
  marcarConexion,
  marcarDesconexion,
  obtenerConexiones,
  reemplazarColeccion,
  registrarLatido,
  sesionDe,
  tieneSolicitudPendiente,
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
  ejemplosDemo = true,
} = {}) {
  const app = express();
  const { requiereSesion, requiereAdmin, requierePermiso } = crearAutenticacion({ almacen, sesiones });
  const datos = () => almacen.datos;

  //Resend
  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    :null;

  const correoPrueba = process.env.CORREO_PRUEBA;



  const limiteLogin = crearLimitador({ max: 10, ventanaMs: 10 * MINUTOS });
  const limiteConsulta = crearLimitador({ max: 30, ventanaMs: 10 * MINUTOS });
  const limiteEnvio = crearLimitador({ max: 20, ventanaMs: 60 * MINUTOS });

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
        pendiente: tieneSolicitudPendiente(datos(), usuario),
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
      solicitudesAcceso: esAdmin ? datos().solicitudesAcceso : [],
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

  // ---------- Solicitudes de acceso ----------

  // Públicas: no hace falta iniciar sesión.
  api.post("/accesos", async(req, res) => {
    if (limiteEnvio.excedido(req.ip)) {
      return demasiadosIntentos(res);
    }
    const resultado = crearSolicitudAcceso(datos(), req.body);
    if (!resultado.ok) {
      return responder(res, resultado);
    }
    limiteEnvio.contar(req.ip);

    almacen.guardar();

    //Enviar correo con resend
    if(resend && correoPrueba){
      const solicitud = resultado.solicitud

      try{
        const {error} = await resend.emails.send({
          from:"AquaChile<onboarding@resend.dev>",
          to:correoPrueba,
          subject:`Nueva solicitud de acceso -${solicitud.nombre}  ${solicitud.apellido}`,
          text:`
          Se recibio una nueva solicitud de acceso al sistema AquaChile.
          
          Nombre:${solicitud.nombre}
          Apellido:${solicitud.apellido}
          RUT: ${solicitud.rut}
          Teléfono: ${solicitud.telefono}
          Correo: ${solicitud.correo}
          Usuario solicitado: ${solicitud.usuario}

          Motivo:
          ${solicitud.motivo}

          Codigo de seguimiento:
          ${solicitud.codigo}

          Estado:
          ${solicitud.estado}
          
          `
        });

        if(error){
          console.error(
            "Error al enviar correo con Resend:",error.message
          );
        }else{
          console.log(
            "Correo de solicitud enviado correctamente."
          );
        }
      } catch(error){
        "No se pudo enviar el correo:", error.message
      };
    }

    return res.status(201).json({ solicitud: resultado.solicitud });
  });




  // Es POST (y no GET) para que el correo y el código no queden en la URL ni en los registros.
  api.post("/accesos/consulta", (req, res) => {
    if (limiteConsulta.excedido(req.ip)) {
      return demasiadosIntentos(res);
    }
    const solicitud = consultarSolicitud(datos(), req.body?.correo, req.body?.codigo);
    if (!solicitud) {
      limiteConsulta.contar(req.ip);
      return res.status(404).json({ error: "El correo o el código no coinciden con ninguna solicitud." });
    }
    return res.json({ solicitud });
  });

  api.get("/accesos/ejemplos", (req, res) => {
    res.json({ ejemplos: ejemplosDemo ? ejemplosConsulta(datos()) : [] });
  });

  // Solo administradores.
  api.post("/accesos/:id/estado", requiereSesion, requiereAdmin, (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Solicitud no válida." });
    const resultado = cambiarEstadoAcceso(datos(), id, req.body?.estado, req.usuario.usuario);
    if (resultado.ok) {
      if (resultado.usuarioEliminado) {
        sesiones.cerrarDe(resultado.usuarioEliminado);
        delete datos().presencia[resultado.usuarioEliminado];
      }
      almacen.guardar();
    }
    return responder(res, resultado);
  });

  api.post("/accesos/:id/comentarios", requiereSesion, requiereAdmin, (req, res) => {
    const id = idDe(req);
    if (id === null) return res.status(400).json({ error: "Solicitud no válida." });
    const resultado = agregarComentarioAcceso(datos(), id, req.body?.texto, req.usuario.usuario);
    if (resultado.ok) almacen.guardar();
    return responder(res, resultado);
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
