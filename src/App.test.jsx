import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { apiFetch, loginApi } from "./apiClient";

// Simulamos la API para que las pruebas de interfaz no dependan de PostgreSQL.
vi.mock("./apiClient", async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, loginApi: vi.fn(), apiFetch: vi.fn(), verificarSesionApi: vi.fn(async () => real.leerSesionApi()) };
});

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  const postulantes = [
    { id: "p1", nombre: "Daniela Ríos", correo: "daniela.rios@example.test", rut: "12.345.678-5" },
    { id: "p2", nombre: "Matías Fuentes", correo: "matias@example.test", rut: "11.111.111-1" },
  ];
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockImplementation(async (ruta, opciones = {}) => {
    const metodo = opciones.method || "GET";
    if (ruta === "/api/postulantes" && metodo === "POST") {
      const nuevo = { ...JSON.parse(opciones.body), id: "p3" };
      postulantes.push(nuevo);
      return nuevo;
    }
    if (metodo === "GET") {
      if (ruta === "/api/postulantes") return [...postulantes];
      if (["/api/postulaciones", "/api/ofertas", "/api/solicitudes", "/api/admin/solicitudes-acceso", "/api/publico/ofertas", "/api/usuarios"].includes(ruta)) return [];
    }
    throw new Error(`API no simulada: ${metodo} ${ruta}`);
  });
  // Impide que una llamada HTTP no simulada llegue al servidor real.
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("HTTP real no permitido en este test"); }));
  localStorage.removeItem("vcm-usuario-recordado");
  vi.mocked(loginApi).mockReset();
  vi.mocked(loginApi).mockImplementation(async (correo, password) => {
    if (correo !== "admin@aquachile.cl" || password !== "admin123") {
      throw new Error("Credenciales inválidas");
    }
    const sesion = {
      token: "jwt-de-prueba",
      usuario: "admin",
      correo: "admin@aquachile.cl",
      rolApi: "ADMIN",
      rol: "Administrador",
      permisos: { indicadores: true, candidatos: true, solicitudes: true },
    };
    sessionStorage.setItem("aquachile-sesion-api", JSON.stringify(sesion));
    return sesion;
  });
});

afterEach(() => vi.unstubAllGlobals());

// Los tests no deben enviar correos reales.
vi.mock("./correo", () => ({
  enviarSolicitudPorCorreo: vi.fn().mockResolvedValue({ ok: true }),
}));

function mostrarApp(ruta = "/") {
  return render(
      <MemoryRouter initialEntries={[ruta]}>
        <App />
      </MemoryRouter>,
  );
}

function prepararSesion() {
  sessionStorage.setItem("aquachile-sesion-api", JSON.stringify({
    token: "jwt-de-prueba", usuario: "admin", correo: "admin@aquachile.cl",
    rolApi: "ADMIN", rol: "Administrador", permisos: { indicadores: true, candidatos: true, solicitudes: true },
  }));
}

async function iniciarSesion(usuario) {
  await usuario.type(screen.getByLabelText("Usuario"), "admin@aquachile.cl");
  await usuario.type(screen.getByLabelText("Contraseña"), "admin123");
  await usuario.click(screen.getByRole("button", { name: "INGRESAR" }));
}

