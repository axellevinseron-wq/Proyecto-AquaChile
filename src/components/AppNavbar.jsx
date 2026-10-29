import Icon from "./Icon";
import { Fecha, Hora } from "./Reloj";

function AppNavbar({ sidebarAbierto, onToggleSidebar }) {
  return (
    <header className="main-header">
      <Fecha />
      <nav className="main-header__nav" aria-label="Barra superior">
        <Hora />
        <span className="topbar-item topbar-marca">AquaChile</span>
        {/* Botón hamburguesa a la derecha: abre y cierra el menú lateral derecho */}
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
      </nav>
    </header>
  );
}

export default AppNavbar;
