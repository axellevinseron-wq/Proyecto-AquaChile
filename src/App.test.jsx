import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

function mostrarApp(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
}

async function iniciarSesion(usuario) {
  await usuario.type(screen.getByLabelText("Usuario"), "admin");
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
    await usuario.type(screen.getByLabelText("Usuario"), "admin");
    await usuario.type(screen.getByLabelText("Contraseña"), "mala");
    await usuario.click(screen.getByRole("button", { name: "INGRESAR" }));
    expect(screen.getByText("Usuario o contraseña incorrectos.")).toBeInTheDocument();
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

    await usuario.click(screen.getByRole("link", { name: "Candidatos" }));
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