describe("Login", () => {
  it("muestra el login si no hay sesión", () => {
    mostrarApp("/candidatos");
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("muestra error con credenciales incorrectas", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/acceso");
    await usuario.type(screen.getByLabelText("Usuario"), "admin@aquachile.cl");
    await usuario.type(screen.getByLabelText("Contraseña"), "mala");
    await usuario.click(screen.getByRole("button", { name: "INGRESAR" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No fue posible iniciar sesión");
  });
});

describe("Navegación con React Router", () => {
  it("después de ingresar, /acceso lleva a Inicio", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/acceso");
    await iniciarSesion(usuario);
    expect(await screen.findByRole("heading", { name: "Inicio" })).toBeInTheDocument();
  });

  it("el menú lateral cambia de sección", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/inicio");
    await iniciarSesion(usuario);

    await usuario.click(screen.getByRole("link", { name: "Candidatos y solicitudes" }));
    expect(await screen.findByRole("heading", { name: "Candidatos" })).toBeInTheDocument();

    await usuario.click(screen.getByRole("link", { name: "Indicadores" }));
    expect(await screen.findByRole("heading", { name: "Indicadores" })).toBeInTheDocument();
  });

  it("una ruta que no existe vuelve a Inicio", async () => {
    prepararSesion();
    mostrarApp("/ruta-inventada");
    expect(await screen.findByRole("heading", { name: "Inicio" })).toBeInTheDocument();
  });
});

describe("Candidatos: formulario y búsqueda", () => {
  async function abrirFormulario(usuario) {
    prepararSesion();
    mostrarApp("/candidatos");
    await usuario.click(await screen.findByRole("button", { name: /Agregar candidato/ }));
  }

  it("enviar vacío muestra el error de validación", async () => {
    const usuario = userEvent.setup();
    await abrirFormulario(usuario);
    await usuario.click(screen.getByRole("button", { name: "Guardar candidato" }));
    expect(screen.getByLabelText("Nombre completo")).toBeInvalid();
    expect(screen.getByLabelText("Correo")).toBeInvalid();
    expect(apiFetch).not.toHaveBeenCalledWith("/api/postulantes", expect.objectContaining({ method: "POST" }));
  });

  it("guarda un candidato válido", async () => {
    const usuario = userEvent.setup();
    await abrirFormulario(usuario);
    await usuario.type(screen.getByLabelText("Nombre completo"), "Valeria Mora");
    await usuario.type(screen.getByLabelText("Correo"), "valeria.mora@example.test");
    await usuario.type(screen.getByLabelText("Teléfono"), "+56912345678");
    await usuario.type(screen.getByLabelText("RUT"), "12.345.678-5");
    await usuario.click(screen.getByRole("button", { name: "Guardar candidato" }));
    expect(await screen.findByText("Candidato guardado en PostgreSQL.")).toBeInTheDocument();
    expect(await screen.findByText("Valeria Mora")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/api/postulantes", expect.objectContaining({ method: "POST", body: JSON.stringify({ nombre: "Valeria Mora", correo: "valeria.mora@example.test", telefono: "+56912345678", rut: "12.345.678-5" }) }));
  });

  it("rechaza un correo que ya existe", async () => {
    const usuario = userEvent.setup();
    await abrirFormulario(usuario);
    await usuario.type(screen.getByLabelText("Nombre completo"), "Otra Persona");
    await usuario.type(screen.getByLabelText("Correo"), "daniela.rios@example.test");
    await usuario.type(screen.getByLabelText("Teléfono"), "+56912345678");
    await usuario.type(screen.getByLabelText("RUT"), "12.345.678-5");
    await usuario.click(screen.getByRole("button", { name: "Guardar candidato" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe un candidato con ese correo.");
    expect(apiFetch).not.toHaveBeenCalledWith("/api/postulantes", expect.objectContaining({ method: "POST" }));
  });

  it("la búsqueda oculta los candidatos que no coinciden", async () => {
    const usuario = userEvent.setup();
    prepararSesion();
    mostrarApp("/candidatos");
    expect(await screen.findByText(/Daniela Ríos/)).toBeInTheDocument();

    await usuario.type(screen.getByLabelText("Buscar registros"), "Matías");
    expect(screen.queryByText(/Daniela Ríos/)).not.toBeInTheDocument();
    expect(screen.getByText(/Matías Fuentes/)).toBeInTheDocument();
  });
});

describe("Login sin crear cuenta", () => {
  it("ya no ofrece crear cuenta y enlaza a la página de solicitudes", () => {
    mostrarApp("/acceso");
    expect(screen.queryByText("Crear cuenta")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar una solicitud de acceso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el estado de mi solicitud" })).toBeInTheDocument();
  });

  it("al ingresar muestra la notificación de éxito", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/acceso");
    await iniciarSesion(usuario);
    expect(await screen.findByText(/Sesión iniciada/)).toBeInTheDocument();
  });
});

describe("Página pública de solicitudes", () => {
  it("se abre sin iniciar sesión", () => {
    mostrarApp("/solicitud");
    expect(screen.getByRole("heading", { name: "Solicitud de acceso" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Formulario de solicitud" })).toBeInTheDocument();
  });

  it("solicita los datos personales y un CV obligatorio en PDF", () => {
    mostrarApp("/solicitud");
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeRequired();
    expect(screen.getByRole("textbox", { name: "Apellido" })).toBeRequired();
    expect(screen.getByRole("textbox", { name: "RUT" })).toBeRequired();
    expect(screen.getByRole("textbox", { name: "Correo electrónico" })).toBeRequired();
    const cv = screen.getByLabelText(/Currículum vitae \(obligatorio\)/);
    expect(cv).toBeRequired();
    expect(cv).toHaveAttribute("type", "file");
    expect(cv).toHaveAttribute("accept", ".pdf,application/pdf");
  });

  it("muestra la navegación pública sin menú lateral", () => {
    mostrarApp("/solicitud");
    expect(screen.getByRole("link", { name: /Volver al inicio de sesión/ })).toHaveAttribute("href", "/acceso");
    expect(screen.getByRole("button", { name: "Solicitud" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Estado de solicitud" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Menú lateral" })).not.toBeInTheDocument();
  });

  it("permite cambiar a la pestaña Estado de solicitud", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/solicitud");
    await usuario.click(screen.getByRole("button", { name: "Estado de solicitud" }));
    expect(screen.getByRole("heading", { name: "Consulta tu solicitud" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Consultar estado" })).toBeInTheDocument();
  });

  it("requiere correo y código de seguimiento para consultar", () => {
    mostrarApp("/solicitud?tab=estado");
    expect(screen.getByRole("textbox", { name: "Correo electrónico" })).toBeRequired();
    expect(screen.getByRole("textbox", { name: "Código de seguimiento" })).toBeRequired();
  });

  it("no muestra solicitudes de ejemplo", () => {
    mostrarApp("/solicitud?tab=estado");
    expect(screen.queryByText(/Solicitudes de ejemplo para probar/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Consultar solicitud de Camila Fuentes/ })).not.toBeInTheDocument();
  });
});

describe("Administración", () => {
  it("el administrador puede abrir la gestión de solicitudes de acceso", async () => {
    prepararSesion();
    mostrarApp("/cuentas");
    expect(await screen.findByRole("heading", { name: "Solicitudes de acceso" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeInTheDocument();
  });

  it("el administrador dispone de navegación hacia usuarios y permisos", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/inicio");
    await iniciarSesion(usuario);
    expect(await screen.findByRole("link", { name: "Usuarios y permisos" })).toBeInTheDocument();
  });

  it("al tocar el nombre de usuario se abre la página de perfil", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/inicio");
    await iniciarSesion(usuario);

    await usuario.click(await screen.findByRole("button", { name: "Ver perfil de admin" }));
    expect(await screen.findByRole("heading", { name: "Mi perfil" })).toBeInTheDocument();
    expect(screen.getByText("@admin", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
  });

  it("el perfil exige correo, teléfono y RUT válidos y guarda los datos", async () => {
    const usuario = userEvent.setup();
    prepararSesion();
    mostrarApp("/perfil");

    await usuario.click(await screen.findByRole("button", { name: "Editar" }));
    await usuario.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("El correo es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El teléfono es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El RUT es obligatorio.")).toBeInTheDocument();

    await usuario.type(screen.getByLabelText(/Correo/), "admin@example.test");
    await usuario.type(screen.getByLabelText(/Teléfono/), "+56 9 1234 5678");
    await usuario.type(screen.getByLabelText(/RUT/), "12.345.678-5");
    await usuario.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("admin@example.test")).toBeInTheDocument();
    expect(screen.getByText("12.345.678-5")).toBeInTheDocument();
  });

  it("candidatos y solicitudes están en la misma opción y un botón cambia entre ellas", async () => {
    const usuario = userEvent.setup();
    prepararSesion();
    mostrarApp("/candidatos");

    expect(await screen.findByRole("heading", { name: "Candidatos" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Solicitudes" }));
    expect(await screen.findByRole("heading", { name: /Solicitudes de evaluación/ })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Candidatos" }));
    expect(await screen.findByRole("heading", { name: "Candidatos" })).toBeInTheDocument();
  });
});
