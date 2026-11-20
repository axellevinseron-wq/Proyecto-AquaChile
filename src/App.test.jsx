import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { loginApi } from "./apiClient";

// Simulamos únicamente la autenticación HTTP. El resto de la aplicación
// y sus interacciones se ejecutan normalmente.
vi.mock("./apiClient", async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, loginApi: vi.fn() };
});

beforeEach(() => {
  sessionStorage.clear();
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
    mostrarApp();
    await usuario.type(screen.getByLabelText("Usuario"), "admin@aquachile.cl");
    await usuario.type(screen.getByLabelText("Contraseña"), "mala");
    await usuario.click(screen.getByRole("button", { name: "INGRESAR" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No fue posible iniciar sesión");
  });
});

describe("Navegación con React Router", () => {
  it("después de ingresar, / lleva a Inicio", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/");
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
    const usuario = userEvent.setup();
    mostrarApp("/ruta-inventada");
    await iniciarSesion(usuario);
    expect(await screen.findByRole("heading", { name: "Inicio" })).toBeInTheDocument();
  });
});

describe("Candidatos: formulario y búsqueda", () => {
  async function abrirFormulario(usuario) {
    mostrarApp("/candidatos");
    await iniciarSesion(usuario);
    await usuario.click(await screen.findByRole("button", { name: /Agregar candidato/ }));
  }

  it("enviar vacío muestra el error de validación", async () => {
    const usuario = userEvent.setup();
    await abrirFormulario(usuario);
    await usuario.click(screen.getByRole("button", { name: "Guardar candidato" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Completa todos los campos.");
  });

  it("guarda un candidato válido", async () => {
    const usuario = userEvent.setup();
    await abrirFormulario(usuario);
    await usuario.type(screen.getByLabelText("Nombre completo"), "Valeria Mora");
    await usuario.type(screen.getByLabelText("Correo"), "valeria.mora@example.test");
    await usuario.type(screen.getByLabelText("Cargo"), "Analista");
    await usuario.type(screen.getByLabelText("Familia de cargo"), "Datos");
    await usuario.click(screen.getByRole("button", { name: "Guardar candidato" }));
    expect(await screen.findByText("Candidato Valeria Mora agregado.")).toBeInTheDocument();
  });

  it("rechaza un correo que ya existe", async () => {
    const usuario = userEvent.setup();
    await abrirFormulario(usuario);
    await usuario.type(screen.getByLabelText("Nombre completo"), "Otra Persona");
    await usuario.type(screen.getByLabelText("Correo"), "daniela.rios@example.test");
    await usuario.type(screen.getByLabelText("Cargo"), "Analista");
    await usuario.type(screen.getByLabelText("Familia de cargo"), "Datos");
    await usuario.click(screen.getByRole("button", { name: "Guardar candidato" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ya existe un candidato con ese correo.");
  });

  it("la búsqueda oculta los candidatos que no coinciden", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/candidatos");
    await iniciarSesion(usuario);
    expect(await screen.findByText(/Daniela Ríos/)).toBeInTheDocument();

    await usuario.type(screen.getByLabelText("Buscar candidato"), "Matías");
    expect(screen.queryByText(/Daniela Ríos/)).not.toBeInTheDocument();
    expect(screen.getByText(/Matías Fuentes/)).toBeInTheDocument();
  });
});

describe("Login sin crear cuenta", () => {
  it("ya no ofrece crear cuenta y enlaza a la página de solicitudes", () => {
    mostrarApp("/");
    expect(screen.queryByText("Crear cuenta")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar una solicitud de acceso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el estado de mi solicitud" })).toBeInTheDocument();
  });

  it("al ingresar muestra la notificación de éxito", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/");
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
    expect(screen.getByRole("link", { name: /Volver al inicio de sesión/ })).toHaveAttribute("href", "/");
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
    const usuario = userEvent.setup();
    mostrarApp("/cuentas");
    await iniciarSesion(usuario);
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
    mostrarApp("/perfil");
    await iniciarSesion(usuario);

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
    mostrarApp("/candidatos");
    await iniciarSesion(usuario);

    expect(await screen.findByRole("heading", { name: "Candidatos" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Solicitudes" }));
    expect(await screen.findByRole("heading", { name: /Solicitudes de evaluación/ })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Candidatos" }));
    expect(await screen.findByRole("heading", { name: "Candidatos" })).toBeInTheDocument();
  });
});
