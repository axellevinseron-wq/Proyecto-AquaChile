import { NavLink } from "react-router-dom";
import Icon from "./Icon";

const PERMISOS_POR_ROL = {
  "Analista de Reclutamiento": [
    "Registrar candidatos",
    "Editar información de candidatos",
    "Crear solicitudes de evaluación",
    "Consultar y filtrar solicitudes",
  ],

  "Profesional Evaluador": [
    "Consultar solicitudes asignadas",
    "Registrar información de evaluación",
    "Agregar observaciones",
    "Actualizar estado de solicitudes",
  ],

  Administrador: [
    "Gestionar solicitudes de cuentas",
    "Consultar candidatos",
    "Consultar solicitudes",
    "Acceder a indicadores del sistema",
  ],
};

function claseRol(rol) {
  switch (rol) {
    case "Analista de Reclutamiento":
      return "text-bg-primary";

    case "Profesional Evaluador":
      return "text-bg-success";

    case "Administrador":
      return "text-bg-dark";

    default:
      return "text-bg-secondary";
  }
}

function PerfilPanel({ usuario }) {
  if (!usuario) {
    return null;
  }

  const permisos = PERMISOS_POR_ROL[usuario.rol] ?? [
    "Acceso básico al sistema",
  ];

  return (
    <section aria-labelledby="titulo-perfil">

      {/* TÍTULO */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h3 mb-1" id="titulo-perfil">
            Mi perfil
          </h1>

          <p className="text-secondary mb-0">
            Información de tu cuenta y permisos en el sistema.
          </p>
        </div>
      </div>

      <div className="row g-3">

        {/* TARJETA PRINCIPAL */}
        <div className="col-12 col-lg-4">

          <div className="card border-0 shadow-sm h-100 overflow-hidden">

            <div className="perfil-portada" />

            <div className="card-body text-center">

              <div className="perfil-avatar mx-auto">
                <Icon nombre="user" size={42} />
              </div>

              <h2 className="h4 mt-3 mb-1">
                {usuario.nombre}
              </h2>

              <p className="text-secondary mb-2">
                @{usuario.usuario}
              </p>

              <span className={`badge ${claseRol(usuario.rol)} mb-3`}>
                {usuario.rol}
              </span>

              <div className="d-flex justify-content-center align-items-center gap-2">
                <span className="punto-online" aria-hidden="true" />
                <span className="small text-secondary">
                  Usuario conectado
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* INFORMACIÓN */}
        <div className="col-12 col-lg-8">

          <div className="card card-body caja caja--azul shadow-sm mb-3">

            <h2 className="h5 mb-4">
              Información personal
            </h2>

            <div className="row g-3">

              <div className="col-12 col-md-6">
                <div className="perfil-dato">

                  <div className="perfil-dato__icono">
                    <Icon nombre="user" size={18} />
                  </div>

                  <div>
                    <span className="perfil-dato__titulo">
                      Nombre completo
                    </span>

                    <p className="mb-0 fw-semibold">
                      {usuario.nombre}
                    </p>
                  </div>

                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="perfil-dato">

                  <div className="perfil-dato__icono">
                    <Icon nombre="user" size={18} />
                  </div>

                  <div>
                    <span className="perfil-dato__titulo">
                      Nombre de usuario
                    </span>

                    <p className="mb-0 fw-semibold">
                      @{usuario.usuario}
                    </p>
                  </div>

                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="perfil-dato">

                  <div className="perfil-dato__icono">
                    <Icon nombre="mail" size={18} />
                  </div>

                  <div>
                    <span className="perfil-dato__titulo">
                      Correo electrónico
                    </span>

                    <p className="mb-0 fw-semibold">
                      {usuario.correo}
                    </p>
                  </div>

                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="perfil-dato">

                  <div className="perfil-dato__icono">
                    <Icon nombre="grid" size={18} />
                  </div>

                  <div>
                    <span className="perfil-dato__titulo">
                      Rol del sistema
                    </span>

                    <p className="mb-0 fw-semibold">
                      {usuario.rol}
                    </p>
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* PERMISOS */}
          <div className="card card-body caja caja--azul shadow-sm">

            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 className="h5 mb-1">
                  Permisos del usuario
                </h2>

                <p className="text-secondary small mb-0">
                  Acciones disponibles según tu rol.
                </p>
              </div>

              <span className={`badge ${claseRol(usuario.rol)}`}>
                {usuario.rol}
              </span>
            </div>

            <div className="row g-2">

              {permisos.map((permiso) => (
                <div
                  className="col-12 col-md-6"
                  key={permiso}
                >
                  <div className="perfil-permiso">
                    <span className="perfil-check">
                      ✓
                    </span>

                    <span>
                      {permiso}
                    </span>
                  </div>
                </div>
              ))}

            </div>

          </div>

        </div>
      </div>


    </section>
  );
}

export default PerfilPanel;