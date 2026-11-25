import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { apiFetch, leerSesionApi } from '../apiClient';
import EvaluacionCvPage from './EvaluacionCvPage';

vi.mock('../apiClient', () => ({ apiFetch: vi.fn(), leerSesionApi: vi.fn() }));
const postulaciones = [{ id: 1, ofertaId: 10, postulanteId: 20, estado: 'PENDIENTE' }, { id: 2, ofertaId: 99, postulanteId: 99 }];
const ofertas = [{ id: 10, titulo: 'Analista ficticio' }];
const postulantes = [{ id: 20, nombre: 'Persona ficticia' }];
const boton = nombre => screen.getByRole('button', { name: nombre });
const seleccionar = () => screen.getByLabelText('Postulación');
function datos(p = postulaciones) {
  apiFetch.mockResolvedValueOnce(p).mockResolvedValueOnce(ofertas).mockResolvedValueOnce(postulantes);
}
async function abrir(p = postulaciones) {
  datos(p);
  render(<EvaluacionCvPage />);
  await screen.findByLabelText('Postulación');
}
beforeEach(() => vi.resetAllMocks());
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Evaluación de CV con IA', () => {
  it('carga datos y selecciona la primera postulación', async () => {
    await abrir();
    expect(seleccionar()).toHaveValue('1');
    expect(apiFetch).toHaveBeenCalledWith('/api/postulaciones');
    expect(apiFetch).toHaveBeenCalledWith('/api/ofertas');
    expect(apiFetch).toHaveBeenCalledWith('/api/postulantes');
    expect(screen.getByRole('option', { name: /Persona ficticia.*Analista ficticio/ })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Revisión humana obligatoria');
  });
  it('deshabilita acciones sin postulaciones', async () => {
    await abrir([]);
    expect(seleccionar()).toBeDisabled();
    expect(boton('Analizar CV con IA')).toBeDisabled();
    expect(boton('Descargar CV original')).toBeDisabled();
    expect(boton('Comprobar similitud con otros CV')).toBeDisabled();
  });
  it('informa error inicial', async () => {
    apiFetch.mockRejectedValue(new Error('Sin conexión'));
    render(<EvaluacionCvPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  });
  it('rechaza formato inesperado', async () => {
    apiFetch.mockResolvedValue({});
    render(<EvaluacionCvPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('formato de datos inesperado');
  });
  it('actualiza la lista conservando la selección o eligiendo otra', async () => {
    await abrir();
    fireEvent.change(seleccionar(), { target: { value: '2' } });
    datos();
    fireEvent.click(boton('Actualizar lista'));
    await waitFor(() => expect(seleccionar()).toHaveValue('2'));
    datos([postulaciones[0]]);
    fireEvent.click(boton('Actualizar lista'));
    await waitFor(() => expect(seleccionar()).toHaveValue('1'));
  });
  it('informa error al actualizar', async () => {
    await abrir();
    apiFetch.mockRejectedValue(new Error('Error de actualización'));
    fireEvent.click(boton('Actualizar lista'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de actualización');
  });
  it('formatea el informe y lo limpia al cambiar de candidato', async () => {
    await abrir();
    apiFetch.mockResolvedValueOnce({ resultado: '# Evaluación\n\nTexto **importante**\nSegunda línea\n- Fortaleza\n- Experiencia\n1. Revisar\n2. Confirmar' });
    fireEvent.click(boton('Analizar CV con IA'));
    expect(await screen.findByRole('heading', { name: 'Evaluación' })).toBeInTheDocument();
    expect(screen.getByText('importante').tagName).toBe('STRONG');
    expect(screen.getByText('Fortaleza').closest('ul')).not.toBeNull();
    expect(screen.getByText('Revisar').closest('ol')).not.toBeNull();
    expect(screen.getByText('Revisión humana requerida')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/api/ia/postulaciones/1/analizar-cv', { method: 'POST' });
    fireEvent.change(seleccionar(), { target: { value: '2' } });
    expect(screen.queryByText('Revisión humana requerida')).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Postulante sin nombre.*Oferta sin título/ })).toBeInTheDocument();
  });
  it.each([{ analisis: 'Informe ficticio' }, { resumen: 'Informe ficticio' }, ['Informe ficticio', null], { detalle: 'Informe ficticio', modelo: 'oculto', puntuacion: 7 }])('presenta distintos formatos de informe %#', async respuesta => {
    await abrir();
    apiFetch.mockResolvedValueOnce(respuesta);
    fireEvent.click(boton('Analizar CV con IA'));
    expect(await screen.findByText(/Informe ficticio/)).toBeInTheDocument();
    expect(screen.queryByText('oculto')).not.toBeInTheDocument();
  });
  it('informa error de análisis', async () => {
    await abrir();
    apiFetch.mockRejectedValueOnce(new Error('IA no disponible'));
    fireEvent.click(boton('Analizar CV con IA'));
    expect(await screen.findByRole('alert')).toHaveTextContent('IA no disponible');
    expect(boton('Analizar CV con IA')).toBeEnabled();
  });
  it('muestra coincidencias y las limpia al cambiar selección', async () => {
    await abrir();
    apiFetch.mockResolvedValueOnce({ estado: 'COMPLETO', comparados: 2, omitidos: 0, coincidencias: [{ tipo: 'ARCHIVO_IDENTICO', similitud: 100, postulacionId: 2 }, { tipo: 'TEXTO', similitud: 90, postulacionId: 3 }], advertencia: 'Verificar documentos' });
    fireEvent.click(boton('Comprobar similitud con otros CV'));
    expect(await screen.findByText('Archivo PDF idéntico')).toBeInTheDocument();
    expect(screen.getByText('Posible similitud de texto')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/api/ia/postulaciones/1/similitud-cv');
    fireEvent.change(seleccionar(), { target: { value: '2' } });
    expect(screen.queryByText('Archivo PDF idéntico')).not.toBeInTheDocument();
  });
  it('muestra comparación parcial sin coincidencias', async () => {
    await abrir();
    apiFetch.mockResolvedValueOnce({ estado: 'PARCIAL', comparados: 1, omitidos: 1, coincidencias: [] });
    fireEvent.click(boton('Comprobar similitud con otros CV'));
    expect(await screen.findByText(/No se encontraron coincidencias/)).toBeInTheDocument();
    expect(screen.getByText(/Comparación parcial/)).toBeInTheDocument();
  });
  it('informa error de comparación', async () => {
    await abrir();
    apiFetch.mockRejectedValueOnce(new Error('Comparación fallida'));
    fireEvent.click(boton('Comprobar similitud con otros CV'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Comparación fallida');
  });
  it('impide descargar sin sesión', async () => {
    await abrir();
    leerSesionApi.mockReturnValue(null);
    fireEvent.click(boton('Descargar CV original'));
    expect(await screen.findByRole('alert')).toHaveTextContent('La sesión ha expirado');
  });
  it.each([[404, 'no tiene un CV disponible'], [401, 'No tienes autorización'], [403, 'No tienes autorización'], [500, 'HTTP 500']])('maneja error HTTP %i al descargar', async (status, mensaje) => {
    await abrir();
    leerSesionApi.mockReturnValue({ token: 'token-ficticio' });
    const peticion = vi.fn().mockResolvedValue({ ok: false, status });
    vi.stubGlobal('fetch', peticion);
    fireEvent.click(boton('Descargar CV original'));
    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
    expect(peticion).toHaveBeenCalledWith(expect.stringContaining('/api/postulaciones/1/cv'), { headers: { Authorization: 'Bearer token-ficticio' } });
  });
  it('descarga el PDF original mediante un enlace temporal', async () => {
    await abrir();
    leerSesionApi.mockReturnValue({ token: 'token-ficticio' });
    const archivo = new Blob(['CV ficticio'], { type: 'application/pdf' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => archivo }));
    const crear = vi.fn().mockReturnValue('blob:cv-ficticio');
    const revocar = vi.fn();
    const URLOriginal = URL;
    class URLPrueba extends URLOriginal {
      static createObjectURL = crear;
      static revokeObjectURL = revocar;
    }
    vi.stubGlobal('URL', URLPrueba);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.download).toBe('CV-1.pdf');
    });
    fireEvent.click(boton('Descargar CV original'));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(crear).toHaveBeenCalledWith(archivo);
    expect(boton('Descargar CV original')).toBeEnabled();
    await waitFor(() => expect(revocar).toHaveBeenCalledWith('blob:cv-ficticio'), { timeout: 2000 });
  });
});
