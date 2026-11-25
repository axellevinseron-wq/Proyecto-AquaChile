import { afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OportunidadesPage from './OportunidadesPage';
afterEach(()=>vi.unstubAllGlobals());
const oferta={id:1,titulo:'Analista ficticio',ubicacion:'Puerto Montt',descripcion:'Descripción'};
function abrir(){const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>[oferta]});vi.stubGlobal('fetch',fetchMock);render(<MemoryRouter><OportunidadesPage/></MemoryRouter>);return fetchMock;}
it('filtra ofertas y permite cancelar postulación',async()=>{abrir();await screen.findByText(oferta.titulo);fireEvent.change(screen.getByLabelText('Buscar por cargo o ubicación'),{target:{value:'inexistente'}});expect(screen.getByText('No hay ofertas disponibles.')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Buscar por cargo o ubicación'),{target:{value:'Puerto'}});fireEvent.click(screen.getByRole('button',{name:'Ver detalle y postular'}));expect(screen.getByRole('heading',{name:'Postular a Analista ficticio'})).toBeInTheDocument();fireEvent.submit(screen.getByRole('button',{name:'Enviar postulación'}).closest('form'));expect(screen.getByRole('status')).toHaveTextContent('Adjunta tu CV');fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(screen.queryByRole('heading',{name:'Postular a Analista ficticio'})).not.toBeInTheDocument();});
it('informa error de carga',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));render(<MemoryRouter><OportunidadesPage/></MemoryRouter>);expect(await screen.findByRole('status')).toHaveTextContent('No se pudieron cargar');});
