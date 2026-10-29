import { useState } from "react";
import { NavLink } from "react-router-dom";
import Icon from "./Icon";

const ENLACES = [
  { id: "indicadores", texto: "Indicadores" },
  { id: "candidatos", texto: "Candidatos" },
  { id: "solicitudes", texto: "Solicitudes" },
];

function Sidebar({ usuario, onNavegar, onCerrarSesion }) {
  const [panelAbierto, setPanelAbierto] = useState(true);

  return (
    <aside id="menu-lateral" className="main-sidebar" aria-label="Menú lateral">
      <div className="user-panel">
        <span className="user-panel__avatar" aria-hidden="true">
          <Icon nombre="user" size={26} />
        </span>
        <div>
          <p className="user-panel__nombre">{usuario}</p>
          <p className="user-panel__estado">
            <span className="punto-online" aria-hidden="true" /> Online
          </p>
        </div>
      </div>

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
              {ENLACES.map((enlace) => (
                <li key={enlace.id}>
                  <NavLink
                    to={`/${enlace.id}`}
                    className={({ isActive }) => (isActive ? "activo" : "")}
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

        <li>
          <button type="button" className="sidebar-link" onClick={onCerrarSesion}>
            <Icon nombre="salir" size={15} />
            <span className="flex-grow-1 text-start">Cerrar sesión</span>
          </button>
        </li>
      </ul>
    </aside>
  );
}

export default Sidebar;