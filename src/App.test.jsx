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
  await screen.findByRole("link", { name: "Candidatos y solicitudes" });
}

describe("Login", () => {
  it("muestra el login si no hay sesión", () => {
    mostrarApp("/acceso");
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("muestra error con credenciales incorrectas", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/acceso");
    await usuario.type(screen.getByLabelText("Usuario"), "admin");
    await usuario.type(screen.getByLabelText("Contraseña"), "mala");
    await usuario.click(screen.getByRole("button", { name: "INGRESAR" }));
    expect(await screen.findByText("Usuario o contraseña incorrectos.")).toBeInTheDocument();
  });
});

describe("Navegación con React Router", () => {
  it("después de ingresar desde /acceso lleva a Inicio", async () => {
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
  it("en /acceso solo enlaza a las ofertas y redirige el formulario público antiguo", () => {
    mostrarApp("/acceso");
    expect(screen.queryByText("Crear cuenta")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /solicitud de acceso/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver ofertas de trabajo" })).toHaveAttribute("href", "/");
  });

  it("al ingresar muestra la notificación de éxito", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/acceso");
    await iniciarSesion(usuario);
    expect(await screen.findByText(/Sesión iniciada/)).toBeInTheDocument();
  });
});

describe("Invitaciones", () => {
  it("redirige la ruta de solicitud anterior y rechaza enlaces de invitación inválidos", async () => {
    mostrarApp("/solicitud");
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    mostrarApp(`/invitacion/${"0".repeat(64)}`);
    expect(await screen.findByRole("heading", { name: "Invitación no disponible" })).toBeInTheDocument();
  });
});

describe("Portal público de empleos", () => {
  it("usa las ofertas como portada y lleva el acceso interno a /acceso", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/");
    expect(await screen.findByRole("heading", { name: "Encuentra tu próximo desafío" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("link", { name: "Acceso equipo" }));
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("muestra ofertas y permite enviar una postulación sin iniciar sesión", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/empleos");
    expect(await screen.findByRole("heading", { name: "Encuentra tu próximo desafío" })).toBeInTheDocument();
    expect(await screen.findByText("Operador/a de Centro de Cultivo")).toBeInTheDocument();

    await usuario.click(screen.getAllByRole("link", { name: /Ver oferta/ })[0]);
    expect(await screen.findByRole("heading", { name: "Postula a esta oferta" })).toBeInTheDocument();
    await usuario.type(screen.getByLabelText("Nombre completo"), "Ana Prueba");
    await usuario.type(screen.getByLabelText("Correo electrónico"), "ana@example.test");
    await usuario.type(screen.getByLabelText("Teléfono"), "+56 9 1234 5678");
    await usuario.click(screen.getByRole("button", { name: "Enviar postulación" }));
    expect(await screen.findByText(/Recibimos tu postulación/)).toBeInTheDocument();
  });
});

describe("Administración", () => {
  it("el administrador puede crear una invitación y obtener el enlace", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/usuarios");
    await iniciarSesion(usuario);

    await usuario.click(await screen.findByRole("button", { name: "Invitar usuario" }));
    await usuario.type(screen.getByLabelText("Nombre de usuario"), "aprueba");
    await usuario.type(screen.getByLabelText("Nombre completo"), "Ana Prueba");
    await usuario.type(screen.getByLabelText("Correo de invitación"), "ana@example.test");
    await usuario.click(screen.getByRole("button", { name: "Crear invitación" }));
    expect(await screen.findByText(/El correo no está configurado/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enlace de invitación/).value).toMatch(/\/invitacion\/[a-f0-9]{64}$/);
  });

  it("el admin ve la lista de usuarios y abre un perfil", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/usuarios");
    await iniciarSesion(usuario);

    await usuario.click(await screen.findByRole("button", { name: "Ver perfil de psicologo" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Perfil de psicologo");
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
