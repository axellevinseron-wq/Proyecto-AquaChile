import { useEffect, useMemo, useState } from "react";
import { useToast } from "./Toast";
import Icon from "./Icon";
import {
  actualizarUsuario,
  leerNotificaciones,
  MINUTOS_INACTIVO,
  obtenerConexiones,
  obtenerUsuarios,
  PERMISOS,
  permisosDe,
  ROLES,
} from "../auth";
import { useDatosAcceso } from "../useDatosAcceso";
import { useReloj } from "../usePresencia";
import { descargarPdf } from "../pdf";

function formatearFecha(iso) {
  return iso ? new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function resumenPermisos(usuario) {
  if (usuario.rol === "Administrador") return "Todos";
  const activos = PERMISOS.filter((p) => permisosDe(usuario)[p.id]).map((p) => p.texto);
  return activos.length ? activos.join(", ") : "Ninguno";
}

// Para buscar sin importar mayúsculas ni tildes ("psicologo" encuentra "Psicólogo").
function simplificar(texto) {
  return (texto ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function coincide(busqueda, ...campos) {
  const buscado = simplificar(busqueda.trim());
  return !buscado || campos.some((campo) => simplificar(campo).includes(buscado));
}

const CLASE_ESTADO = {
  Conectado: "text-bg-success",
  Inactivo: "text-bg-warning",
  Desconectado: "text-bg-secondary",
};

function EstadoBadge({ estado }) {
  return <span className={`badge ${CLASE_ESTADO[estado]}`}>{estado}</span>;
}

const ICONO_NOTIFICACION = {
  sesion: "user",
  solicitud: "mail",
  permisos: "usuarios",
  perfil: "user",
  mensaje: "mail", // para los mensajes del chat cuando se implemente
};

// Ventana emergente: se cierra con Escape o al tocar fuera.
function Ventana({ id, titulo, ancha = false, onCerrar, children }) {
  useEffect(() => {
    function cerrarConEscape(evento) {
      if (evento.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", cerrarConEscape);
    return () => document.removeEventListener("keydown", cerrarConEscape);
  }, [onCerrar]);

  return (
    <div className="ventana-fondo" onClick={onCerrar}>
      <div
        className={`ventana ${ancha ? "ventana--tabla" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="ventana__cabecera">
          <h3 className="h5 mb-0" id={id}>{titulo}</h3>
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCerrar} />
        </div>
        {children}
      </div>
    </div>
  );
}

function BuscadorUsuarios({ id, valor, onChange }) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="visually-hidden">Buscar usuario</label>
      <input
        id={id}
        type="search"
        className="form-control form-control-sm"
        placeholder="Buscar usuario..."
        autoComplete="off"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
      />
    </div>
  );
}

// PDF con la información del usuario.
function descargarPerfilPdf(usuario, conexion) {
  const dato = (titulo, valor) => ({ texto: `${titulo}: ${valor || "—"}`, antes: 4 });
  descargarPdf(`usuario-${usuario.usuario}.pdf`, [
    { texto: "AquaChile", tamano: 12, negrita: true },
    { texto: "Información del usuario", tamano: 20, negrita: true, antes: 6 },
    { texto: `@${usuario.usuario}`, tamano: 13, antes: 6 },
    { texto: "Datos personales", tamano: 13, negrita: true, antes: 18 },
    dato("Nombre", usuario.nombre),
    dato("Correo", usuario.correo),
    dato("Teléfono", usuario.telefono),
    dato("RUT", usuario.rut),
    { texto: "Cuenta", tamano: 13, negrita: true, antes: 18 },
    dato("Rol", usuario.rol),
    dato("Acceso a", resumenPermisos(usuario)),
    dato("Estado", conexion?.estado),
    dato("Última actividad", formatearFecha(conexion?.ultimaActividad)),
    dato("Cuenta creada", formatearFecha(usuario.creado)),
    { texto: `Documento generado el ${formatearFecha(new Date().toISOString())}`, tamano: 9, antes: 28 },
  ]);
}

function VentanaPerfil({ usuario, conexion, esPropio, onCerrar, onGuardar }) {
  const [rol, setRol] = useState(usuario.rol);
  const [permisos, setPermisos] = useState(() => permisosDe(usuario));
  const [error, setError] = useState("");
  const esAdmin = rol === "Administrador";

  async function guardar() {
    const resultado = await onGuardar(usuario.usuario, { rol, permisos });
    if (!resultado.ok) setError(resultado.error);
  }

  return (
    <Ventana id="perfil-titulo" titulo={`Perfil de ${usuario.usuario}`} onCerrar={onCerrar}>
      <dl className="ventana__datos">
        <dt>Usuario</dt>
        <dd>{usuario.usuario}</dd>
        <dt>Nombre</dt>
        <dd>{usuario.nombre || "—"}</dd>
        <dt>Correo</dt>
        <dd>{usuario.correo || "—"}</dd>
        <dt>Teléfono</dt>
        <dd>{usuario.telefono || "—"}</dd>
        <dt>RUT</dt>
        <dd>{usuario.rut || "—"}</dd>
        <dt>Estado</dt>
        <dd>{conexion ? <EstadoBadge estado={conexion.estado} /> : "—"}</dd>
        <dt>Creado</dt>
        <dd>{formatearFecha(usuario.creado)}</dd>
      </dl>

      <div className="mb-3">
        <label htmlFor="perfil-rol" className="form-label">Rol</label>
        <select
          id="perfil-rol"
          className="form-select"
          value={rol}
          disabled={esPropio}
          onChange={(e) => {
            setRol(e.target.value);
            setError("");
          }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <fieldset className="mb-3">
        <legend className="form-label">Permisos</legend>
        {esAdmin && <p className="small text-secondary">Los administradores tienen acceso a todo el sistema.</p>}
        {PERMISOS.map((p) => (
          <div className="form-check" key={p.id}>
            <input
              id={`perm-${p.id}`}
              type="checkbox"
              className="form-check-input"
              checked={esAdmin || permisos[p.id]}
              disabled={esAdmin || esPropio}
              onChange={(e) => setPermisos((actuales) => ({ ...actuales, [p.id]: e.target.checked }))}
            />
            <label className="form-check-label" htmlFor={`perm-${p.id}`}>{p.texto}</label>
          </div>
        ))}
      </fieldset>

      {esPropio && <p className="small text-secondary">No puedes cambiar tu propio rol ni tus permisos.</p>}
      {error && (
        <p className="text-danger small" role="alert">
          {error}
        </p>
      )}

      <div className="d-flex flex-wrap gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => descargarPerfilPdf(usuario, conexion)}>
          Descargar PDF
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCerrar}>Cerrar</button>
        {!esPropio && (
          <button type="button" className="btn btn-success btn-sm" onClick={guardar}>
            Guardar cambios
          </button>
        )}
      </div>
    </Ventana>
  );
}

// Tabla completa de conexiones, con buscador.
function VentanaConexiones({ conexiones, onCerrar }) {
  const [busqueda, setBusqueda] = useState("");
  const filas = conexiones.filter((c) => coincide(busqueda, c.usuario, c.nombre, c.rol, c.estado));

  return (
    <Ventana id="conexiones-titulo" titulo="Estado de los usuarios" ancha onCerrar={onCerrar}>
      <BuscadorUsuarios id="buscar-conexiones" valor={busqueda} onChange={setBusqueda} />
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col">Última actividad</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => (
              <tr key={c.usuario}>
                <td>
                  <strong>{c.usuario}</strong>
                  {c.nombre && <small className="d-block text-secondary">{c.nombre}</small>}
                </td>
                <td>{c.rol}</td>
                <td><EstadoBadge estado={c.estado} /></td>
                <td className="small">{formatearFecha(c.ultimaActividad)}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="text-secondary text-center">No hay usuarios que coincidan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="form-text mb-0">
        Inactivo: sin actividad hace más de {MINUTOS_INACTIVO} minutos. Desconectado: cerró sesión o cerró la página.
      </p>
    </Ventana>
  );
}

// Panel 1: lista de todos los usuarios con buscador.
function ListaUsuarios({ lista, conexiones, onElegir }) {
  const [busqueda, setBusqueda] = useState("");
  const estados = Object.fromEntries(conexiones.map((c) => [c.usuario, c.estado]));
  const filtrados = lista.filter((u) => coincide(busqueda, u.usuario, u.nombre, u.correo, u.rol));

  return (
    <div className="card card-body caja caja--azul h-100">
      <h2 className="h5 mb-1">Usuarios del sistema</h2>
      <p className="text-secondary small mb-3">
        {lista.length} usuarios registrados. Toca uno para ver su información y sus permisos.
      </p>
      <BuscadorUsuarios id="buscar-usuarios" valor={busqueda} onChange={setBusqueda} />

      <ul className="list-group lista-usuarios">
        {filtrados.map((u) => (
          <li key={u.usuario} className="list-group-item p-0">
            <button
              type="button"
              className="lista-usuarios__fila"
              onClick={() => onElegir(u.usuario)}
              aria-label={`Ver perfil de ${u.usuario}`}
            >
              <span className="flex-grow-1 text-start">
                <strong>{u.usuario}</strong>
                {u.nombre && <small className="d-block text-secondary">{u.nombre}</small>}
              </span>
              <span className="small text-secondary">{u.rol}</span>
              <EstadoBadge estado={estados[u.usuario] ?? "Desconectado"} />
            </button>
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="list-group-item text-secondary text-center">No hay usuarios que coincidan.</li>
        )}
      </ul>
    </div>
  );
}

// Panel 2: resumen de quién está conectado. Al tocarlo se abre la tabla completa.
function ResumenConectados({ conexiones, onAbrir }) {
  const contar = (estado) => conexiones.filter((c) => c.estado === estado).length;
  const activos = conexiones.filter((c) => c.estado !== "Desconectado");

  return (
    <div
      className="card card-body caja caja--azul panel-clicable"
      onClick={onAbrir}
    >
      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
        <div>
          <h2 className="h5 mb-1">Usuarios conectados</h2>
          <p className="text-secondary small mb-0">
            {contar("Conectado")} conectados · {contar("Inactivo")} inactivos · {contar("Desconectado")} desconectados
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm text-nowrap"
          onClick={(evento) => {
            evento.stopPropagation();
            onAbrir();
          }}
        >
          Ver tabla completa
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {activos.slice(0, 5).map((c) => (
              <tr key={c.usuario}>
                <td>{c.usuario}</td>
                <td><EstadoBadge estado={c.estado} /></td>
              </tr>
            ))}
            {activos.length === 0 && (
              <tr>
                <td colSpan={2} className="text-secondary text-center">No hay usuarios conectados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {activos.length > 5 && <p className="form-text mb-0">Y {activos.length - 5} más en la tabla completa.</p>}
    </div>
  );
}

// Panel 3: últimas notificaciones. Aquí llegarán también los mensajes del chat.
function UltimasNotificaciones({ notificaciones }) {
  return (
    <div className="card card-body caja caja--azul flex-grow-1">
      <h2 className="h5 mb-1">Últimas notificaciones</h2>
      <p className="text-secondary small mb-3">
        Lo último que pasó con los usuarios. Aquí también llegarán los mensajes del chat.
      </p>
      <ul className="notif-lista">
        {notificaciones.slice(0, 6).map((n) => (
          <li key={n.id} className="notif-item">
            <span className="notif-item__icono" aria-hidden="true">
              <Icon nombre={ICONO_NOTIFICACION[n.tipo] ?? "bell"} size={16} />
            </span>
            <span className="flex-grow-1">
              {n.texto}
              <small className="d-block text-secondary">{formatearFecha(n.fecha)}</small>
            </span>
          </li>
        ))}
        {notificaciones.length === 0 && <li className="text-secondary">Aún no hay notificaciones.</li>}
      </ul>
    </div>
  );
}

// Solo para administradores: usuarios del sistema, quién está conectado y últimas notificaciones.
function UsuariosPanel({ usuarioActual }) {
  const { notificar } = useToast();
  const version = useDatosAcceso();
  const ahora = useReloj(15000); // los estados se recalculan solos cada 15 segundos
  const [seleccionado, setSeleccionado] = useState(null);
  const [verConexiones, setVerConexiones] = useState(false);

  // Se vuelve a leer cuando los datos cambian (aquí o en otra pestaña).
  const lista = useMemo(() => obtenerUsuarios(), [version]);
  const conexiones = useMemo(() => obtenerConexiones(ahora), [version, ahora]);
  const notificaciones = useMemo(() => leerNotificaciones(), [version]);

  const perfil = useMemo(() => lista.find((u) => u.usuario === seleccionado) ?? null, [lista, seleccionado]);

  async function guardar(nombre, cambios) {
    const resultado = await actualizarUsuario(nombre, cambios);
    if (resultado.ok) {
      setSeleccionado(null);
      notificar(`Permisos de ${nombre} actualizados. Se aplican la próxima vez que inicie sesión.`);
    }
    return resultado;
  }

  return (
    <section aria-labelledby="titulo-usuarios">
      <h1 id="titulo-usuarios" className="h4 mb-1">Usuarios y permisos</h1>
      <p className="text-secondary small mb-3">
        Revisa el perfil de cada usuario y decide a qué secciones del sistema puede entrar.
      </p>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <ListaUsuarios lista={lista} conexiones={conexiones} onElegir={setSeleccionado} />
        </div>
        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
          <ResumenConectados conexiones={conexiones} onAbrir={() => setVerConexiones(true)} />
          <UltimasNotificaciones notificaciones={notificaciones} />
        </div>
      </div>

      {perfil && (
        <VentanaPerfil
          key={perfil.usuario}
          usuario={perfil}
          conexion={conexiones.find((c) => c.usuario === perfil.usuario)}
          esPropio={perfil.usuario === usuarioActual}
          onCerrar={() => setSeleccionado(null)}
          onGuardar={guardar}
        />
      )}

      {verConexiones && <VentanaConexiones conexiones={conexiones} onCerrar={() => setVerConexiones(false)} />}
    </section>
  );
}

export default UsuariosPanel;
