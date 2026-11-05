import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import OpcionesPanel from "./components/OpcionesPanel";
import { FONDOS } from "./fondos";
import { coloresDesde, useOpciones } from "./opciones";
import { AVISO_SESION_VENCIDA } from "./api";
import { cerrarSesion, reiniciarDatos } from "./auth";
import { usePresenciaPropia } from "./usePresencia";
import { useSincronizacion } from "./useDatosAcceso";
import AppNavbar from "./components/AppNavbar";
import Sidebar from "./components/Sidebar";
import PerfilPanel from "./components/PerfilPanel";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SolicitudAccesoPage from "./pages/SolicitudAccesoPage";
import { ToastProvider, useToast } from "./components/Toast";

const ES_ESCRITORIO = "(min-width: 768px)";

function AppInterna() {
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { notificar } = useToast();
  const [opciones, setOpciones] = useOpciones();
  usePresenciaPropia(usuario?.usuario);
  useSincronizacion(Boolean(usuario));

  // Si el servidor ya no reconoce la sesión (venció o se reinició), se vuelve al login.
  useEffect(() => {
    function alVencer() {
      reiniciarDatos();
      setUsuario(null);
      navigate("/inicio");
      notificar("Tu sesión venció. Vuelve a iniciar sesión.", "error");
    }
    window.addEventListener(AVISO_SESION_VENCIDA, alVencer);
    return () => window.removeEventListener(AVISO_SESION_VENCIDA, alVencer);
  }, [navigate, notificar]);

  const [sidebarAbierto, setSidebarAbierto] = useState(
    () => window.matchMedia(ES_ESCRITORIO).matches,
  );

  function cerrarEnMovil() {
    if (!window.matchMedia(ES_ESCRITORIO).matches) {
      setSidebarAbierto(false);
    }
  }

  // Página pública: no necesita iniciar sesión.
  if (location.pathname === "/solicitud") {
    return <SolicitudAccesoPage />;
  }

  if (!usuario) {
    return (
      <LoginPage
        onLogin={(sesion) => {
          setUsuario(sesion);
          notificar(`Sesión iniciada. ¡Bienvenido, ${sesion.usuario}!`);
        }}
      />
    );
  }

  const fondo = FONDOS.find((f) => f.id === opciones.fondo);
  const escala = opciones.sistema / 100;

  return (
    <div
      className={`app-shell ${opciones.colorBarra ? "con-color" : ""} ${sidebarAbierto ? "sidebar-abierto" : "sidebar-cerrado"} ${fondo?.imagen ? "con-fondo" : "con-degradado"}`}
      style={{
        zoom: escala,
        "--zoom-sistema": escala,
        "--fondo-imagen": fondo?.imagen ? `url("${fondo.imagen}")` : "none",
        // Color elegido en Opciones: reemplaza el celeste/azul solo dentro del sistema
        ...(opciones.colorBarra ? coloresDesde(opciones.colorBarra) : {}),
      }}
    >
      <AppNavbar
        sidebarAbierto={sidebarAbierto}
        onToggleSidebar={() => setSidebarAbierto((abierto) => !abierto)}
      />
      <Sidebar
        sesion={usuario}
        onNavegar={cerrarEnMovil}
        onVerPerfil={() => navigate("/perfil")}
        onCerrarSesion={() => {
          cerrarSesion();
          setUsuario(null);
          navigate("/inicio");
          notificar("Sesión cerrada correctamente.");
        }}
      />
      <div className="sidebar-backdrop" onClick={cerrarEnMovil} aria-hidden="true" />

      <div className="content-wrapper">
        <Routes>
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route
            path="/opciones"
            element={
              <main className="contenido">
                <OpcionesPanel
                  opciones={opciones}
                  onCambiar={(cambios) => setOpciones((actuales) => ({ ...actuales, ...cambios }))}
                />
              </main>
            }
          />
          <Route
            path="/perfil"
            element={
              <main className="contenido">
                <PerfilPanel sesion={usuario} />
              </main>
            }
          />
          <Route path="/:vista" element={<DashboardPage sesion={usuario} />} />
        </Routes>
      </div>

      <footer className="main-footer">
        Copyright © 2026 todos los derechos reservados.
      </footer>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppInterna />
    </ToastProvider>
  );
}

export default App;