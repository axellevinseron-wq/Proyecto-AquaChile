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
    expect(await screen.findByText("Usuario o contraseña incorrectos.")).toBeInTheDocument();
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
    expect(screen.queryByRole("link", { name: "Ver el estado de mi solicitud" })).not.toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "Solicitar acceso" })).toBeInTheDocument();
  });

  it("envía una solicitud, muestra la notificación y pasa a la página de estado", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/solicitud");
    await usuario.type(screen.getByLabelText("Nombre"), "Ana");
    await usuario.type(screen.getByLabelText("Apellido"), "Prueba");
    await usuario.type(screen.getByLabelText("RUT"), "12.345.678-5");
    await usuario.type(screen.getByLabelText("Teléfono"), "+56 9 1234 5678");
    await usuario.type(screen.getByLabelText("Correo"), "ana@example.test");
    await usuario.type(screen.getByLabelText("Usuario que quieres usar"), "aprueba");
    await usuario.type(screen.getByLabelText("Motivo de la solicitud"), "Necesito acceso");
    await usuario.click(screen.getByRole("button", { name: "Enviar mi solicitud" }));

    expect(await screen.findByText(/Solicitud enviada correctamente/)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Estado de solicitud" })).toBeInTheDocument();
  });

  it("pide un RUT válido antes de enviar la solicitud", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/solicitud");
    await usuario.type(screen.getByLabelText("Nombre"), "Ana");
    await usuario.type(screen.getByLabelText("Apellido"), "Prueba");
    await usuario.type(screen.getByLabelText("RUT"), "12.345.678-9");
    await usuario.type(screen.getByLabelText("Teléfono"), "+56 9 1234 5678");
    await usuario.type(screen.getByLabelText("Correo"), "ana@example.test");
    await usuario.type(screen.getByLabelText("Usuario que quieres usar"), "aprueba");
    await usuario.type(screen.getByLabelText("Motivo de la solicitud"), "Necesito acceso");
    await usuario.click(screen.getByRole("button", { name: "Enviar mi solicitud" }));
    expect(screen.getByRole("alert")).toHaveTextContent("RUT válido");
  });

  it("rechaza un código incorrecto", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/solicitud?tab=estado");
    await usuario.type(screen.getByLabelText("Correo"), "felipe.nunez@example.test");
    await usuario.type(screen.getByLabelText("Código"), "XXXXXX");
    await usuario.click(screen.getByRole("button", { name: "Ver estado" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("no coinciden");
  });

  it("las solicitudes de ejemplo se pueden consultar con un clic", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/solicitud?tab=estado");
    await usuario.click(await screen.findByText("Solicitudes de ejemplo para probar"));
    await usuario.click(screen.getByRole("button", { name: "Consultar solicitud de Camila Fuentes" }));
    expect(await screen.findByText("Solicitud de Camila Fuentes")).toBeInTheDocument();
    expect(screen.getByText("K7M3QX9P")).toBeInTheDocument();
  });

  it("con el código correcto muestra el estado de la solicitud", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/solicitud?tab=estado");
    await usuario.type(screen.getByLabelText("Correo"), "felipe.nunez@example.test");
    await usuario.type(screen.getByLabelText("Código"), "fel358");
    await usuario.click(screen.getByRole("button", { name: "Ver estado" }));
    const titulo = await screen.findByText("Solicitud de Felipe Núñez");
    expect(titulo.parentElement).toHaveTextContent("Pendiente");
  });
});

describe("Administración", () => {
  it("el admin acepta una solicitud y el solicitante ve sus credenciales", async () => {
    const usuario = userEvent.setup();
    mostrarApp("/cuentas");
    await iniciarSesion(usuario);

    await usuario.click(
      await screen.findByRole("button", { name: "Marcar solicitud de fnunez como Aceptada" }),
    );
    expect(await screen.findByText(/marcada como aceptada/)).toBeInTheDocument();
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
