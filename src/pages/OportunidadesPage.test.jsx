import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import OportunidadesPage from "./OportunidadesPage";

describe("OportunidadesPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("carga una oferta por URL y envía el mensaje opcional con la postulación", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "oferta-1",
          categoria: "Operaciones",
          modalidad: "PRESENCIAL",
          titulo: "Analista",
          ubicacion: "Puerto Montt",
          descripcion: "Descripción de la oferta.",
          funcionesPrincipales: "Funciones",
          requisitos: "Requisitos",
          beneficios: "Beneficios",
          cupos: 1,
          fechaPublicacion: "2026-01-01",
          rangoSalarial: "A convenir",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ postulacionId: "postulacion-1" }),
      });

    render(
      <MemoryRouter initialEntries={["/empleos/oferta-1"]}>
        <OportunidadesPage ofertaId="oferta-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Analista" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Postular a esta oferta" }));
    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Ana Ejemplo" },
    });
    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Cuéntanos brevemente sobre ti/), {
      target: { value: "Me interesa la oportunidad." },
    });

    const form = screen.getByRole("button", { name: "Enviar postulación" }).closest("form");
    fireEvent.submit(form);

    expect(await screen.findByText(/Postulación enviada correctamente/)).toBeTruthy();
    const [, options] = fetch.mock.calls[1];
    expect(options.method).toBe("POST");
    expect(options.body.get("mensaje")).toBe("Me interesa la oportunidad.");
  });
});
