import { describe, expect, it } from "vitest";
import {
  calcularIndicadores,
  cambiarEstadoSolicitud,
  correoValido,
  existeCorreo,
  filtrarCandidatos,
  filtrarSolicitudes,
  validarCandidato,
  validarSolicitud,
} from "./logica";

const solicitudes = [
  { id: 1, candidato: "Daniela Ríos", cargo: "Analista de Datos", familiaCargo: "Datos y Tecnología", responsable: "Laura Pérez", estado: "Pendiente" },
  { id: 2, candidato: "Matías Fuentes", cargo: "Supervisor de Operaciones", familiaCargo: "Operaciones", responsable: "Carlos Díaz", estado: "En proceso" },
  { id: 3, candidato: "Camila Soto", cargo: "Psicóloga Organizacional", familiaCargo: "Personas", responsable: "Laura Pérez", estado: "Finalizada" },
];

const candidatos = [
  { id: 1, nombre: "Daniela Ríos", correo: "daniela.rios@example.test", cargo: "Analista de Datos", familiaCargo: "Datos y Tecnología", estado: "Pendiente" },
  { id: 2, nombre: "Nicolás Pérez", correo: "nicolas.perez@example.test", cargo: "Técnico de Mantención", familiaCargo: "Mantención", estado: "Sin solicitud" },
];

describe("filtrarSolicitudes", () => {
  it("sin búsqueda ni estado devuelve todas", () => {
    expect(filtrarSolicitudes(solicitudes, "", "")).toHaveLength(3);
  });
  it("busca por nombre sin importar mayúsculas", () => {
    const resultado = filtrarSolicitudes(solicitudes, "DANIELA", "");
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(1);
  });
  it("filtra por estado", () => {
    expect(filtrarSolicitudes(solicitudes, "", "En proceso").map((s) => s.id)).toEqual([2]);
  });
  it("combina búsqueda y estado", () => {
    expect(filtrarSolicitudes(solicitudes, "laura", "Finalizada").map((s) => s.id)).toEqual([3]);
  });
  it("devuelve lista vacía si nada coincide", () => {
    expect(filtrarSolicitudes(solicitudes, "zzz", "")).toEqual([]);
  });
});

describe("filtrarCandidatos", () => {
  it("filtra por correo", () => {
    expect(filtrarCandidatos(candidatos, "nicolas.perez", "")).toHaveLength(1);
  });
  it("filtra por el estado 'Sin solicitud'", () => {
    expect(filtrarCandidatos(candidatos, "", "Sin solicitud").map((c) => c.id)).toEqual([2]);
  });
});

describe("validarCandidato", () => {
  const valido = { nombre: "Ana", correo: "ana@example.test", cargo: "Analista", familiaCargo: "Datos" };
  it("acepta un formulario completo", () => {
    expect(validarCandidato(valido)).toBe("");
  });
  it("rechaza campos vacíos", () => {
    expect(validarCandidato({ ...valido, nombre: "   " })).toBe("Completa todos los campos.");
  });
  it("rechaza un correo inválido", () => {
    expect(validarCandidato({ ...valido, correo: "ana-at-example" })).toBe("Ingresa un correo válido.");
  });
});

describe("correoValido y existeCorreo", () => {
  it("reconoce correos válidos e inválidos", () => {
    expect(correoValido("a@b.cl")).toBe(true);
    expect(correoValido("a@b")).toBe(false);
  });
  it("detecta un correo repetido", () => {
    expect(existeCorreo(candidatos, "  DANIELA.RIOS@example.test ")).toBe(true);
    expect(existeCorreo(candidatos, "otro@example.test")).toBe(false);
  });
});

describe("validarSolicitud", () => {
  const valida = { candidatoId: "1", cargo: "Analista", familiaCargo: "Datos", responsable: "Laura" };
  it("acepta una solicitud completa", () => {
    expect(validarSolicitud(valida)).toBe("");
  });
  it("exige elegir un candidato", () => {
    expect(validarSolicitud({ ...valida, candidatoId: "" })).toMatch(/Completa todos/);
  });
  it("exige un responsable de al menos 3 caracteres", () => {
    expect(validarSolicitud({ ...valida, responsable: "Al" })).toMatch(/al menos 3/);
  });
});

describe("cambiarEstadoSolicitud", () => {
  it("cambia solo la solicitud indicada", () => {
    const resultado = cambiarEstadoSolicitud(solicitudes, 1, "Finalizada");
    expect(resultado[0].estado).toBe("Finalizada");
    expect(resultado[1].estado).toBe("En proceso");
  });
  it("no modifica la lista original", () => {
    cambiarEstadoSolicitud(solicitudes, 1, "Finalizada");
    expect(solicitudes[0].estado).toBe("Pendiente");
  });
});

describe("calcularIndicadores", () => {
  it("cuenta candidatos y solicitudes por estado", () => {
    const valores = Object.fromEntries(
      calcularIndicadores(candidatos, solicitudes).map((i) => [i.id, i.valor]),
    );
    expect(valores).toEqual({ candidatos: 2, pendientes: 1, "en-proceso": 1, finalizadas: 1 });
  });
  it("devuelve ceros si no hay datos", () => {
    expect(calcularIndicadores([], []).map((i) => i.valor)).toEqual([0, 0, 0, 0]);
  });
});