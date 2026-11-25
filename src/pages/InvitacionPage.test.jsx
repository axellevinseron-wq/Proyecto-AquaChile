import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiFetch } from "../apiClient";
import InvitacionPage from "./InvitacionPage";

vi.mock("../apiClient", () => ({ apiFetch: vi.fn() }));

function renderInvitacion() {
  return render(
    <MemoryRouter initialEntries={["/invitacion/token-unico"]}>
      <Routes>
        <Route path="/invitacion/:token" element={<InvitacionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("InvitacionPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("consulta la invitación y configura la contraseña con el token de la ruta", async () => {
    apiFetch
      .mockResolvedValueOnce({
        nombre: "Persona Invitada",
        correo: "persona@example.com",
        rol: "EVALUADOR",
        expira: "2030-01-01T12:00:00Z",
      })
      .mockResolvedValueOnce(null);
    const user = userEvent.setup();

    renderInvitacion();

    expect(await screen.findByText("persona@example.com")).toBeTruthy();
    await user.type(screen.getByLabelText("Crea una contraseña"), "clave-segura-123");
    await user.type(screen.getByLabelText("Confirma la contraseña"), "clave-segura-123");
    await user.click(screen.getByRole("button", { name: "Configurar contraseña" }));

    await screen.findByText("Tu contraseña quedó configurada. Ya puedes ingresar al sistema.");
    expect(apiFetch).toHaveBeenLastCalledWith("/api/publico/invitaciones/token-unico/aceptar", {
      method: "POST",
      body: JSON.stringify({ password: "clave-segura-123" }),
    });
  });

  it("no acepta contraseñas que no coinciden", async () => {
    apiFetch.mockResolvedValueOnce({
      nombre: "Persona Invitada",
      correo: "persona@example.com",
      rol: "EVALUADOR",
      expira: "2030-01-01T12:00:00Z",
    });
    const user = userEvent.setup();

    renderInvitacion();

    await screen.findByText("persona@example.com");
    await user.type(screen.getByLabelText("Crea una contraseña"), "clave-segura-123");
    await user.type(screen.getByLabelText("Confirma la contraseña"), "clave-distinta-123");
    await user.click(screen.getByRole("button", { name: "Configurar contraseña" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.");
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
