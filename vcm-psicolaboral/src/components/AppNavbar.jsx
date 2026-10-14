function AppNavbar() {
  return (
    <nav className="navbar navbar-expand-lg bg-dark sticky-top" data-bs-theme="dark" aria-label="Navegación principal">
      <div className="container">
        <a className="navbar-brand" href="#inicio">VcM Psicolaboral</a>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#menuPrincipal"
          aria-controls="menuPrincipal"
          aria-expanded="false"
          aria-label="Abrir o cerrar navegación"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="menuPrincipal">
          <div className="navbar-nav ms-auto">
            <a className="nav-link" href="#inicio">Inicio</a>
            <a className="nav-link" href="#candidatos">Candidatos</a>
            <a className="nav-link" href="#solicitudes">Solicitudes</a>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AppNavbar;
