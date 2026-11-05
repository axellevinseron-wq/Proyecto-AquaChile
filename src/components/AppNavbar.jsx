import Icon from "./Icon";
import { FechaHora } from "./Reloj";

function AppNavbar({ sidebarAbierto, onToggleSidebar }) {
  return (
    <header className="main-header">
      {/* Botón hamburguesa a la izquierda de la barra: abre y cierra el menú lateral */}
      <button
        type="button"
        className="topbar-item topbar-toggle"
        onClick={onToggleSidebar}
        aria-label="Abrir o cerrar menú lateral"
        aria-expanded={sidebarAbierto}
        aria-controls="menu-lateral"
      >
        <Icon nombre="menu" size={22} />
      </button>
      <FechaHora className="topbar-fechahora" />
      <nav className="main-header__nav" aria-label="Barra superior">
        <span className="topbar-item topbar-marca">AquaChile</span>
      </nav>
    </header>
  );
}

export default AppNavbar;
