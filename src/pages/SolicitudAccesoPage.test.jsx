import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SolicitudAccesoPage from './SolicitudAccesoPage';
import { crearSolicitudAccesoApi, consultarSolicitudAccesoApi } from '../solicitudesAccesoApi';
vi.mock('../solicitudesAccesoApi',()=>({crearSolicitudAccesoApi:vi.fn(),consultarSolicitudAccesoApi:vi.fn()}));
const abrir=(ruta='/solicitud')=>render(<MemoryRouter initialEntries={[ruta]}><SolicitudAccesoPage/></MemoryRouter>);
const change=(label,value)=>fireEvent.change(screen.getByLabelText(label),{target:{value}});
const submit=name=>fireEvent.submit(screen.getByRole('button',{name}).closest('form'));
function llenar(){ for(const [label,value] of Object.entries({'Nombre':'Ana','Apellido':'Ficticia','RUT':'123456785','Teléfono':'912345678','Correo electrónico':'ana@example.com','Usuario solicitado':'ana','Motivo de la solicitud':'Prueba'})) change(label,value); }
function cv(nombre='cv.pdf',tipo='application/pdf',bytes=1){fireEvent.change(screen.getByLabelText(/Currículum vitae/),{target:{files:[new File([new Uint8Array(bytes)],nombre,{type:tipo})]}});}
beforeEach(()=>vi.resetAllMocks());
describe('Solicitud pública de acceso',()=>{
 it('exige campos y CV',()=>{abrir();submit('Enviar solicitud');expect(screen.getByRole('alert')).toHaveTextContent('Completa todos');llenar();submit('Enviar solicitud');expect(screen.getByRole('alert')).toHaveTextContent('Debes adjuntar');});
 it.each([['cv.txt','text/plain',1,/archivo PDF/],['cv.pdf','application/pdf',10485761,/10 MB/]])('valida archivo %s %s %i', (nombre,tipo,bytes,mensaje)=>{abrir();llenar();cv(nombre,tipo,bytes);submit('Enviar solicitud');expect(screen.getByRole('alert')).toHaveTextContent(mensaje);});
 it.each([['RUT','123456784',/RUT ingresado/],['Teléfono','12',/teléfono válido/],['Correo electrónico','mal',/correo electrónico válido/],['Usuario solicitado','ana prueba',/no debe contener espacios/]])('valida %s',(label,value,mensaje)=>{abrir();llenar();cv();change(label,value);submit('Enviar solicitud');expect(screen.getByRole('alert')).toHaveTextContent(mensaje);expect(crearSolicitudAccesoApi).not.toHaveBeenCalled();});
 it('registra y consulta código',async()=>{crearSolicitudAccesoApi.mockResolvedValue({codigoSeguimiento:'ABC123'});consultarSolicitudAccesoApi.mockResolvedValue({estado:'ACEPTADA',fechaCreacion:'2026-01-01',comentarioAdministrador:'Aprobada'});abrir();llenar();cv();submit('Enviar solicitud');expect(await screen.findByText('Solicitud registrada correctamente.')).toBeInTheDocument();expect(screen.getByLabelText('Código de seguimiento')).toHaveValue('ABC123');submit('Consultar estado');expect(await screen.findByText('Aceptada')).toBeInTheDocument();expect(consultarSolicitudAccesoApi).toHaveBeenCalledWith('ana@example.com','ABC123');});
 it('informa respuesta sin código',async()=>{crearSolicitudAccesoApi.mockResolvedValue({});abrir();llenar();cv();submit('Enviar solicitud');expect(await screen.findByRole('alert')).toHaveTextContent('no devolvió un código');});
 it('valida consulta y muestra error del servidor',async()=>{abrir('/solicitud?tab=estado');submit('Consultar estado');expect(screen.getByRole('alert')).toHaveTextContent('correo válido');change('Correo electrónico','ana@example.com');submit('Consultar estado');expect(screen.getByRole('alert')).toHaveTextContent('código de seguimiento');change('Código de seguimiento','abc');consultarSolicitudAccesoApi.mockRejectedValue(new Error('No encontrada'));submit('Consultar estado');expect(await screen.findByRole('alert')).toHaveTextContent('No encontrada');});
});
