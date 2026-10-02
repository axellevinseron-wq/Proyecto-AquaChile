import AppNavbar from "./components/AppNavbar";

function App() {
  return (
    <>
      {/* 1. Componente creado en un archivo separado. */}
      <AppNavbar />

      <main className="container py-4">

        {/* 2. Encabezado principal del Dashboard. */}
        <section id="inicio" className="mb-4">
          <p className="text-secondary mb-1">
            Proyecto VcM · Full Stack II
          </p>

          <h1 className="h3">
            Gestión de Evaluaciones Psicolaborales
          </h1>

          <p className="text-secondary">
            Resumen general del proceso de evaluación.
          </p>
        </section>

        {/* 3. Grid responsive de Bootstrap. */}
        <section className="row g-3 mb-5">

          <div className="col-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h3">12</h2>
                <p className="mb-0">Candidatos</p>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h3">5</h2>
                <p className="mb-0">Pendientes</p>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h3">4</h2>
                <p className="mb-0">En proceso</p>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h3">3</h2>
                <p className="mb-0">Finalizadas</p>
              </div>
            </div>
          </div>

        </section>

        {/* 4. Primeras secciones del futuro sistema. */}
        <section className="row g-4">

          <div id="candidatos" className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h2 className="h5">Candidatos</h2>
                <p>Consultar y registrar candidatos.</p>
                <button className="btn btn-primary">
                  Ver candidatos
                </button>
              </div>
            </div>
          </div>

          <div id="solicitudes" className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h2 className="h5">Solicitudes</h2>
                <p>Gestionar solicitudes de evaluación.</p>
                <button className="btn btn-outline-primary">
                  Ver solicitudes
                </button>
              </div>
            </div>
          </div>

        </section>

      </main>
    </>
  );
}

export default App;