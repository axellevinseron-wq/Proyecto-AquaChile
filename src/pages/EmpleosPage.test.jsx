import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { apiFetch } from '../apiClient';
import EmpleosPage from './EmpleosPage';

vi.mock('../apiClient', () => ({
  apiFetch: vi.fn(),
}));

const oferta = {
  id: 1,
  titulo: 'Analista de prueba',
  categoria: 'Personas',
  ubicacion: 'Puerto Montt',
  modalidad: 'Presencial',
  descripcion: 'Descripción ficticia',
  requisitos: 'Experiencia',
};

function abrir(ruta = '/empleos') {
  return render(
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/empleos" element={<EmpleosPage />} />
          <Route path="/empleos/:ofertaId" element={<EmpleosPage />} />
        </Routes>
      </MemoryRouter>
  );
}

function completar() {
  fireEvent.change(screen.getByLabelText('Nombre completo'), {
    target: { value: 'Persona Prueba' },
  });

  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'prueba@example.com' },
  });

  fireEvent.change(screen.getByLabelText('Teléfono'), {
    target: { value: '912345678' },
  });

  fireEvent.change(screen.getByLabelText(/RUT/), {
    target: { value: '12345678-5' },
  });
}

function adjuntar(archivo) {
  fireEvent.change(screen.getByLabelText(/Currículum vitae/), {
    target: { files: [archivo] },
  });
}

function enviarPostulacion() {
  const boton = screen.getByRole('button', {
    name: 'Enviar postulación',
  });

  fireEvent.submit(boton.closest('form'));
}

const pdf = () =>
    new File(['CV ficticio'], 'cv.pdf', {
      type: 'application/pdf',
    });

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Portal de empleos', () => {
  it('lista y filtra ofertas por ubicación o cargo', async () => {
    apiFetch.mockResolvedValue([
      oferta,
      {
        ...oferta,
        id: 2,
        titulo: 'Operario',
        categoria: 'Operaciones',
        ubicacion: 'Chiloé',
      },
      {
        ...oferta,
        id: 3,
        titulo: 'Técnico',
        categoria: 'Mantención',
      },
      {
        id: 4,
        titulo: 'Otro',
      },
    ]);

    abrir();

    expect(
        await screen.findByText('4 ofertas')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Chiloé' },
    });

    expect(
        screen.getByText('Operario')
    ).toBeInTheDocument();

    expect(
        screen.queryByText(oferta.titulo)
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'inexistente' },
    });

    expect(
        screen.getByText('No encontramos ofertas')
    ).toBeInTheDocument();
  });

  it('muestra error de carga', async () => {
    apiFetch.mockRejectedValue(
        new Error('Servidor no disponible')
    );

    abrir();

    expect(
        await screen.findByRole('alert')
    ).toHaveTextContent('Servidor no disponible');
  });

  it('envía postulación con CV y limpia formulario', async () => {
    apiFetch
        .mockResolvedValueOnce(oferta)
        .mockResolvedValueOnce({ id: 9 });

    abrir('/empleos/1');

    expect(
        await screen.findByRole('heading', {
          name: oferta.titulo,
        })
    ).toBeInTheDocument();

    completar();
    adjuntar(pdf());
    enviarPostulacion();

    expect(
        await screen.findByText(/Recibimos tu postulación/)
    ).toBeInTheDocument();

    expect(apiFetch).toHaveBeenCalledTimes(2);

    const [ruta, config] = apiFetch.mock.calls[1];

    expect(ruta).toBe('/api/publico/postulaciones');
    expect(config.body.get('cv').name).toBe('cv.pdf');
    expect(config.body.get('ofertaId')).toBe('1');

    expect(
        screen.getByLabelText('Nombre completo')
    ).toHaveValue('');
  });

  it.each([
    ['cv.txt', 'text/plain', 1, /formato PDF/],
    ['cv.pdf', 'text/plain', 1, /formato PDF/],
    ['cv.pdf', 'application/pdf', 5000001, /5 MB/],
  ])(
      'rechaza archivo %s (%s, %i bytes)',
      async (nombre, tipo, bytes, mensaje) => {
        apiFetch.mockResolvedValue(oferta);

        abrir('/empleos/1');

        await screen.findByRole('heading', {
          name: oferta.titulo,
        });

        adjuntar(
            new File([new Uint8Array(bytes)], nombre, {
              type: tipo,
            })
        );

        expect(
            screen.getByRole('alert')
        ).toHaveTextContent(mensaje);

        expect(apiFetch).toHaveBeenCalledTimes(1);
      }
  );

  it('informa rechazo del servidor al postular', async () => {
    apiFetch
        .mockResolvedValueOnce(oferta)
        .mockRejectedValueOnce(
            new Error('Postulación duplicada')
        );

    abrir('/empleos/1');

    await screen.findByRole('heading', {
      name: oferta.titulo,
    });

    completar();
    adjuntar(pdf());
    enviarPostulacion();

    expect(
        await screen.findByRole('alert')
    ).toHaveTextContent('Postulación duplicada');

    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});