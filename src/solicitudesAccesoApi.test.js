import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearSolicitudAccesoApi, consultarSolicitudAccesoApi } from './solicitudesAccesoApi';

const datos = { nombre: 'Persona', apellido: 'Prueba', rut: '12345678-5', telefono: '912345678', correo: 'prueba@example.com', usuario: 'prueba', motivo: 'Evaluación' };
const cv = new File(['CV ficticio'], 'cv.pdf', { type: 'application/pdf' });
afterEach(() => vi.unstubAllGlobals());

describe('API pública de acceso', () => {
  it('envía los datos y CV como multipart', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ codigo: 'ABC' }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await crearSolicitudAccesoApi(datos, cv)).toEqual({ codigo: 'ABC' });
    const [url, config] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/publico\/solicitudes-acceso$/);
    expect(config.method).toBe('POST');
    expect(JSON.parse(config.body.get('datos'))).toMatchObject({ correo: datos.correo, usuarioSolicitado: datos.usuario });
    expect(config.body.get('cv').name).toBe('cv.pdf');
  });
  it('consulta por correo y código', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ estado: 'PENDIENTE' }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await consultarSolicitudAccesoApi(datos.correo, 'ABC')).toEqual({ estado: 'PENDIENTE' });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/consultar$/), expect.objectContaining({ method: 'POST', body: JSON.stringify({ correo: datos.correo, codigoSeguimiento: 'ABC' }) }));
  });
  it.each([['detalle', { detail: 'detalle' }], ['mensaje', { message: 'mensaje' }], ['Error HTTP 400', {}]])('propaga error %s', async (mensaje, body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => body }));
    await expect(crearSolicitudAccesoApi(datos, cv)).rejects.toThrow(mensaje);
    await expect(consultarSolicitudAccesoApi(datos.correo, 'ABC')).rejects.toThrow(mensaje);
  });
  it('informa solicitud no encontrada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    await expect(consultarSolicitudAccesoApi(datos.correo, 'ABC')).rejects.toThrow('No encontramos una solicitud');
  });
  it('maneja desconexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(crearSolicitudAccesoApi(datos, cv)).rejects.toThrow('No se pudo conectar');
    await expect(consultarSolicitudAccesoApi(datos.correo, 'ABC')).rejects.toThrow('No se pudo conectar');
  });
  it('maneja respuestas de error sin JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('JSON'); } }));
    await expect(crearSolicitudAccesoApi(datos, cv)).rejects.toThrow('Error HTTP 500');
    await expect(consultarSolicitudAccesoApi(datos.correo, 'ABC')).rejects.toThrow('Error HTTP 500');
  });
});
