import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { leerSolicitudesAcceso, obtenerUsuarios } from "../auth";
import { useDatosAcceso } from "../useDatosAcceso";

// Candidatos y solicitudes son una sola opción; dentro de la página un botón cambia entre ambas.
const ENLACES = [
  { id: "indicadores", texto: "Indicadores", permisos: ["indicadores"] },
  { id: "candidatos", texto: "Candidatos y solicitudes", permisos: ["candidatos", "solicitudes"], rutas: ["candidatos", "solicitudes"] },
];

function Sidebar({ sesion, onNavegar, onCerrarSesion, onVerPerfil }) {
  const [panelAbierto, setPanelAbierto] = useState(true);
  const { pathname } = useLocation();
  const version = useDatosAcceso();
  const esAdmin = sesion.rol === "Administrador";
  const foto = useMemo(() => obtenerUsuarios().find((u) => u.usuario === sesion.usuario)?.foto, [sesion, version]);
  // Solo se muestran las secciones que el usuario tiene permitidas.
  const enlaces = ENLACES.filter((enlace) =>
    enlace.permisos.some((permiso) => sesion.permisos?.[permiso] !== false),
  )
    .map((enlace) => {
      // Si solo tiene permiso para una de las dos secciones, el enlace lleva a esa.
      const destino = enlace.permisos.find((permiso) => sesion.permisos?.[permiso] !== false);
      return { ...enlace, destino };
    });
  const pendientes = useMemo(
    () => (esAdmin ? leerSolicitudesAcceso().filter((s) => s.estado === "Pendiente").length : 0),
    [esAdmin, version],
  );

  return (
    <aside id="menu-lateral" className="main-sidebar" aria-label="Menú lateral">
      <button
        type="button"
        className="user-panel user-panel--boton"
        onClick={() => {
          onVerPerfil();
          onNavegar();
        }}
        aria-label={`Ver perfil de ${sesion.usuario}`}
      >
        <span className="user-panel__avatar" aria-hidden="true">
          {foto ? <img src={foto} alt="" /> : <Icon nombre="user" size={26} />}
        </span>
        <span>
          <span className="user-panel__nombre">{sesion.usuario}</span>
          <span className="user-panel__estado">
            <span className="punto-online" aria-hidden="true" /> Online
          </span>
        </span>
      </button>

      <p className="sidebar-titulo">Navegación Principal</p>

      <ul className="sidebar-menu">
        <li>
          <NavLink
            to="/inicio"
            className={({ isActive }) => `sidebar-link ${isActive ? "activo" : ""}`}
            onClick={onNavegar}
          >
            <Icon nombre="home" size={15} />
            <span className="flex-grow-1 text-start">Inicio</span>
          </NavLink>
        </li>

        <li>
          <button
            type="button"
            className="sidebar-link"
            onClick={() => setPanelAbierto((abierto) => !abierto)}
            aria-expanded={panelAbierto}
          >
            <Icon nombre="grid" size={15} />
            <span className="flex-grow-1 text-start">Panel de control</span>
            <Icon
              nombre="chevron"
              size={14}
              className={`sidebar-link__flecha ${panelAbierto ? "abierta" : ""}`}
            />
          </button>

          {panelAbierto && (
            <ul className="sidebar-submenu">
              {enlaces.map((enlace) => (
                <li key={enlace.id}>
                  <NavLink
                    to={`/${enlace.destino}`}
                    className={({ isActive }) =>
                      isActive || enlace.rutas?.some((ruta) => pathname === `/${ruta}`) ? "activo" : ""
                    }
                    onClick={onNavegar}
                  >
                    <Icon nombre="circle" size={10} />
                    {enlace.texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </li>

        {esAdmin && (
          <>
            <li className="sidebar-titulo sidebar-titulo--lista">Administración</li>
            <li>
              <NavLink
                to="/cuentas"
                className={({ isActive }) => `sidebar-link ${isActive ? "activo" : ""}`}
                onClick={onNavegar}
              >
                <Icon nombre="mail" size={15} />
                <span className="flex-grow-1 text-start">Solicitudes de acceso</span>
                {pendientes > 0 && (
                  <span className="badge text-bg-warning" aria-label={`${pendientes} pendientes`}>
                    {pendientes}
                  </span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/usuarios"
                className={({ isActive }) => `sidebar-link ${isActive ? "activo" : ""}`}
                onClick={onNavegar}
              >
                <Icon nombre="usuarios" size={15} />
                <span className="flex-grow-1 text-start">Usuarios y permisos</span>
              </NavLink>
            </li>
          </>
        )}

        <li>
          <NavLink
            to="/opciones"
            className={({ isActive }) => `sidebar-link ${isActive ? "activo" : ""}`}
            onClick={onNavegar}
          >
            <Icon nombre="opciones" size={15} />
            <span className="flex-grow-1 text-start">Opciones</span>
          </NavLink>
        </li>
      </ul>

      <div className="sidebar-pie">
        <button type="button" className="sidebar-link" onClick={onCerrarSesion}>
          <Icon nombre="salir" size={15} />
          <span className="flex-grow-1 text-start">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;