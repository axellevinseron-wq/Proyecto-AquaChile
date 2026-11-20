import { useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { useToast } from "./Toast";
import { actualizarPerfil, obtenerUsuarios, PERMISOS, permisosDe } from "../auth";
import { useDatosAcceso } from "../useDatosAcceso";
import { correoValido, rutValido, telefonoValido } from "../logica";

// Reduce la imagen elegida para que ocupe poco en localStorage.
function reducirImagen(archivo, anchoMax, altoMax) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error("No se pudo leer la imagen."));
    lector.onload = () => {
      const imagen = new Image();
      imagen.onerror = () => rechazar(new Error("El archivo no es una imagen válida."));
      imagen.onload = () => {
        const escala = Math.min(1, anchoMax / imagen.width, altoMax / imagen.height);
        const lienzo = document.createElement("canvas");
        lienzo.width = Math.round(imagen.width * escala);
        lienzo.height = Math.round(imagen.height * escala);
        lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        resolver(lienzo.toDataURL("image/jpeg", 0.85));
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

const CAMPOS = [
  { id: "nombre", texto: "Nombre completo", icono: "user", tipo: "text", autoComplete: "name" },
  { id: "usuario", texto: "Nombre de usuario", icono: "user", fijo: true },
  { id: "correo", texto: "Correo", icono: "mail", tipo: "email", autoComplete: "email", obligatorio: true },
  { id: "telefono", texto: "Teléfono", icono: "info", tipo: "tel", autoComplete: "tel", obligatorio: true },
  { id: "rut", texto: "RUT", icono: "info", tipo: "text", autoComplete: "off", obligatorio: true },
];

function validar(datos) {
  const errores = {};
  if (!datos.correo.trim()) errores.correo = "El correo es obligatorio.";
  else if (!correoValido(datos.correo)) errores.correo = "Ingresa un correo válido.";
  if (!datos.telefono.trim()) errores.telefono = "El teléfono es obligatorio.";
  else if (!telefonoValido(datos.telefono)) errores.telefono = "Ingresa un teléfono válido (8 a 12 dígitos).";
  if (!datos.rut.trim()) errores.rut = "El RUT es obligatorio.";
  else if (!rutValido(datos.rut)) errores.rut = "Ingresa un RUT válido, por ejemplo 12.345.678-5.";
  return errores;
}

function PerfilPanel({ sesion }) {
  const { notificar } = useToast();
  const version = useDatosAcceso();
  const usuario = useMemo(
    () => obtenerUsuarios().find((u) => u.usuario === sesion.usuario) ?? { usuario: sesion.usuario, rol: sesion.rol },
    [sesion, version],
  );
  const [editando, setEditando] = useState(false);
  const [formulario, setFormulario] = useState(null);
  const [errores, setErrores] = useState({});
  const [errorImagen, setErrorImagen] = useState("");
  const entradaFoto = useRef(null);
  const entradaBanner = useRef(null);

  const faltantes = !usuario.correo || !usuario.telefono || !usuario.rut;
  const permitidas = PERMISOS.filter((p) => permisosDe(usuario)[p.id]).map((p) => p.texto);

  function guardarImagen(campo) {
    return async (evento) => {
      const archivo = evento.target.files?.[0];
      evento.target.value = "";
      if (!archivo) return;
      try {
        const ancho = campo === "foto" ? 256 : 1200;
        const alto = campo === "foto" ? 256 : 300;
        const imagen = await reducirImagen(archivo, ancho, alto);
        setErrorImagen("");
        guardarCampos({ [campo]: imagen }, campo === "foto" ? "Foto actualizada." : "Banner actualizado.");
      } catch (error) {
        setErrorImagen(error.message);
      }
    };
  }

  function guardarCampos(cambios, mensaje) {
    const resultado = actualizarPerfil(usuario.usuario, {
      nombre: usuario.nombre ?? "",
      correo: usuario.correo ?? "",
      telefono: usuario.telefono ?? "",
      rut: usuario.rut ?? "",
      foto: usuario.foto,
      banner: usuario.banner,
      ...cambios,
    });
    if (resultado.ok) notificar(mensaje);
  }

  function empezarEdicion() {
    setFormulario({
      nombre: usuario.nombre ?? "",
      correo: usuario.correo ?? "",
      telefono: usuario.telefono ?? "",
      rut: usuario.rut ?? "",
    });
    setErrores({});
    setEditando(true);
  }

  function guardar(evento) {
    evento.preventDefault();
    const encontrados = validar(formulario);
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;
    guardarCampos(formulario, "Tus datos se guardaron correctamente.");
    setEditando(false);
  }

  return (
    <section aria-labelledby="titulo-perfil">
      <h1 className="h3 mb-1" id="titulo-perfil">Mi perfil</h1>
      <p className="text-secondary small mb-3">Información de tu cuenta y permisos en el sistema.</p>

      <div className="card perfil-cabecera mb-3">
        <div
          className="perfil-banner"
          style={usuario.banner ? { backgroundImage: `url("${usuario.banner}")` } : undefined}
        >
          <div className="perfil-banner__acciones">
            <button type="button" className="btn btn-light btn-sm" onClick={() => entradaBanner.current?.click()}>
              Cambiar banner
            </button>
            {usuario.banner && (
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={() => guardarCampos({ banner: "" }, "Banner quitado.")}
              >
                Quitar banner
              </button>
            )}
          </div>
        </div>

        <div className="perfil-identidad">
          <span className="perfil-avatar">
            {usuario.foto ? (
              <img src={usuario.foto} alt={`Foto de ${usuario.usuario}`} />
            ) : (
              <Icon nombre="user" size={42} />
            )}
          </span>

          <div className="d-flex gap-2 mb-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => entradaFoto.current?.click()}>
              Cambiar foto
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!usuario.foto}
              onClick={() => guardarCampos({ foto: "" }, "Foto quitada.")}
            >
              Quitar
            </button>
          </div>
          {errorImagen && <p className="text-danger small mb-2" role="alert">{errorImagen}</p>}

          <p className="perfil-nombre">{usuario.nombre || usuario.usuario}</p>
          <p className="perfil-usuario">@{usuario.usuario}</p>
          <span className="badge text-bg-dark mb-2">{usuario.rol}</span>
          <p className="perfil-conectado">
            <span className="punto-online" aria-hidden="true" /> Usuario conectado
          </p>
        </div>

        <input ref={entradaFoto} type="file" accept="image/*" className="visually-hidden" aria-label="Elegir foto" onChange={guardarImagen("foto")} />
        <input ref={entradaBanner} type="file" accept="image/*" className="visually-hidden" aria-label="Elegir banner" onChange={guardarImagen("banner")} />
      </div>

      <div className="card card-body caja caja--azul mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Información personal</h2>
          {!editando && (
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={empezarEdicion}>
              Editar
            </button>
          )}
        </div>

        {faltantes && !editando && (
          <p className="alert alert-warning py-2 small" role="note">
            Faltan datos obligatorios: correo, teléfono y RUT. Presiona Editar para completarlos.
          </p>
        )}

        {editando ? (
          <form onSubmit={guardar} noValidate>
            <div className="row g-3">
              {CAMPOS.map((campo) => (
                <div className="col-12 col-md-6" key={campo.id}>
                  <label htmlFor={`perfil-${campo.id}`} className="form-label">
                    {campo.texto}
                    {campo.obligatorio && <span aria-hidden="true"> *</span>}
                  </label>
                  <input
                    id={`perfil-${campo.id}`}
                    type={campo.tipo ?? "text"}
                    className={`form-control ${errores[campo.id] ? "is-invalid" : ""}`}
                    autoComplete={campo.autoComplete}
                    value={campo.fijo ? usuario.usuario : formulario[campo.id]}
                    disabled={campo.fijo}
                    required={campo.obligatorio}
                    onChange={(e) => setFormulario((actual) => ({ ...actual, [campo.id]: e.target.value }))}
                  />
                  {errores[campo.id] && <div className="invalid-feedback">{errores[campo.id]}</div>}
                </div>
              ))}
            </div>
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditando(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-success btn-sm">Guardar cambios</button>
            </div>
          </form>
        ) : (
          <dl className="perfil-datos">
            {CAMPOS.map((campo) => (
              <div key={campo.id}>
                <dt>
                  <Icon nombre={campo.icono} size={16} /> {campo.texto}
                </dt>
                <dd>{campo.id === "usuario" ? `@${usuario.usuario}` : usuario[campo.id] || "Sin completar"}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="card card-body caja caja--azul">
        <h2 className="h5 mb-2">Permisos</h2>
        <p className="mb-0">
          {usuario.rol === "Administrador"
            ? "Eres administrador: tienes acceso a todo el sistema."
            : permitidas.length
              ? `Puedes entrar a: ${permitidas.join(", ")}.`
              : "Por ahora no tienes acceso a ninguna sección."}
        </p>
      </div>
    </section>
  );
}

export default PerfilPanel;
