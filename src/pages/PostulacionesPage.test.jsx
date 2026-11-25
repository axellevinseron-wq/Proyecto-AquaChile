import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { apiFetch } from "../apiClient";
import PostulacionesPage from "./PostulacionesPage";

vi.mock("../apiClient", () => ({ apiFetch: vi.fn() }));

describe("PostulacionesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra la entrevista y sus enlaces a las cuentas con acceso", async () => {
    apiFetch.mockResolvedValueOnce([{
      id: "postulacion-1",
      nombre: "Candidata",
      correo: "candidata@example.com",
      telefono: "+56912345678",
      ofertaTitulo: "Analista",
      estado: "Entrevista",
      entrevista: {
        estado: "Agendada",
        inicio: "2030-04-02T18:00:00Z",
        zonaHoraria: "America/Santiago",
        duracionMinutos: 30,
        enlaceCalendar: "https://calendar.google.com/event",
        enlaceMeet: "https://meet.google.com/abc-defg-hij",
      },
    }]);

    render(
      <MemoryRouter>
        <PostulacionesPage sesion={{ rolApi: "EVALUADOR" }} />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Candidata")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver evento" }).getAttribute("href"))
      .toBe("https://calendar.google.com/event");
    expect(screen.getByRole("link", { name: "Entrar a Meet" }).getAttribute("href"))
      .toBe("https://meet.google.com/abc-defg-hij");
    expect(screen.queryByLabelText("Estado de Candidata")).toBeNull();
  });
});
