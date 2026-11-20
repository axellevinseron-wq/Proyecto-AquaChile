import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { obtenerUsuarios } from "../auth";
import { useDatosAcceso } from "../useDatosAcceso";
import { apiFetch } from "../apiClient";

const ENLACES = [
  { id: "indicadores", texto: "Indicadores", permisos: ["indicadores"] },
  { id: "candidatos", texto: "Candidatos y solicitudes", permisos: ["candidatos", "solicitudes"], rutas: ["candidatos", "solicitudes"] },
  { id: "evaluacion-cv", texto: "Evaluación de CV con IA", permisos: ["candidatos"] },
];

function Sidebar({ sesion, onNavegar, onCerrarSesion, onVerPerfil }) {
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const { pathname } = useLocation();
  useDatosAcceso();
  const esAdmin = sesion.rol === "Administrador";
  const foto = obtenerUsuarios().find((u) => u.usuario === sesion.usuario)?.foto;

  useEffect(() => {
    if (!esAdmin) return undefined;
    let activo = true;

    const cargarPendientes = async () => {
      try {
        const respuesta = await apiFetch("/api/admin/solicitudes-acceso");
        const solicitudes = Array.isArray(respuesta)
            ? respuesta
            : Array.isArray(respuesta?.content)
                ? respuesta.content
                : [];
        if (activo) {
          setPendientes(solicitudes.filter((s) =>
              String(s.estado || "").toUpperCase() === "PENDIENTE"
          ).length);
        }
      } catch (error) {
        // Un error de red no debe mostrar un contador de solicitudes inventado.
        if (activo) setPendientes(0);
        console.error("No se pudo actualizar el contador de solicitudes de acceso:", error);
      }
    };

    void cargarPendientes();
    const intervalo = window.setInterval(cargarPendientes, 30000);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
    };
  }, [esAdmin, pathname]);

  const enlaces = ENLACES.filter((enlace) =>
      enlace.permisos.some((permiso) => sesion.permisos?.[permiso] !== false),
  ).map((enlace) => {
    const destino = enlace.id === "evaluacion-cv"
        ? "evaluacion-cv"
        : enlace.permisos.find((permiso) => sesion.permisos?.[permiso] !== false);
    return { ...enlace, destino };
  });

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
